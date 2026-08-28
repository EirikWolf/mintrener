#!/bin/bash
# MinTrener — NB Samtale (spontan tale) vs NST (opplesning) som cloning-kilde.
#
# Spørsmål: gir en referanse med naturlig, engasjert tale mer entusiasme enn
# en referanse der noen leser avisstoff i studio?
#
# Samme linje som i energi-sveipet, så resultatene er kryss-sammenlignbare.
#
#   scp C:/dev/mintrener/audition/samtale-ref/*.wav eirik@kitor:/srv/kitor/chatterbox-tts/reference_audio/
#   scp C:/dev/mintrener/scripts/kitor-samtale-audition.sh eirik@kitor:/tmp/
#   ssh eirik@kitor "tr -d '\r' < /tmp/kitor-samtale-audition.sh > /tmp/sam.sh && bash /tmp/sam.sh"

set -euo pipefail

BASE="https://kitor.tail49f298.ts.net/chatterbox"
OUT="/srv/kitor/chatterbox-tts/outputs/audition-samtale"
REPO="/srv/kitor/repo"

L1="Hurra! Du klarte det! Kjempebra jobba!"

# navn|referanse|exaggeration|cfg_weight|temperature|tekst
JOBS=(
  # Lav cfg — den innstillingen som skal slippe prosodien løs
  "lo-nord-podcast|mintrener-sam-nord-podcast.wav|1.6|0.3|0.8|$L1"
  "lo-nord2-podcast|mintrener-sam-nord2-podcast.wav|1.6|0.3|0.8|$L1"
  "lo-trondersk-podcast|mintrener-sam-trondersk-podcast.wav|1.6|0.3|0.8|$L1"
  "lo-ost-podcast|mintrener-sam-ost-podcast.wav|1.6|0.3|0.8|$L1"
  "lo-ost-live|mintrener-sam-ost-live.wav|1.6|0.3|0.8|$L1"
  "lo-KONTROLL-nst-oslo|mintrener-dia-oslo-42.wav|1.6|0.3|0.8|$L1"

  # Dagens defaults, for å se effekten av kilden alene
  "hi-nord-podcast|mintrener-sam-nord-podcast.wav|1.3|0.5|0.8|$L1"
  "hi-nord2-podcast|mintrener-sam-nord2-podcast.wav|1.3|0.5|0.8|$L1"
  "hi-trondersk-podcast|mintrener-sam-trondersk-podcast.wav|1.3|0.5|0.8|$L1"
  "hi-ost-podcast|mintrener-sam-ost-podcast.wav|1.3|0.5|0.8|$L1"
  "hi-ost-live|mintrener-sam-ost-live.wav|1.3|0.5|0.8|$L1"
  "hi-KONTROLL-nst-oslo|mintrener-dia-oslo-42.wav|1.3|0.5|0.8|$L1"
)

TOK=$(grep '^KITOR_TOKEN_MINTRENER=' "$REPO/.env" | cut -d= -f2-)
[ -n "$TOK" ] || { echo "FATALT: fant ikke KITOR_TOKEN_MINTRENER" >&2; exit 1; }

MISSING=0
for J in "${JOBS[@]}"; do
    REF="${J#*|}"; REF="${REF%%|*}"
    [ -f "/srv/kitor/chatterbox-tts/reference_audio/$REF" ] || { echo "MANGLER: $REF" >&2; MISSING=1; }
done
[ "$MISSING" -eq 0 ] || { echo "Last opp referansene først." >&2; exit 1; }
echo "Referanser OK. ${#JOBS[@]} jobber."

echo
echo "=== 1. Tar image-lease ==="
LEASE=$(kitor-arbiter acquire image --requester mintrener \
    --label "nb-samtale audition" --duration-h 1 --max-wait-s 300) \
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
echo "=== 2. Starter container ==="
(cd "$REPO" && docker compose --profile tts up -d chatterbox-tts)

echo
echo "=== 3. Venter på tjenesten ==="
READY=0
for i in $(seq 1 60); do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 \
        -H "Authorization: Bearer $TOK" "$BASE/v1/audio/voices" 2>/dev/null || echo 000)
    [ "$CODE" = "200" ] && { echo "Klar etter ~$((i * 5)) s"; READY=1; break; }
    printf '.'; sleep 5
done
echo
[ "$READY" = "1" ] || { echo "FATALT: tjenesten ble aldri klar ($CODE)" >&2; exit 1; }

mkdir -p "$OUT"; rm -f "$OUT"/*.mp3

echo
echo "=== 4. Genererer ==="
OK=0; FAIL=0
for J in "${JOBS[@]}"; do
    IFS='|' read -r NAME REF EXAG CFG TEMP TEXT <<< "$J"

    PAYLOAD=$(SENT="$TEXT" REF="$REF" EXAG="$EXAG" CFG="$CFG" TEMP="$TEMP" python3 -c '
import json, os
print(json.dumps({
    "text": os.environ["SENT"],
    "voice_mode": "clone",
    "reference_audio_filename": os.environ["REF"],
    "language": "no",
    "output_format": "mp3",
    "exaggeration": float(os.environ["EXAG"]),
    "cfg_weight": float(os.environ["CFG"]),
    "temperature": float(os.environ["TEMP"]),
}))')

    RES=$(curl -s -m 240 -X POST "$BASE/tts" \
        -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
        -d "$PAYLOAD" -o "$OUT/$NAME.mp3" -w '%{http_code} %{time_total}') || RES="000 -"

    CODE=${RES%% *}; TIME=${RES##* }
    if [ "$CODE" = "200" ] && [ -s "$OUT/$NAME.mp3" ]; then
        printf '  %-26s ✅ %6s s\n' "$NAME" "$TIME"
        OK=$((OK + 1))
    else
        printf '  %-26s ❌ http=%s\n' "$NAME" "$CODE"
        head -c 200 "$OUT/$NAME.mp3" 2>/dev/null || true; echo
        rm -f "$OUT/$NAME.mp3"; FAIL=$((FAIL + 1))
    fi
done

echo
echo "Generert: $OK, feilet: $FAIL"
echo
echo "  scp -r eirik@kitor:$OUT C:/dev/mintrener/audition/"
