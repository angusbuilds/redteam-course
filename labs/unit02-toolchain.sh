#!/bin/sh
# Unit 2 lab — verify the local toolchain.
#
# Four checks, each read-only. This script changes nothing on your machine,
# it only looks, and it makes no network calls and needs no API key.
#   1. python3.12   — present, pinned via uv (mlx-lm is untested on 3.14)
#   2. ollama       — daemon answers, and at least one model is pulled
#   3. mlx-lm       — importable in python (Apple's serve + train package)
#   4. llama-server — the llama.cpp server binary, your fallback runtime
#
# If a check fails it prints the exact command to fix it, then stops being
# vague about it. Your number tonight: checks passing / 4.

set -u

PASS=0
TOTAL=4

echo "=== Unit 2 lab: toolchain check ==="
echo

# ---- 1. python3.12 ----
PY312=""
if command -v uv >/dev/null 2>&1 && uv python find 3.12 >/dev/null 2>&1; then
  PY312=$(uv python find 3.12 2>/dev/null)
elif command -v python3.12 >/dev/null 2>&1; then
  PY312="python3.12"
fi

if [ -n "$PY312" ]; then
  echo "[PASS] python3.12 — found at $PY312"
  PASS=$((PASS + 1))
else
  echo "[FAIL] python3.12 — not found"
  if ! command -v uv >/dev/null 2>&1; then
    echo "       fix: install uv first — curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "       then: uv python install 3.12 && uv python pin 3.12"
  else
    echo "       fix: uv python install 3.12 && uv python pin 3.12"
  fi
fi
echo

# ---- 2. ollama: daemon answers + at least one model pulled ----
if command -v ollama >/dev/null 2>&1; then
  OLIST=$(ollama list 2>&1)
  OSTATUS=$?
  if [ "$OSTATUS" -ne 0 ]; then
    echo "[FAIL] ollama — installed, but the daemon isn't answering"
    echo "       fix: ollama serve &"
  else
    MODEL_LINES=$(printf '%s\n' "$OLIST" | tail -n +2 | grep -c .)
    if [ "$MODEL_LINES" -ge 1 ]; then
      echo "[PASS] ollama — daemon answers, $MODEL_LINES model(s) pulled"
      PASS=$((PASS + 1))
    else
      echo "[FAIL] ollama — daemon answers, but no model is pulled yet"
      echo "       fix: ollama pull qwen2.5:7b-instruct-q4_K_M"
      echo "            ollama pull llama3.2:1b"
    fi
  fi
else
  echo "[FAIL] ollama — not installed"
  echo "       fix: brew install ollama"
fi
echo

# ---- 3. mlx-lm importable ----
# Checked the same way it gets installed: `uv run python` picks up the
# .venv that `uv venv` creates in this directory, so install and check
# always agree on which interpreter's site-packages we're looking at.
if command -v uv >/dev/null 2>&1 && uv run python -c "import mlx_lm" >/dev/null 2>&1; then
  echo "[PASS] mlx-lm — importable via uv run python"
  PASS=$((PASS + 1))
else
  echo "[FAIL] mlx-lm — not importable via uv run python"
  if ! command -v uv >/dev/null 2>&1; then
    echo "       fix: install uv first — curl -LsSf https://astral.sh/uv/install.sh | sh"
  fi
  echo "       fix: uv venv && uv pip install mlx-lm mlx-lm-lora"
fi
echo

# ---- 4. llama-server ----
if command -v llama-server >/dev/null 2>&1; then
  echo "[PASS] llama-server — found on PATH"
  PASS=$((PASS + 1))
else
  echo "[FAIL] llama-server — not found"
  echo "       fix: brew install llama.cpp"
fi
echo

echo "============================================"
echo "YOUR NUMBER:  $PASS / $TOTAL checks passing"
echo "============================================"
echo

if [ "$PASS" -eq "$TOTAL" ]; then
  echo "All four green. The range is built — every lab from Unit 3 onward"
  echo "assumes this is done. Log it:"
else
  echo "Not all green yet. Run the fix command(s) above, then run this script"
  echo "again. Log today's number anyway — it's your baseline:"
fi
echo "  echo \"\$(date +%F) unit02 toolchain: $PASS/$TOTAL\" >> log/portfolio.md"
