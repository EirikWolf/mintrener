#!/bin/bash
# MinTrener — parametersveip for entusiasme i Chatterbox-stemmene.
#
# Dagens defaults på kitor: temperature 0.8, exaggeration 1.3, cfg_weight 0.5.
# Hypotese: cfg_weight 0.5 låser prosodien til NST-referansens flate opplesning.
# Senket cfg (0.2–0.3) skal gi exaggeration rom til å virke.
#
#   scp C:/dev/mintrener/scripts/kitor-energy-sweep.sh eirik@kitor:/tmp/
#   ssh eirik@kitor "tr -d '\r' < /tmp/kitor-energy-sweep.sh > /tmp/sweep.sh && bash /tmp/sweep.sh"

set -euo pipefail

BASE="https://kitor.tail49f298.ts.net/chatterbox"
OUT="/srv/kitor/chatterbox-tts/outputs/audition-energi"
REPO="/srv/kitor/repo"

V_OSLO="mintrener-dia-oslo-42.wav"
V_BERGEN="mintrener-dia-bergen-31.wav"
V_HEDMARK="mintrener-dia-hedmark-42.wav"

# Kort jubel og lengre heiing — prosodi trenger litt lengde for å vise seg.
L1="Hurra! Du klarte det! Kjempebra jobba!"
L2="Femten sekunder igjen! Gi full gass — du klarer dette!"
L1_TAG="[laugh] Hurra! Du klarte det! Kjempebra jobba!"

# navn|referanse|exaggeration|cfg_weight|temperature|tekst
JOBS=(
  "01-baseline-e13-c05|$V_OSLO|1.3|0.5|0.8|$L1"
  "02-e13-c03|$V_OSLO|1.3|0.3|0.8|$L1"
  "03-e16-c03|$V_OSLO|1.6|0.3|0.8|$L1"
  "04-e20-c03|$V_OSLO|2.0|0.3|0.8|$L1"
  "05-e16-c02|$V_OSLO|1.6|0.2|0.8|$L1"
  "06-e08-c03|$V_OSLO|0.8|0.3|0.8|$L1"
  "07-e16-c03-temp10|$V_OSLO|1.6|0.3|1.0|$L1"
  "08-tag-laugh-e16-c03|$V_OSLO|1.6|0.3|0.8|$L1_TAG"
  "09-lang-baseline|$V_OSLO|1.3|0.5|0.8|$L2"
  "10-lang-e16-c03|$V_OSLO|1.6|0.3|0.8|$L2"
  "11-bergen-e16-c03|$V_BERGEN|1.6|0.3|0.8|$L1"
  "12-hedmark-e16-c03|$V_HEDMARK|1.6|0.3|0.8|$L1"
)

TOK=$(grep '^KITOR_TOKEN_MINTRENER=' "$REPO/.env" | cut -d= -f2-)
[ -n "$TOK" ] || { echo "FATALT: fant ikke KITOR_TOKEN_MINTRENER" >&2; exit 1; }

for V in "$V_OSLO" "$V_BERGEN" "$V_HEDMARK"; do
    [ -f "/srv/kitor/chatterbox-tts/reference_audio/$V" ] \
        || { echo "MANGLER referanse: $V" >&2; exit 1; }
done
echo "Referanser OK. ${#JOBS[@]} jobber."

echo
echo "=== 1. Tar image-lease ==="
LEASE=$(kitor-arbiter acquire image --requester mintrener \
    --label "energi-sveip" --duration-h 1 --max-wait-s 300) \
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
printf '  %-24s %5s %5s %5s\n' "navn" "exag" "cfg" "temp"
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
        printf '  %-24s %5s %5s %5s  ✅ %6s s\n' "$NAME" "$EXAG" "$CFG" "$TEMP" "$TIME"
        OK=$((OK + 1))
    else
        printf '  %-24s %5s %5s %5s  ❌ http=%s\n' "$NAME" "$EXAG" "$CFG" "$TEMP" "$CODE"
        head -c 200 "$OUT/$NAME.mp3" 2>/dev/null || true; echo
        rm -f "$OUT/$NAME.mp3"
        FAIL=$((FAIL + 1))
    fi
done

echo
echo "Generert: $OK, feilet: $FAIL"
echo
echo "  scp -r eirik@kitor:$OUT C:/dev/mintrener/audition/"
