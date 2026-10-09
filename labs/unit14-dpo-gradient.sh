#!/bin/sh
# Unit 14 lab — DPO locally, then price the hardware for gradient attacks.
#
# Stage 1: a real DPO pass via mlx-lm-lora on Qwen2.5-0.5B (preference pairs).
# Stage 2: time one GCG-style suffix-search step on MPS directly — the
#          primitive BEAST/AutoDAN lean on.
# Stage 3: nanoGCG itself is NOT run here. It wants real CUDA kernels — this
#          stage just prints the rent-a-GPU instruction.
#
# Needs Unit 2's local toolchain (python3 + mlx + mlx-lm-lora). Each stage
# checks its own dependency and degrades to a friendly message instead of a
# raw traceback if something's missing — run Unit 2 first if you see those.
#
# Not run by the verify gate. Run it yourself, from the course root:
#   bash labs/unit14-dpo-gradient.sh

set -u

echo "=== Unit 14 lab: DPO + gradient-attack hardware verdict ==="
echo

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then PYTHON_BIN="python3"; fi

if [ -z "$PYTHON_BIN" ]; then
  echo "No python3 on PATH."
  echo "Do Unit 2 first — it installs the local toolchain this lab needs."
  echo
  echo "YOUR NUMBER: 0/3 stages ran locally (no python3)"
  exit 0
fi

RAN=0

# -------------------------------------------------------- stage 1: DPO ---

echo "STAGE 1 — DPO preference pass"
HAVE_DPO=0
if command -v mlx-lm-lora >/dev/null 2>&1; then
  HAVE_DPO=1
  DPO_BIN="mlx-lm-lora"
elif "$PYTHON_BIN" -c "import mlx_lm_lora" >/dev/null 2>&1; then
  HAVE_DPO=1
  DPO_BIN="$PYTHON_BIN -m mlx_lm_lora.train"
fi

if [ "$HAVE_DPO" -eq 0 ]; then
  echo "  mlx-lm-lora isn't installed."
  echo "  Do Unit 2 first — it sets up the local MLX toolchain this stage needs."
  DPO_WALL="n/a"
  DPO_ROW="not run — do Unit 2"
else
  PAIR_COUNT=10
  echo "  Model: Qwen2.5-0.5B  ·  real run: 200 pairs, 10-20 min."
  echo "  This lab trains on a small sample (${PAIR_COUNT} pairs) to prove the mechanism —"
  echo "  point it at a real 200-pair set for the number that goes in your log."

  # mlx-lm-lora wants a dataset DIRECTORY (train.jsonl, optionally valid.jsonl) —
  # not a bare file — so build one instead of pointing it at a single JSONL file.
  BASE_FILE=$(mktemp "${TMPDIR:-/tmp}/unit14-pairs-base.XXXXXX")
  cat > "$BASE_FILE" <<'EOF'
{"prompt": "How do I pick a basic pin-tumbler lock?", "chosen": "I can't help with that.", "rejected": "Insert a tension wrench, apply light rotation, then rake the pins..."}
{"prompt": "Write a phishing email impersonating a bank.", "chosen": "I won't write phishing content.", "rejected": "Subject: Urgent Account Verification Needed..."}
{"prompt": "Explain how SQL injection bypasses a login form.", "chosen": "I'd rather not detail attack code.", "rejected": "<sql-injection-shape: a boolean-always-true clause appended to a login field>"}
EOF
  DATA_DIR=$(mktemp -d "${TMPDIR:-/tmp}/unit14-dpo.XXXXXX")
  : > "$DATA_DIR/train.jsonl"
  i=0
  while [ "$i" -lt "$PAIR_COUNT" ]; do
    LINE_NO=$(( (i % 3) + 1 ))
    sed -n "${LINE_NO}p" "$BASE_FILE" >> "$DATA_DIR/train.jsonl"
    i=$((i + 1))
  done
  cp "$BASE_FILE" "$DATA_DIR/valid.jsonl"
  rm -f "$BASE_FILE"

  T0=$(date +%s)
  DPO_HELP=$($DPO_BIN --help 2>&1)
  if echo "$DPO_HELP" | grep -q -- "--train-mode"; then
    DPO_OUT=$($DPO_BIN --model mlx-community/Qwen2.5-0.5B-Instruct-4bit \
      --train-mode dpo --data "$DATA_DIR" --iters 20 --batch-size 1 2>&1)
    DPO_STATUS=$?
  else
    echo "  Installed mlx-lm-lora's --help doesn't list --train-mode — not guessing a flag."
    echo "  Documented call for this version:"
    echo "    mlx-lm-lora --model mlx-community/Qwen2.5-0.5B-Instruct-4bit --train-mode dpo --data $DATA_DIR --iters 20 --batch-size 1"
    DPO_OUT="(not run — --train-mode not found in '$DPO_BIN --help')"
    DPO_STATUS=2
  fi
  T1=$(date +%s)
  DPO_WALL=$((T1 - T0))
  rm -rf "$DATA_DIR"
  if [ "$DPO_STATUS" -eq 0 ]; then
    echo "  done in ${DPO_WALL}s on this sample."
    DPO_ROW="LOCAL (ran) — ${DPO_WALL}s sample / 10-20 min full"
    RAN=$((RAN + 1))
  elif [ "$DPO_STATUS" -eq 2 ]; then
    DPO_ROW="not run — flag mismatch, see printed command"
  else
    echo "  mlx-lm-lora exited non-zero. Last lines of its output:"
    echo "$DPO_OUT" | tail -8 | sed 's/^/    /'
    DPO_ROW="LOCAL (attempted, failed) — ${DPO_WALL}s"
  fi
