#!/bin/sh
# Unit 24 lab — price a cost bomb, then watch pickle actually run code.
#
# Two independent halves:
#   COST    times a crafted request (big forced output) against a cheap
#           baseline, over a real local model via `ollama`. Reports the
#           real cost-amplification factor: crafted output size over
#           baseline output size.
#   SUPPLY  a tiny, dependency-free python3 demo: unpickling a crafted
#           object really executes code (one harmless printed marker, no
#           usable payload); reading the same shape of data as a hand-built
#           safetensors file does not — it's JSON header + raw bytes, no
#           exec step, parsed with nothing but struct + json.
#
# The COST half needs Unit 2's local toolchain (ollama + a pulled model).
# If that's not in place, this prints a friendly message and skips straight
# to SUPPLY, which needs nothing but python3 and always runs.
#
# Authorized target: a prompt you wrote, against a model on your own box.
# No real tool-loop is fired here — that needs an agent harness, and you
# already built one in Unit 7.

set -u

MODEL="${MODEL:-qwen2.5:7b}"
AMP="n/a"
HAVE_COST=0

echo "=== Unit 24 lab: cost bomb + weight poisoning ==="
echo

# ---------------------------------------------------------------- COST half

echo "--- COST: crafted request vs baseline, over $MODEL ---"
echo

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama isn't installed yet."
  echo "Do Unit 2 first — it installs the local toolchain this half runs on."
  echo "Skipping COST. SUPPLY below needs nothing but python3, so it still runs."
elif ! ollama list 2>/dev/null | awk '{print $1}' | grep -qF "$MODEL"; then
  echo "ollama is installed, but $MODEL isn't pulled (or the server isn't running)."
  echo "Do Unit 2 first, or run:"
  echo "  ollama serve &"
  echo "  ollama pull $MODEL"
  echo "Skipping COST. SUPPLY below needs nothing but python3, so it still runs."
else
  HAVE_COST=1
  ask() { ollama run "$MODEL" "$1" 2>&1; }

  BASELINE_PROMPT="Reply with exactly one word: pong"
  CRAFTED_PROMPT="Count from 1 to 200, spelling every number out in English words, one per line. When you reach 200, immediately count back down from 200 to 1 the same way, spelling every number out in English words, one per line. Do not skip any numbers in either direction, and do not write anything else."

  echo "baseline: \"$BASELINE_PROMPT\""
  T0=$(date +%s)
  BASELINE_REPLY=$(ask "$BASELINE_PROMPT")
  T1=$(date +%s)
  BASELINE_SEC=$((T1 - T0))
  BASELINE_WORDS=$(printf '%s' "$BASELINE_REPLY" | wc -w | tr -d ' ')
  echo "  ${BASELINE_SEC}s, ${BASELINE_WORDS} words out"
  echo

  echo "crafted: forced count-up-and-back, spelled out (deep recursion + max-tokens shape)"
  T0=$(date +%s)
  CRAFTED_REPLY=$(ask "$CRAFTED_PROMPT")
  T1=$(date +%s)
  CRAFTED_SEC=$((T1 - T0))
  CRAFTED_WORDS=$(printf '%s' "$CRAFTED_REPLY" | wc -w | tr -d ' ')
  echo "  ${CRAFTED_SEC}s, ${CRAFTED_WORDS} words out"
  echo

  AMP=$(awk -v c="$CRAFTED_WORDS" -v b="$BASELINE_WORDS" 'BEGIN { if (b < 1) b = 1; printf "%.1f", c / b }')
  echo "cost-amplification factor (words out, crafted / baseline): ${AMP}x"
  echo "(elapsed time told the same story: ${BASELINE_SEC}s baseline vs ${CRAFTED_SEC}s crafted —"
  echo " wall-clock is noisier than output size, so output size is the number above.)"
fi
echo

# -------------------------------------------------------------- SUPPLY half

echo "--- SUPPLY: does loading the file run code? ---"
echo

WORK=$(mktemp -d "${TMPDIR:-/tmp}/unit24-supply.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

python3 - "$WORK" <<'PYEOF'
import json
import pickle
import struct
import sys

work = sys.argv[1]

# ---- PICKLE: craft an object whose __reduce__ runs on unpickling. ----
# This is the standard mechanism, not a usable payload: the "code" it runs
# is a single harmless print(). Never point this at a checkpoint you did
# not make yourself.

class DemoPayload:
    def __reduce__(self):
        marker = "[DEMO MARKER] arbitrary code ran during unpickling — this would be the attacker's code, not yours"
        return (print, (marker,))

pkl_path = work + "/demo.pkl"
with open(pkl_path, "wb") as f:
    pickle.dump(DemoPayload(), f)

print("pickle:  loading demo.pkl ...")
with open(pkl_path, "rb") as f:
    pickle.load(f)  # the print() above fires HERE, as a side effect of loading
print("pickle:  load returned. 1 object reduced, 1 function call you never wrote.")
print()

# ---- SAFETENSORS: hand-build the format (8-byte header length, JSON header,
# raw tensor bytes) with nothing but struct + json — no third-party package
# needed to prove the point: there is no step in here that executes anything.

tensor_bytes = struct.pack("<f", 3.14)
header = {
    "x": {"dtype": "F32", "shape": [1], "data_offsets": [0, len(tensor_bytes)]},
    "__metadata__": {"demo": "unit24"},
}
header_bytes = json.dumps(header).encode("utf-8")

st_path = work + "/demo.safetensors"
with open(st_path, "wb") as f:
    f.write(struct.pack("<Q", len(header_bytes)))
    f.write(header_bytes)
    f.write(tensor_bytes)

print("safetensors: loading demo.safetensors ...")
with open(st_path, "rb") as f:
    (header_len,) = struct.unpack("<Q", f.read(8))
    parsed_header = json.loads(f.read(header_len))
    raw = f.read()
(value,) = struct.unpack("<f", raw[:4])
print(f"safetensors: parsed header {parsed_header['x']}, read back value {value:.2f}")
print("safetensors: load returned. 0 objects reduced, 0 function calls.")
PYEOF
SUPPLY_STATUS=$?
echo

# -------------------------------------------------------------------- summary

echo "============================================"
echo "YOUR NUMBERS:"
if [ "$HAVE_COST" -eq 1 ]; then
  echo "  cost-amplification factor : ${AMP}x  (crafted words out / baseline words out)"
else
  echo "  cost-amplification factor : not measured (ollama/model not ready — see COST message above)"
fi
if [ "$SUPPLY_STATUS" -eq 0 ]; then
  echo "  pickle executed code on load   : yes"
  echo "  safetensors executed code on load : no"
else
  echo "  SUPPLY half hit a python3 error above — see output"
fi
echo "============================================"
echo
echo "Log it:"
if [ "$HAVE_COST" -eq 1 ]; then
  echo "  echo \"\$(date +%F) unit24 consumption-supply: amp=${AMP}x\" >> log/portfolio.md"
else
  echo "  echo \"\$(date +%F) unit24 consumption-supply: amp=n/a (ollama not ready)\" >> log/portfolio.md"
fi
echo
echo "What it means:"
echo "  If COST ran: that amplification number is what a crafted-but-legal"
echo "  request costs over a normal one, measured, not estimated. Stack more"
echo "  moves (longer output, deeper recursion) and it only grows — the same"
echo "  multiplicative shape as the Cost bomb panel on the page, for real."
echo "  The SUPPLY half is the whole case for safetensors in one run: pickle"
echo "  ran a function the file chose; safetensors never got the chance to."

exit 0
