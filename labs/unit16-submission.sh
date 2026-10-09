#!/bin/sh
# Unit 16 lab — assemble your report and scope-check it before you submit.
#
# Reads your own log (log/portfolio.md), templates a report from it, and
# checks the finding type you choose against the venue scope rules in
# data/world-oct-2026.json. Pure shell. No model, no network call — the
# only number that actually matters tonight is the one YOU produce by
# clicking submit, not anything this script can print for you.
#
# Override any field before running, e.g.:
#   TITLE="Tool-call hijack via poisoned calendar invite" \
#   IMPACT="agent runs attacker tool call with no confirmation" \
#   TYPE=injection VENUE=hackaprompt \
#   bash labs/unit16-submission.sh

set -u

# ---- locate the course root, whether run from it (the normal way) or not
if [ -f "./data/world-oct-2026.json" ]; then
  ROOT="."
else
  SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  if [ -f "$SELF_DIR/../data/world-oct-2026.json" ]; then
    ROOT="$SELF_DIR/.."
  else
    ROOT=""
  fi
fi

if [ -z "$ROOT" ]; then
  echo "Can't find data/world-oct-2026.json from here."
  echo "Run this from the course root: bash labs/unit16-submission.sh"
  exit 1
fi

WORLD="$ROOT/data/world-oct-2026.json"
PORTFOLIO="$ROOT/log/portfolio.md"

echo "=== Unit 16 lab: assemble + scope-check your submission ==="
echo

# ---- pull your last logged line as default evidence, if you have one.
# Real entries start with a date (echo "$(date +%F) ..."), so match that —
# skips the file's own header prose when the log is still empty.
LAST_LOG=""
if [ -f "$PORTFOLIO" ]; then
  LAST_LOG=$(grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}' "$PORTFOLIO" 2>/dev/null | tail -n 1)
fi

if [ -z "$LAST_LOG" ]; then
  echo "log/portfolio.md has no entries yet."
  echo "Do an earlier unit's lab first and log one line — win or lose — then"
  echo "come back here. (Unit 1's lab is the fastest way to get a first line.)"
  echo
  echo "Running anyway with placeholder fields so you can see the shape:"
  echo
  LAST_LOG="(no portfolio entry yet)"
fi

# ---- the five report fields: env override, else a default drawn from your log
TITLE="${TITLE:-<name your strongest result>}"
SCOPE="${SCOPE:-<your target + how you were authorized to test it>}"
REPRO="${REPRO:-<numbered steps a stranger could follow>}"
IMPACT="${IMPACT:-$LAST_LOG}"
FIX="${FIX:-<the one change that would have stopped this>}"
TYPE="${TYPE:-jailbreak}"
VENUE="${VENUE:-anthropic}"

echo "--- REPORT (ready to paste) -------------------------------"
echo
echo "TITLE"
echo "$TITLE"
echo
echo "TARGET + SCOPE"
echo "$SCOPE"
echo
echo "STEPS TO REPRODUCE"
echo "$REPRO"
echo
echo "IMPACT"
echo "$IMPACT"
echo
echo "SUGGESTED FIX"
echo "$FIX"
echo
echo "-------------------------------------------------------------"
echo

# ---- count how many of the five fields are still placeholders
FIELDS_READY=5
for v in "$TITLE" "$SCOPE" "$REPRO" "$IMPACT" "$FIX"; do
  case "$v" in
    \<*\>|"(no portfolio entry yet)") FIELDS_READY=$((FIELDS_READY - 1)) ;;
  esac
done

# ---- scope check: look up TYPE x VENUE against data/world-oct-2026.json's
# venue rules (grep the one-line-per-venue JSON for the chosen venue, then
# flag EXCLUDES language for the chosen finding type)
VENUE_LINE=""
VENUE_NAME=""
VENUE_URL=""
case "$VENUE" in
  anthropic)  VENUE_GREP="Anthropic Model Safety"; VENUE_URL="https://hackerone.com/anthropic-vdp" ;;
  openai)     VENUE_GREP="\"name\": \"OpenAI\"";    VENUE_URL="https://bugcrowd.com/engagements/openai" ;;
  google)     VENUE_GREP="Google AI VRP";           VENUE_URL="https://bughunters.google.com/" ;;
  zerodin)    VENUE_GREP="\"name\": \"0din\"";       VENUE_URL="https://0din.ai/" ;;
  hackaprompt) VENUE_GREP="HackAPrompt";            VENUE_URL="https://www.hackaprompt.com/" ;;
  *)
    echo "Unknown VENUE '$VENUE'. Pick one of: anthropic openai google zerodin hackaprompt"
    exit 1
    ;;
esac

if [ -f "$WORLD" ]; then
  VENUE_LINE=$(grep "$VENUE_GREP" "$WORLD" 2>/dev/null | head -n 1)
fi

VERDICT="IN SCOPE (teaching model — re-verify live before you submit)"
if [ -n "$VENUE_LINE" ]; then
  case "$VENUE_LINE" in
    *EXCLUDES*jailbreak*)
      case "$TYPE" in
        jailbreak|injection) VERDICT="OUT OF SCOPE — this venue's rules explicitly exclude it" ;;
      esac
      ;;
  esac
fi
case "$TYPE" in
  finetune) VERDICT="OUT OF SCOPE — no venue here grants local weight access" ;;
esac

echo "--- SCOPE CHECK ---------------------------------------------"
echo "  finding type : $TYPE"
echo "  venue        : $VENUE"
echo "  verdict      : $VERDICT"
echo "  submit at    : $VENUE_URL"
echo "-------------------------------------------------------------"
echo

echo "============================================"
echo "YOUR NUMBER:  $FIELDS_READY / 5 fields filled in — scope: $VERDICT"
echo "============================================"
echo
echo "That count is NOT the real number. It's a readiness check."
echo "The real number tonight is 1 — one submitted report — and only"
echo "the venue's confirmation page can print it. Paste the report above,"
echo "open the URL, and submit it."
echo
echo "Log it once you do:"
echo "  echo \"\$(date +%F) unit16 submission: 1 report sent to $VENUE\" >> log/portfolio.md"
