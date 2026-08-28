#!/bin/bash
# MinTrener — dialekt-audition på Chatterbox-TTS (kitor)
#
# To tester i én kjøring:
#   A) Dialektrunde  — 11 dialektområder, samme bokmålssetning
#   B) Bergensk «all in» — samme taler på bokmål / moderat / full bergensk,
#      for å teste om dialekt-ortografi faktisk gir dialekt-uttale
#
#   scp C:/dev/mintrener/audition/dialekter/*.wav eirik@kitor:/srv/kitor/chatterbox-tts/reference_audio/
#   scp C:/dev/mintrener/scripts/kitor-dialect-audition.sh eirik@kitor:/tmp/
#   ssh eirik@kitor "tr -d '\r' < /tmp/kitor-dialect-audition.sh > /tmp/dia.sh && bash /tmp/dia.sh"

set -euo pipefail

BASE="https://kitor.tail49f298.ts.net/chatterbox"
OUT="/srv/kitor/chatterbox-tts/outputs/audition-dialekter"
REPO="/srv/kitor/repo"

# --- Testsetninger -----------------------------------------------------------
# Dialektrunden: samme setning som tidligere auditions, for sammenlignbarhet.
S_TOUR="Halvveis! Nå er det bare nedover. Kjempefin innsats — hold ryggen rett i bjørnegang og knebøy."

# Bergensk-testen: setning tettpakket med dialektmarkører (hvor/kor, en/ein,
# nå/no, er/e, ett/eitt, sekunder/sekund).
S_CTRL="Hvor lenge klarer du å stå som en statue? Nå er det bare ti sekunder igjen — ett minutt til, så er du i mål!"
S_MOD="Hvor lenge klarer du å stå som en statue? No e det bare ti sekunder igjen — ett minutt til, så e du i mål!"
S_FULL="Kor lenge klarer du å stå som ein statue? No e det bare ti sekund igjen — eitt minutt til, så e du i mål!"

# --- Jobbliste: utnavn|referansefil|tekst ------------------------------------
JOBS=(
  # A) Dialektrunde
  "a-oslo-42|mintrener-dia-oslo-42.wav|$S_TOUR"
  "a-hedmark-42|mintrener-dia-hedmark-42.wav|$S_TOUR"
  "a-ytreoslofjord-43|mintrener-dia-ytreoslofjord-43.wav|$S_TOUR"
  "a-sorlandet-33|mintrener-dia-sorlandet-33.wav|$S_TOUR"
  "a-sorvestlandet-29|mintrener-dia-sorvestlandet-29.wav|$S_TOUR"
  "a-sunnmore-25|mintrener-dia-sunnmore-25.wav|$S_TOUR"
  "a-bergen-31|mintrener-dia-bergen-31.wav|$S_TOUR"
  "a-voss-29|mintrener-dia-voss-29.wav|$S_TOUR"
  "a-trondelag-43|mintrener-dia-trondelag-43.wav|$S_TOUR"
  "a-nordland-38|mintrener-dia-nordland-38.wav|$S_TOUR"
  "a-troms-34|mintrener-dia-troms-34.wav|$S_TOUR"

  # B) Bergensk «all in» — samme stemme, tre tekstvarianter
  "b-bergen31-1-bokmaal|mintrener-dia-bergen-31.wav|$S_CTRL"
  "b-bergen31-2-moderat|mintrener-dia-bergen-31.wav|$S_MOD"
  "b-bergen31-3-full|mintrener-dia-bergen-31.wav|$S_FULL"
  "b-bergen62-3-full|mintrener-dia-bergen-62.wav|$S_FULL"
)

TOK=$(grep '^KITOR_TOKEN_MINTRENER=' "$REPO/.env" | cut -d= -f2-)
[ -n "$TOK" ] || { echo "FATALT: fant ikke KITOR_TOKEN_MINTRENER" >&2; exit 1; }

# Sjekk at alle referanser finnes før vi tar lease
MISSING=0
for J in "${JOBS[@]}"; do
    REF="${J#*|}"; REF="${REF%%|*}"
    if [ ! -f "/srv/kitor/chatterbox-tts/reference_audio/$REF" ]; then
        echo "MANGLER referanse: $REF" >&2
        MISSING=1
    fi
done
[ "$MISSING" -eq 0 ] || { echo "Last opp referansene først." >&2; exit 1; }
echo "Alle ${#JOBS[@]} jobber har gyldig referanse."

echo
echo "=== 1. Tar image-lease (vLLM stoppes av arbiter) ==="
LEASE=$(kitor-arbiter acquire image --requester mintrener \
    --label "dialekt-audition" --duration-h 1 --max-wait-s 300) \
    || { echo "FATALT: kunne ikke acquire lease" >&2; exit 1; }
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
echo "=== 3. Venter på tjenesten ==="
READY=0
for i in $(seq 1 60); do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
        -H "Authorization: Bearer $TOK" "$BASE/v1/audio/voices" 2>/dev/null || echo 000)
    [ "$CODE" = "200" ] && { echo "Klar etter ~$((i * 5)) s"; READY=1; break; }
    printf '.'
    sleep 5
done
echo
[ "$READY" = "1" ] || { echo "FATALT: tjenesten ble aldri klar ($CODE)" >&2; exit 1; }

mkdir -p "$OUT"
rm -f "$OUT"/*.mp3

echo
echo "=== 4. Genererer ${#JOBS[@]} klipp ==="
OK=0; FAIL=0
for J in "${JOBS[@]}"; do
    NAME="${J%%|*}"
    REST="${J#*|}"
    REF="${REST%%|*}"
    TEXT="${REST#*|}"

    PAYLOAD=$(SENT="$TEXT" REF="$REF" python3 -c '
import json, os
print(json.dumps({
    "text": os.environ["SENT"],
    "voice_mode": "clone",
    "reference_audio_filename": os.environ["REF"],
    "language": "no",
    "output_format": "mp3",
}))')

    RES=$(curl -s -m 240 -X POST "$BASE/tts" \
        -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
        -d "$PAYLOAD" -o "$OUT/$NAME.mp3" -w '%{http_code} %{time_total}') || RES="000 -"

    CODE=${RES%% *}; TIME=${RES##* }
    if [ "$CODE" = "200" ] && [ -s "$OUT/$NAME.mp3" ]; then
        printf '  %-24s ✅ %6s s  %4s KB\n' "$NAME" "$TIME" "$(( $(stat -c %s "$OUT/$NAME.mp3") / 1024 ))"
        OK=$((OK + 1))
    else
        printf '  %-24s ❌ http=%s\n' "$NAME" "$CODE"
        head -c 200 "$OUT/$NAME.mp3" 2>/dev/null || true; echo
        rm -f "$OUT/$NAME.mp3"
        FAIL=$((FAIL + 1))
    fi
done

echo
echo "=== Oppsummering ==="
echo "Generert: $OK, feilet: $FAIL"
echo
echo "  scp -r eirik@kitor:$OUT C:/dev/mintrener/audition/"