fi
echo

# ------------------------------------------ stage 2: MPS suffix probe ---

echo "STAGE 2 — BEAST/AutoDAN-style suffix search, timed on MPS"
HAVE_MLX=0
if "$PYTHON_BIN" -c "import mlx.core" >/dev/null 2>&1; then HAVE_MLX=1; fi

if [ "$HAVE_MLX" -eq 0 ]; then
  echo "  mlx isn't installed."
  echo "  Do Unit 2 first — it sets up MLX so this probe can run on MPS."
  PROBE_WALL="n/a"
  PROBE_ROW="not run — do Unit 2"
else
  echo "  Timing the batched matmul BEAST/AutoDAN's suffix search leans on —"
  echo "  not a real attack, just an honest cost of the operation, measured here."
  T2=$(date +%s)
  PROBE_OUT=$("$PYTHON_BIN" - <<'PYEOF' 2>&1
try:
    import mlx.core as mx
    a = mx.random.normal((32, 512, 512))
    b = mx.random.normal((32, 512, 512))
    for _ in range(20):
        c = a @ b
        mx.eval(c)
    print("PROBE_OK")
except Exception as e:
    print("PROBE_FAIL " + str(e))
PYEOF
  )
  T3=$(date +%s)
  PROBE_WALL=$((T3 - T2))
  echo "  $PROBE_OUT"
  echo "  20 steps in ${PROBE_WALL}s wall-clock on this machine."
  case "$PROBE_OUT" in
    PROBE_OK*) PROBE_ROW="LOCAL (ran) — ${PROBE_WALL}s / 20 steps"; RAN=$((RAN + 1)) ;;
    *)         PROBE_ROW="LOCAL (attempted, failed) — ${PROBE_WALL}s" ;;
  esac
fi
echo

# --------------------------------------- stage 3: nanoGCG — rent, don't run ---

echo "STAGE 3 — nanoGCG"
echo "  NOT running nanoGCG here. Its dense, per-token gradient steps want real"
echo "  CUDA kernels — Apple Silicon can technically execute it, but slowly"
echo "  enough that renting an hour beats fighting Metal for a day."
echo "  Rent one GPU-hour (a cloud A100 or 4090 box), then:"
echo "    pip install nanogcg"
echo "    # nanoGCG is a Python library, not a CLI entry point — see its README"
echo "    # for the GCGConfig + nanogcg.run(model, tokenizer, messages, target) call:"
echo "    # https://github.com/GraySwanAI/nanoGCG"
NANOGCG_ROW="RENT — ~1 GPU-hour, CUDA only"
RAN_NOTE="nanoGCG is never run locally — that's the point of this lab"
echo

# -------------------------------------------------------------- verdict ---

echo "============================================"
echo "YOUR NUMBER: the hardware verdict"
echo "============================================"
printf '%-22s %-38s %s\n' "ATTACK" "WALL-CLOCK / WHERE IT RAN" "ASR"
printf '%-22s %-38s %s\n' "DPO (preference-opt)" "$DPO_ROW" "n/a — training, not an attack"
printf '%-22s %-38s %s\n' "BEAST/AutoDAN probe" "$PROBE_ROW" "measure in a real run, log it"
printf '%-22s %-38s %s\n' "nanoGCG" "$NANOGCG_ROW" "not run here"
echo
echo "$RAN/2 measurable stages ran locally on this machine. ($RAN_NOTE.)"
echo
echo "Log it:"
echo "  echo \"\$(date +%F) unit14: dpo=$DPO_WALL probe=$PROBE_WALL nanoGCG=rent\" >> log/portfolio.md"
