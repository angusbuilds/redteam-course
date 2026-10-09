#!/bin/sh
# Unit 25 lab — map, score, and disclose one planted local finding.
#
# No model, no network: a built-in example finding is walked through the
# whole governance pipeline this unit teaches.
#   1. TAG      — OWASP LLM Top-10 ID + MITRE ATLAS tactic/technique + NIST
#                 AI RMF function.
#   2. SCORE    — compute an AIVSS 0-10 severity from six factors (same
#                 six, same formula, as the Panel B widget on the page).
#   3. DISCLOSE — print a coordinated-disclosure (CVD) timeline template.
#
# Pure POSIX sh + awk for the arithmetic — this pipeline runs identically on
# a $50 CTF box or a $20k bounty target. Swap FINDING_* and the six factors
# below for a real finding when you have one.
#
# Authorized target: a finding you planted yourself or were invited to test.

set -u

AWK=""
if command -v awk >/dev/null 2>&1; then AWK="awk"; fi
if [ -z "$AWK" ]; then
  echo "=== Unit 25 lab: governance pipeline ==="
  echo
  echo "awk isn't on PATH, and this lab needs it to compute the score."
  echo "awk ships with macOS and every POSIX shell environment — check PATH"
  echo "and re-run:"
  echo
  echo "  bash labs/unit25-governance.sh"
  echo
  echo "YOUR NUMBER: 0.0 (no awk, no score)"
  exit 0
fi

echo "=== Unit 25 lab: map -> score -> disclose ==="
echo

# ---- 1. the planted finding (built-in example; swap in your own real one) ----

FINDING_NAME="Support-bot tool call ignores path guard on an attacker-controlled filename"
FINDING_DESC="A help-desk agent reads a filename out of the user's message
and passes it straight to a read_file tool with no allow-list and no path
check. A crafted filename like '../../secrets/config.yaml' reads anywhere
the agent's process has access to — the excessive-agency shape from Panel A."

echo "--- 1. THE FINDING (planted, local) ---"
echo "$FINDING_NAME"
echo "$FINDING_DESC"
echo

# ---- 2. map it ----

echo "--- 2. MAP ---"
echo "OWASP LLM Top-10 : LLM06 - Excessive Agency"
echo "                   (touches LLM01 - Prompt Injection too: the filename"
echo "                    itself IS the injected instruction)"
echo "MITRE ATLAS       : Tactic    - Execution"
echo "                     Technique - LLM Plugin Compromise (AML.T0053)"
echo "NIST AI RMF        : Manage (the fix is a control — allow-list + sandbox"
echo "                     the tool — not a model-level patch)"
echo

# ---- 3. score it (AIVSS, 0-10) ----
# Six factors, 0-10 each, same shape and same formula as the Panel B widget
# on the page. This is a worked example for ONE finding, not a general
# formula fit to every bug — see the page's honest-label callout for the
# same caveat, and the real calculator pinned in Sources.

REACH=10        # reachable over the network, no special positioning needed
PRIV_FREE=9      # attacker needs almost no privilege: any chat user
NO_INTERACTION=8 # fires off the attacker's own message, no victim needed
CONF=9           # reads arbitrary local files -> near-total confidentiality hit
INTEG=4          # read-only tool, can't write -> low integrity hit
AUTONOMY=9       # the agent calls the tool itself, no human approval step

SCORE=$("$AWK" -v reach="$REACH" -v privfree="$PRIV_FREE" -v noint="$NO_INTERACTION" \
  -v conf="$CONF" -v integ="$INTEG" -v auto="$AUTONOMY" 'BEGIN {
    expl   = (reach + privfree + noint) / 3
    impact = (conf + integ) / 2
    base   = expl * 0.4 + impact * 0.6
    mult   = 0.6 + 0.4 * (auto / 10)
    score  = base * mult
    if (score > 10) score = 10
    printf "%.1f", score
  }')

echo "--- 3. SCORE (AIVSS, 0-10) ---"
echo "reach=$REACH  privilege-free=$PRIV_FREE  no-interaction=$NO_INTERACTION"
echo "confidentiality=$CONF  integrity=$INTEG  autonomy=$AUTONOMY"
echo "AIVSS score: $SCORE / 10"
echo

# ---- 4. disclose it (coordinated disclosure timeline template) ----

echo "--- 4. DISCLOSE (coordinated disclosure timeline template) ---"
cat <<'EOF'
Day  0  Report filed with the maintainer/vendor, or submitted to a CNA
        (huntr, for ML/AI findings) for CVE assignment. Include repro
        steps + the OWASP/ATLAS/NIST map + the AIVSS score above.
Day  0  Embargo starts. No public write-up, no PoC repo, no post about it.
Day 30  Check-in. Vendor confirms triage and gives an ETA, or you escalate
        per the CNA's own policy (huntr/MITRE each publish theirs — follow
        the one you filed under).
Day 60  Or when the fix actually SHIPS, whichever is later. "Merged" does
        not count — it has to be live for users.
Day 67  A grace period (fix-ship + 7 days) so real users get a chance to
        update before anything public drops.
Day 90  Hard ceiling. Publish even without a fix — the industry-standard
        90-day disclosure norm. 90 days is the backstop, never the target.
EOF
echo

echo "YOUR NUMBER: $SCORE"
