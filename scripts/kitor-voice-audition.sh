#!/bin/bash
# MinTrener — audition av kvinnestemmer på Chatterbox-TTS (kitor)
#
# Kjøres PÅ kitor. Tar image-lease (stopper vLLM), starter chatterbox-
# containeren, genererer én norsk testsetning per kvinnestemme, og rydder
# opp uansett hvordan skriptet avsluttes.
#
#   scp scripts/kitor-voice-audition.sh eirik@kitor:/tmp/
#   ssh eirik@kitor 'bash /tmp/kitor-voice-audition.sh'

set -euo pipefail

BASE="https://kitor.tail49f298.ts.net/chatterbox"
OUT="/srv/kitor/chatterbox-tts/outputs/audition-mintrener"
REPO="/srv/kitor/repo"

# Testsetning: dekker å, ø, y, kj-lyd og flere r-er — og bruker appens egne
# problemord ("bjørnegang", "knebøy") som var utgangspunktet for bestillingen.
SENTENCE="Halvveis! Nå er det bare nedover. Kjempefin innsats — hold ryggen rett i bjørnegang og knebøy."

VOICES=(Abigail Alice Cora Elena Emily Gianna Jade Layla Olivia)

TOK=$(grep '^KITOR_TOKEN_MINTRENER=' "$REPO/.env" | cut -d= -f2-)
if [ -z "$TOK" ]; then
    echo "FATALT: fant ikke KITOR_TOKEN_MINTRENER i $REPO/.env" >&2
    exit 1
fi

echo "=== 1. Tar image-lease (vLLM stoppes av arbiter) ==="
LEASE=$(kitor-arbiter acquire image \
    --requester mintrener \
    --label "chatterbox voice audition" \
    --duration-h 1 \
    --max-wait-s 300) || {
    echo "FATALT: kunne ikke acquire lease" >&2
    exit 1
}
echo "Lease: $LEASE"

cleanup() {
    echo
    echo "=== Opprydding ==="
    # Container ned FØR release — arbiter-release alene frigjør ikke
    # Chatterbox sine 3,7 GB idle-VRAM, og vLLM får da ikke tilbake sine 20 GB.
    (cd "$REPO" && docker compose --profile tts down chatterbox-tts) || true
    kitor-arbiter release "$LEASE" || true
    echo "Lease frigitt, container nede."
}
trap cleanup EXIT INT TERM

echo
echo "=== 2. Starter chatterbox-container ==="
(cd "$REPO" && docker compose --profile tts up -d chatterbox-tts)

echo
echo "=== 3. Venter på at tjenesten svarer (inntil 5 min) ==="
READY=0
for i in $(seq 1 60); do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
        -H "Authorization: Bearer $TOK" "$BASE/v1/audio/voices" 2>/dev/null || echo 000)
    if [ "$CODE" = "200" ]; then
        echo "Klar etter ~$((i * 5)) s"
        READY=1
        break
    fi
    printf '.'
    sleep 5
done
echo
if [ "$READY" != "1" ]; then
    echo "FATALT: tjenesten ble aldri klar (siste kode: $CODE)" >&2
    echo "--- containerlogg ---" >&2
    (cd "$REPO" && docker compose logs --tail 40 chatterbox-tts) >&2 || true
    exit 1
fi

mkdir -p "$OUT"
rm -f "$OUT"/*.mp3

echo
echo "=== 4. Genererer audition-klipp ==="
echo "Setning: $SENTENCE"
echo

OK=0
FAIL=0
for V in "${VOICES[@]}"; do
    PAYLOAD=$(SENT="$SENTENCE" VOICE="$V" python3 -c '
import json, os
print(json.dumps({
    "text": os.environ["SENT"],
    "voice_mode": "predefined",
    "predefined_voice_id": os.environ["VOICE"] + ".wav",
    "language": "no",
    "output_format": "mp3",
}))')

    RES=$(curl -s -m 180 -X POST "$BASE/tts" \
        -H "Authorization: Bearer $TOK" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD" \
        -o "$OUT/$V.mp3" \
        -w '%{http_code} %{time_total}') || RES="000 -"

    CODE=${RES%% *}
    TIME=${RES##* }
    if [ "$CODE" = "200" ] && [ -s "$OUT/$V.mp3" ]; then
        SIZE=$(stat -c %s "$OUT/$V.mp3")
        printf '  %-10s ✅ %6s s  %5s KB\n' "$V" "$TIME" "$((SIZE / 1024))"
        OK=$((OK + 1))
    else
        printf '  %-10s ❌ http=%s\n' "$V" "$CODE"
        head -c 200 "$OUT/$V.mp3" 2>/dev/null || true
        echo
        rm -f "$OUT/$V.mp3"
        FAIL=$((FAIL + 1))
    fi
done

echo
echo "=== 5. Verifiserer filformat (mp3 var utestet før nå) ==="
file "$OUT"/*.mp3 2>/dev/null || echo "ingen filer å verifisere"

echo
echo "=== Oppsummering ==="
echo "Generert: $OK, feilet: $FAIL"
echo "Filer:    $OUT"
echo
echo "Hent dem ned med:"
echo "  scp -r eirik@kitor:$OUT C:/dev/mintrener/audition/"
