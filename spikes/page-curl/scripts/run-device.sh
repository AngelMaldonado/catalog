#!/usr/bin/env bash
# Runs one measured session on the phone: fresh load, 6 forward + 4 back turns, Chrome memory.
# usage: scripts/run-device.sh <variant> <paint> <portrait|spread> [extra-query]
# The phone reaches the Mac through `adb reverse tcp:5173 tcp:5173`.
set -euo pipefail
D=${ANDROID_SERIAL:-R8YW90DNJWE}
v=$1 paint=$2 mode=$3 extra=${4:-}
run="$v-$paint-$mode${extra:+-$extra}"
url="http://localhost:5173/?v=$v&paint=$paint&mode=$mode&run=$run${extra:+&$extra}"

# geometry in physical px; drags stay ≥150 px from the edges (Android back gesture zones)
if [ "$mode" = spread ]; then
  # landscape: the book is small and centred; start on the right page, end on the left one
  y=420 x1=1060 x2=540
else
  y=800 x1=570 x2=150
fi

adb -s "$D" shell "am start -a android.intent.action.VIEW -d '$url' -p com.android.chrome --es com.android.browser.application_id spike" >/dev/null
/bin/sleep 5
for _ in 1 2 3 4 5 6; do adb -s "$D" shell input swipe $x1 $y $x2 $y 450; /bin/sleep 1.2; done
for _ in 1 2 3 4; do adb -s "$D" shell input swipe $x2 $y $x1 $y 450; /bin/sleep 1.2; done
/bin/sleep 1

# Chrome processes PSS (browser + renderer + GPU), KB
mem=$(adb -s "$D" shell dumpsys meminfo | awk '/Total PSS by process/{f=1} f && /chrome/ {gsub(",","",$1); sub("K:","",$1); s+=$1} /Total PSS by OOM/{f=0} END{print s}')
echo "{\"type\":\"mem\",\"run\":\"$run\",\"variant\":\"$v\",\"paint\":\"$paint\",\"mode\":\"$mode\",\"chromePssKB\":$mem}" >> metrics.jsonl
adb -s "$D" exec-out screencap -p > "/tmp/catalog-spike/$run.png"
echo "$run done (chrome PSS ${mem} KB)"
