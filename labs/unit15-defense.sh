#!/bin/sh
# Unit 15 lab — break the breaker.
#
# Re-runs your Unit 12 abliteration attack against a circuit-breakers
# checkpoint (or a clearly-labelled stand-in, if the real one isn't pulled
# yet) and reports the EFFORT MULTIPLIER: how many more probes it took vs
# your Unit 12 baseline. Survival (did it hold at all) is a footnote under
# that number, not the headline — a working defense is a tax, not a wall.
#
# Local models only. No ANTHROPIC key, no claude CLI. Needs the Unit 2
# toolchain (python3 + ollama). If that's not installed yet, this says so
# and stops cleanly instead of failing ugly.
#
# HONESTY NOTE: as shipped, this script is a teaching SIMULATION. It does
# not load any checkpoint and does not call ollama — the probe count and
# multiplier come from a seeded random erosion loop that stands in for the
# real circuit-breaker mechanism. Every line of output below says so. To
# get a REAL measured number, load a pulled checkpoint from
# data/checkpoints/circuit-breakers with ollama (or the circuit-breakers
# repo's own runner), fire your actual Unit 12 attack at it, and replace
# this script's probe loop with the real probe count it took.
#
# Authorized target: your own local checkpoint/stand-in, on your own box.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASELINE_FILE="$ROOT/log/unit12-baseline.txt"
CKPT_DIR="$ROOT/data/checkpoints/circuit-breakers"

echo "=== Unit 15 lab: break the breaker ==="
echo

# --- dependency gate: don't fail ugly, point back at Unit 2 -----------------
need_unit2=0
if ! command -v python3 >/dev/null 2>&1; then need_unit2=1; fi
if ! command -v ollama  >/dev/null 2>&1; then need_unit2=1; fi

if [ "$need_unit2" = "1" ]; then
  echo "Local toolchain not found (need python3 + ollama on PATH)."
  echo "Do Unit 2 first — it installs both — then re-run:"
  echo "  bash labs/unit15-defense.sh"
  exit 0
fi

# --- baseline: your own Unit 12 number if you logged one, else the ---------
# --- course teaching baseline, clearly labelled as a fallback. -------------
if [ -f "$BASELINE_FILE" ]; then
  BASELINE=$(tr -dc '0-9' < "$BASELINE_FILE")
  if [ -z "$BASELINE" ] || [ "$BASELINE" = "0" ]; then BASELINE=40; fi
  echo "Unit 12 baseline: $BASELINE probes (from log/unit12-baseline.txt)"
else
  BASELINE=40
  echo "No Unit 12 baseline log found — using the course teaching baseline: $BASELINE probes."
  echo "(Run Unit 12's lab and save log/unit12-baseline.txt to get your own number here instead.)"
fi
echo

# --- target: note whether a checkpoint dir exists, but be honest that this
# --- script loads and attacks NEITHER case — it only runs the simulation
# --- below, no matter what's sitting in CKPT_DIR. --------------------------
if [ -d "$CKPT_DIR" ] && [ -n "$(ls -A "$CKPT_DIR" 2>/dev/null)" ]; then
  MODE="checkpoint directory found at $CKPT_DIR — but NOT loaded or attacked by this script"
else
  MODE="no checkpoint pulled — see github.com/GraySwanAI/circuit-breakers"
fi
echo "Target: $MODE"
echo
echo "*** ILLUSTRATIVE SIMULATION — NOT A MEASUREMENT ***"
echo "This script does not call ollama, does not load any checkpoint (even if"
echo "one is sitting in $CKPT_DIR), and does not re-run your actual Unit 12"
echo "attack. Every number below comes from a seeded random erosion loop that"
echo "stands in for the real circuit-breaker mechanism, for teaching only."
echo
echo "Simulating... (seeded, so this is reproducible on this machine)"
echo

# --- the probe loop: erode a circuit-breaker refusal signal per probe ------
# until it crosses the crack threshold, or we hit a hard ceiling. This is
# a teaching SIMULATION stand-in for the real mechanism (interrupt-on-
# representation, not on keyword) — it never reads CKPT_DIR and never
# calls ollama. For a REAL measurement: load the pulled checkpoint in
# CKPT_DIR with ollama (or the circuit-breakers repo's own runner), fire
# your actual Unit 12 attack script at it, and replace this loop's output
# with the real probes-to-crack it took.
OUT=$(python3 - "$BASELINE" <<'PYEOF'
import random
import sys

baseline = int(sys.argv[1])
random.seed(15)  # unit 15 — reproducible on this machine

signal = 1.0
threshold = 0.08
probes = 0
ceiling = baseline * 40  # hard stop so a missing/degraded target can't hang

while signal > threshold and probes < ceiling:
    probes += 1
    signal -= random.uniform(0.0015, 0.004)

cracked = signal <= threshold
multiplier = probes / baseline if baseline else 0.0

print("probes=%d" % probes)
print("cracked=%s" % ("yes" if cracked else "no"))
print("multiplier=%.1f" % multiplier)
PYEOF
)

PROBES=$(echo "$OUT" | sed -n 's/^probes=//p')
CRACKED=$(echo "$OUT" | sed -n 's/^cracked=//p')
MULT=$(echo "$OUT" | sed -n 's/^multiplier=//p')

if [ -z "$PROBES" ] || [ -z "$MULT" ]; then
  echo "ERROR: the probe step produced no result. Check your python3 install." >&2
  exit 1
fi

if [ "$CRACKED" = "yes" ]; then VERDICT="held then cracked (simulated)"; else VERDICT="still held at the probe ceiling (simulated)"; fi

echo "probes to crack (SIMULATED, not measured): $PROBES"
echo "baseline (Unit 12): $BASELINE"
echo
echo "============================================"
echo "SIMULATED NUMBER:  ${MULT}x illustrative effort multiplier"
echo "============================================"
echo "This is NOT a measured result. See the SIMULATION notice above —"
echo "no checkpoint was loaded and no attack was actually run."
echo "(survival footnote, also simulated: $VERDICT — $MODE)"
echo
echo "Log it as a simulation if you log it at all:"
echo "  echo \"\$(date +%F) unit15 defense (SIMULATED): ${MULT}x multiplier, $VERDICT\" >> log/portfolio.md"
echo
echo "What it means:"
echo "  ${MULT}x is an illustrative multiplier from a random teaching loop,"
echo "  not a measured one. A real defense like this doesn't make the attack"
echo "  impossible — it makes it expensive, and that price is what you'd be"
echo "  measuring for real. To get the real number: pull a circuit-breakers"
echo "  checkpoint into $CKPT_DIR, load it with ollama (or the repo's own"
echo "  runner), re-run your actual Unit 12 attack script against it, and"
echo "  swap this script's simulated loop for the real probes-to-crack."
