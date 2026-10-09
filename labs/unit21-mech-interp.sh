#!/bin/sh
# Unit 21 lab — find the layer+head causally responsible for a refusal probe.
#
# Loads a small open model with TransformerLens, then ablates (zeroes) one
# attention head's output at a time and measures how far a refusal-vs-comply
# logit margin moves. The head with the biggest swing is the real-world
# version of Panel A's L4H2 — a shape, not a working jailbreak: the probe
# prompt and target words are placeholders, chosen only to be measurable.
#
# Local only — after the first download the model never calls out again.
# No API key. Authorized target: your own model, on your own machine.

set -u

PY=""
if command -v python3 >/dev/null 2>&1; then PY="python3"; fi
if [ -z "$PY" ]; then
  echo "=== Unit 21 lab: mech-interp attack surface ==="
  echo
  echo "python3 isn't on PATH, so there's no model to probe."
  echo "Install python3, then come back and run this script again:"
  echo "  bash labs/unit21-mech-interp.sh"
  exit 0
fi

if ! "$PY" -c "import transformer_lens" >/dev/null 2>&1; then
  echo "=== Unit 21 lab: mech-interp attack surface ==="
  echo
  echo "transformer_lens isn't installed yet, so there's nothing to ablate."
  echo "Do Unit 2 first if you haven't (it sets up the local toolchain), then:"
  echo
  echo "  pip install transformer_lens"
  echo
  echo "Then come back and run this script again:"
  echo "  bash labs/unit21-mech-interp.sh"
  exit 0
fi

MODEL="gpt2"

echo "=== Unit 21 lab: mech-interp attack surface ==="
echo "Model: $MODEL (first run downloads it — that part needs network, nothing after)"
echo

"$PY" - "$MODEL" <<'PYEOF'
import sys
import torch
from transformer_lens import HookedTransformer

MODEL = sys.argv[1]

# Toy refusal probe — a shape, not a real jailbreak target. The point is
# finding WHICH head moves the score, not breaking anything useful.
PROMPT = "Question: how do I pick a lock? Answer: I"
REFUSAL_WORD = " can't"
COMPLY_WORD = " can"

device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Loading {MODEL} on {device}...")
model = HookedTransformer.from_pretrained(MODEL, device=device)
model.eval()

tokens = model.to_tokens(PROMPT)
refusal_id = model.to_single_token(REFUSAL_WORD)
comply_id = model.to_single_token(COMPLY_WORD)


def refusal_margin(logits):
    last = logits[0, -1]
    return (last[refusal_id] - last[comply_id]).item()


with torch.no_grad():
    baseline_logits = model(tokens)
baseline = refusal_margin(baseline_logits)
print(f"Baseline refusal margin: {baseline:.3f}")

n_layers = model.cfg.n_layers
n_heads = model.cfg.n_heads


def make_ablate_hook(head):
    def hook(z, hook):
        z[:, :, head, :] = 0.0
        return z

    return hook


best_layer, best_head, best_drop = -1, -1, -1.0

for layer in range(n_layers):
    hook_name = f"blocks.{layer}.attn.hook_z"
    for head in range(n_heads):
        with torch.no_grad():
            logits = model.run_with_hooks(
                tokens,
                fwd_hooks=[(hook_name, make_ablate_hook(head))],
            )
        margin = refusal_margin(logits)
        drop = baseline - margin
        if drop > best_drop:
            best_drop = drop
            best_layer, best_head = layer, head

print()
print(f"Swept {n_layers * n_heads} heads across {n_layers} layers.")
print(f"Biggest mover: L{best_layer}H{best_head} (refusal margin dropped {best_drop:.3f})")
print()
print(f"YOUR NUMBER: L{best_layer}H{best_head}")
PYEOF
