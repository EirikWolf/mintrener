#!/bin/bash
# MinTrener — audition av voice-cloning fra norske NST-referanser (kitor)
#
# Forutsetter at referansene alt er lastet opp til
# /srv/kitor/chatterbox-tts/reference_audio/mintrener-kandidat*.wav
#
#   scp C:/dev/mintrener/audition/referanser/*.wav eirik@kitor:/srv/kitor/chatterbox-tts/reference_audio/
#   scp scripts/kitor-voice-audition-clone.sh eirik@kitor:/tmp/
#   ssh eirik@kitor "tr -d '\r' < /tmp/kitor-voice-audition-clone.sh > /tmp/clone.sh && bash /tmp/clone.sh"

set -euo pipefail

BASE="https://kitor.tail49f298.ts.net/chatterbox"
REFDIR="/srv/kitor/chatterbox-tts/reference_audio"
OUT="/srv/kitor/chatterbox-tts/outputs/audition-mintrener-clone"
REPO="/srv/kitor/repo"

# Samme setning som i predefined-auditionen, så resultatene er sammenlignbare.
SENTENCE="Halvveis! Nå er det bare nedover. Kjempefin innsats — hold ryggen rett i bjørnegang og knebøy."

mapfile -t REFS < <(cd "$REFDIR" && ls mintrener-kandidat*.wav 2>/dev/null)
if [ "${#REFS[@]}" -eq 0 ]; then
    echo "FATALT: fant ingen mintrener-kandidat*.wav i $REFDIR" >&2
    echo "Last opp referansene først (se toppen av dette skriptet)." >&2
    exit 1
fi
echo "Fant ${#REFS[@]} referanser:"
printf '  %s\n' "${REFS[@]}"

TOK=$(grep '^KITOR_TOKEN_MINTRENER=' "$REPO/.env" | cut -d= -f2-)
if [ -z "$TOK" ]; then
    echo "FATALT: fant ikke KITOR_TOKEN_MINTRENER i $REPO/.env" >&2
    exit 1
fi

echo
echo "=== 1. Tar image-lease (vLLM stoppes av arbiter) ==="
LEASE=$(kitor-arbiter acquire image \
    --requester mintrener \
    --label "chatterbox clone audition" \
    --duration-h 1 \
    --max-wait-s 300) || {
    echo "FATALT: kunne ikke acquire lease" >&2
    exit 1
}
echo "Lease: $LEASE"

cleanup() {
    echo
    echo "=== Opprydding ==="
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
    (cd "$REPO" && docker compose logs --tail 40 chatterbox-tts) >&2 || true
    exit 1
fi

mkdir -p "$OUT"
rm -f "$OUT"/*.mp3

echo
echo "=== 4. Genererer klonede klipp ==="
echo "Setning: $SENTENCE"
echo

OK=0
FAIL=0
for REF in "${REFS[@]}"; do
    NAME="${REF%.wav}"
    # NB: feltet heter reference_audio_filename (ikke audio_prompt_path, som
    # deploy-doccen oppgir), og skal være BART filnavn — serveren resolver det
    # selv inne i reference_audio/ via safe_resolve_within.
    PAYLOAD=$(SENT="$SENTENCE" REF="$REF" python3 -c '
import json, os
print(json.dumps({
    "text": os.environ["SENT"],
    "voice_mode": "clone",
    "reference_audio_filename": os.environ["REF"],
    "language": "no",
    "output_format": "mp3",
}))')

    RES=$(curl -s -m 240 -X POST "$BASE/tts" \
        -H "Authorization: Bearer $TOK" \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD" \
        -o "$OUT/$NAME.mp3" \
        -w '%{http_code} %{time_total}') || RES="000 -"

    CODE=${RES%% *}
    TIME=${RES##* }
    if [ "$CODE" = "200" ] && [ -s "$OUT/$NAME.mp3" ]; then
        SIZE=$(stat -c %s "$OUT/$NAME.mp3")
        printf '  %-32s ✅ %6s s  %5s KB\n' "$NAME" "$TIME" "$((SIZE / 1024))"
        OK=$((OK + 1))
    else
        printf '  %-32s ❌ http=%s\n' "$NAME" "$CODE"
        head -c 300 "$OUT/$NAME.mp3" 2>/dev/null || true
        echo
        rm -f "$OUT/$NAME.mp3"
        FAIL=$((FAIL + 1))
    fi
done

echo
echo "=== Oppsummering ==="
echo "Generert: $OK, feilet: $FAIL"
echo "Filer:    $OUT"
echo
echo "Hent dem ned med:"
echo "  scp -r eirik@kitor:$OUT C:/dev/mintrener/audition/"
