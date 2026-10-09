#!/bin/sh
# Unit 11 lab — your first fine-tune.
#
# Builds a tiny chat dataset, then runs mlx_lm.lora on Qwen2.5-0.5B-Instruct
# for a short, low-iteration LoRA run — real training, on your own Mac.
#
# Your numbers: tokens/sec, final training loss, and the adapter's size.
#
# Needs Unit 2's local toolchain first: an Apple Silicon Mac + mlx-lm
# (pip install mlx-lm). If that's not in place yet, this script says so and
# stops cleanly instead of crashing.
#
# Authorized target: a model you fine-tune, on your own machine.

set -u

need_unit2() {
  echo "============================================"
  echo "  $1"
  echo "============================================"
  echo
  echo "Unit 11's lab needs Unit 2's local toolchain first:"
  echo "  - an Apple Silicon Mac (M1/M2/M3/M4)"
  echo "  - python3, with mlx-lm installed (pip install mlx-lm)"
  echo
  echo "Go do Unit 2 first, then come back and run this again:"
  echo "  bash labs/unit11-lora.sh"
  exit 1
}

# ---- platform check --------------------------------------------------------

OS=$(uname -s)
ARCH=$(uname -m)
if [ "$OS" != "Darwin" ] || [ "$ARCH" != "arm64" ]; then
  need_unit2 "mlx-lm needs an Apple Silicon Mac (found: $OS/$ARCH)"
fi

# ---- toolchain check --------------------------------------------------------

if ! command -v python3 >/dev/null 2>&1; then
  need_unit2 "python3 not found on PATH"
fi
PY="python3"

LORA_BIN=""
if command -v mlx_lm.lora >/dev/null 2>&1; then
  LORA_BIN="mlx_lm.lora"
elif "$PY" -c "import mlx_lm" >/dev/null 2>&1; then
  LORA_BIN="$PY -m mlx_lm.lora"
else
  need_unit2 "mlx-lm not installed"
fi

MODEL="Qwen/Qwen2.5-0.5B-Instruct"

# ---- build a tiny chat dataset ---------------------------------------------

WORK=$(mktemp -d "${TMPDIR:-/tmp}/unit11-lora.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

DATA_DIR="$WORK/data"
mkdir -p "$DATA_DIR"

echo "=== Unit 11 lab: your first fine-tune ==="
echo "Building a tiny chat dataset in $DATA_DIR ..."

write_examples() {
  out="$1"; start="$2"; count="$3"
  i="$start"
  end=$((start + count))
  : > "$out"
  while [ "$i" -lt "$end" ]; do
    topic=$((i % 12))
    printf '{"messages": [{"role": "user", "content": "What does lesson %d of the red-team course cover?"}, {"role": "assistant", "content": "Lesson %d covers attack family number %d: name the engine, run the lab, write down the number."}]}\n' \
      "$i" "$i" "$topic" >> "$out"
    i=$((i + 1))
  done
}

write_examples "$DATA_DIR/train.jsonl" 1 32
write_examples "$DATA_DIR/valid.jsonl" 33 8

echo "  train: $(wc -l < "$DATA_DIR/train.jsonl" | tr -d ' ') examples"
echo "  valid: $(wc -l < "$DATA_DIR/valid.jsonl" | tr -d ' ') examples"
echo

# ---- run the real fine-tune -------------------------------------------------

ADAPTER_DIR="$WORK/adapters"
LOG="$WORK/run.log"

echo "Running mlx_lm.lora on $MODEL (60 iters)."
echo "First run downloads the model from Hugging Face (a few hundred MB)."
echo "Training itself takes under a minute on Apple Silicon."
echo

( $LORA_BIN \
    --model "$MODEL" \
    --train \
    --data "$DATA_DIR" \
    --adapter-path "$ADAPTER_DIR" \
    --iters 60 \
    --batch-size 2 \
    --num-layers 4 \
    --steps-per-report 10 \
    --steps-per-eval 30 2>&1
  echo $? > "$WORK/status"
) | tee "$LOG"
STATUS=$(cat "$WORK/status" 2>/dev/null || echo 1)

echo
if [ "$STATUS" -ne 0 ]; then
  echo "mlx_lm.lora exited with an error (see the log above)."
  echo "Common causes: no network on first run (it fetches the model from"
  echo "Hugging Face), or an out-of-date mlx-lm — try: pip install -U mlx-lm"
  exit 1
fi

# ---- pull the numbers out of the log ---------------------------------------

TOKSEC=$(grep -Eio 'tokens?[/-]sec[: ]+[0-9.]+' "$LOG" | grep -Eo '[0-9.]+$' | tail -1)
LOSS=$(grep -Eio 'train loss[: ]+[0-9.]+' "$LOG" | grep -Eo '[0-9.]+$' | tail -1)

ADAPTER_SIZE="n/a"
ADAPTER_FILE=$(find "$ADAPTER_DIR" -maxdepth 1 -type f \( -name "*.safetensors" -o -name "*.npz" \) 2>/dev/null | head -1)
if [ -n "$ADAPTER_FILE" ]; then
  ADAPTER_SIZE=$(du -h "$ADAPTER_FILE" | awk '{print $1}')
fi

echo "============================================"
echo "YOUR NUMBERS:"
echo "  tokens/sec   : ${TOKSEC:-see log above}"
echo "  final loss   : ${LOSS:-see log above}"
echo "  adapter size : $ADAPTER_SIZE"
echo "============================================"
echo
echo "Log it:"
echo "  echo \"\$(date +%F) unit11 lora: ${TOKSEC:-?} tok/s, loss ${LOSS:-?}\" >> log/portfolio.md"
echo
echo "What it means:"
echo "  You just changed a real model's weights on your own Mac — a tiny"
echo "  LoRA adapter, trained on a tiny dataset, in under a minute. Same"
echo "  command, same model, same adapter mechanics as Units 12-14 — only"
echo "  the DATA changes. That is the whole weaponization step."
