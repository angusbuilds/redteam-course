#!/bin/sh
# Unit 20 lab — craft FGSM/PGD adversarial examples on one model, test
# transfer on a second, differently-shaped one.
#
# Trains two small CNNs on MNIST (model A: 2 conv layers, narrow; model B:
# wider but shallower — a genuinely different architecture, not just a
# different seed). Wraps both as ART PyTorchClassifiers, finds test images
# BOTH already classify correctly, crafts FGSM (then PGD) adversarial
# examples against model A only, and scores how many of those examples also
# flip model B — a model that never saw a gradient computed against it.
#
# Local only, after the first run. First run downloads MNIST (~11 MB) via
# torchvision; nothing after that needs network.
#
# Authorized target: your own models, on your own machine.

set -u

PY=""
if command -v python3 >/dev/null 2>&1; then PY="python3"; fi
if [ -z "$PY" ]; then
  echo "=== Unit 20 lab: FGSM/PGD transfer ==="
  echo
  echo "No python3 on PATH. Install Python 3, then run this again:"
  echo "  bash labs/unit20-adversarial-ml.sh"
  echo
  echo "YOUR NUMBER: n/a (no python3)"
  exit 0
fi

if ! "$PY" -c "import torch, torchvision, art" >/dev/null 2>&1; then
  echo "=== Unit 20 lab: FGSM/PGD transfer ==="
  echo
  echo "torch, torchvision, and/or adversarial-robustness-toolbox (ART) aren't"
  echo "installed yet. One line gets all three:"
  echo
  echo "  pip install torch torchvision adversarial-robustness-toolbox"
  echo
  echo "Then come back and run this again:"
  echo "  bash labs/unit20-adversarial-ml.sh"
  echo
  echo "YOUR NUMBER: n/a (torch/torchvision/ART not installed)"
  exit 0
fi

echo "=== Unit 20 lab: FGSM/PGD transfer ==="
echo "First run downloads MNIST (~11 MB) — nothing after that needs network."
echo

"$PY" - <<'PYEOF'
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms
from art.estimators.classification import PyTorchClassifier
from art.attacks.evasion import FastGradientMethod, ProjectedGradientDescent

torch.manual_seed(20)
DEVICE = "cpu"
EPS = 0.2

# Model A — the surrogate the attacker actually owns. Two conv layers, narrow.
class ModelA(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Flatten(),
            nn.Linear(32 * 7 * 7, 64), nn.ReLU(),
            nn.Linear(64, 10),
        )
    def forward(self, x):
        return self.net(x)

# Model B — the black-box target. Different kernel size, different depth,
# different pooling — a genuinely different decision boundary, not a clone.
class ModelB(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 8, 5, padding=2), nn.ReLU(),
            nn.Conv2d(8, 8, 5, padding=2), nn.ReLU(),
            nn.MaxPool2d(4),
            nn.Flatten(),
            nn.Linear(8 * 7 * 7, 10),
        )
    def forward(self, x):
        return self.net(x)

print("Loading MNIST...")
tfm = transforms.ToTensor()
train_full = datasets.MNIST("data/mnist", train=True, download=True, transform=tfm)
test_full = datasets.MNIST("data/mnist", train=False, download=True, transform=tfm)

# Small subset so the mechanism proves out in a couple of minutes on a laptop.
# Point TRAIN_N at len(train_full) for the number that goes in your log.
TRAIN_N = 3000
train_loader = DataLoader(Subset(train_full, range(TRAIN_N)), batch_size=64, shuffle=True)

def train(model, name):
    print(f"Training {name} on {TRAIN_N} images, 1 epoch...")
    model.to(DEVICE).train()
    opt = optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()
    for xb, yb in train_loader:
        xb, yb = xb.to(DEVICE), yb.to(DEVICE)
        opt.zero_grad()
        loss = loss_fn(model(xb), yb)
        loss.backward()
        opt.step()
    model.eval()
    return model

model_a = train(ModelA(), "model A (surrogate)")
model_b = train(ModelB(), "model B (black-box target)")

def make_classifier(model):
    return PyTorchClassifier(
        model=model,
        loss=nn.CrossEntropyLoss(),
        optimizer=optim.Adam(model.parameters(), lr=1e-3),
        input_shape=(1, 28, 28),
        nb_classes=10,
        clip_values=(0.0, 1.0),
        device_type="cpu",
    )

clf_a = make_classifier(model_a)
clf_b = make_classifier(model_b)

# Pick test images BOTH models already get right — only those count toward
# an honest transfer rate (a flip on an image model B was already wrong
# about isn't an attack success, it's noise).
print("Selecting a held-out set both models already classify correctly...")
EVAL_N = 300
eval_loader = DataLoader(Subset(test_full, range(EVAL_N)), batch_size=EVAL_N, shuffle=False)
x_eval, y_eval = next(iter(eval_loader))
x_np, y_np = x_eval.numpy(), y_eval.numpy()

pred_a0 = clf_a.predict(x_np).argmax(axis=1)
pred_b0 = clf_b.predict(x_np).argmax(axis=1)
keep = (pred_a0 == y_np) & (pred_b0 == y_np)
x_keep, y_keep = x_np[keep], y_np[keep]
print(f"{len(y_keep)} / {EVAL_N} images both models already got right — crafting against those.")

if len(y_keep) == 0:
    print()
    print("Both models are too undertrained to agree on anything yet.")
    print("Raise TRAIN_N in this script and run it again.")
    print()
    print("YOUR NUMBER: n/a (no shared correct predictions to attack)")
else:
    def transfer_asr(attack_cls, **kw):
        attack = attack_cls(estimator=clf_a, eps=EPS, **kw)
        adv_x = attack.generate(x=x_keep)
        pred_a_adv = clf_a.predict(adv_x).argmax(axis=1)
        pred_b_adv = clf_b.predict(adv_x).argmax(axis=1)
        whitebox_asr = (pred_a_adv != y_keep).mean() * 100
        transfer = (pred_b_adv != y_keep).mean() * 100
        return whitebox_asr, transfer

    print(f"Crafting FGSM at epsilon={EPS} against model A...")
    fgsm_white, fgsm_transfer = transfer_asr(FastGradientMethod)

    print(f"Crafting PGD at epsilon={EPS} against model A (10 steps, for comparison)...")
    pgd_white, pgd_transfer = transfer_asr(
        ProjectedGradientDescent, eps_step=EPS / 4, max_iter=10
    )

    print()
    print("============================================")
    print(f"FGSM  white-box ASR (on model A): {fgsm_white:.0f}%")
    print(f"FGSM  transfer  ASR (on model B): {fgsm_transfer:.0f}%")
    print(f"PGD   white-box ASR (on model A): {pgd_white:.0f}%")
    print(f"PGD   transfer  ASR (on model B): {pgd_transfer:.0f}%")
    print("============================================")
    print()
    print(f"YOUR NUMBER:  FGSM transfer ASR = {fgsm_transfer:.0f}% at epsilon={EPS}")
    print()
    print("Log it:")
    print(f'  echo "$(date +%F) unit20 transfer ASR: {fgsm_transfer:.0f}% at eps={EPS}" >> log/portfolio.md')
PYEOF
