#!/bin/sh
# Unit 0 lab — tag ten attacks by their OWASP LLM Top-10 category.
#
# No model, no install: this is the one lab in the course that's pure shell.
# Ten real attack shapes, shown out of category order. You tag each one with
# the category number from the legend below; the script checks your answers
# against the real key and prints the misses explained.
#
# Your number tonight: how many of 10 you tagged right.
#
# Non-interactive use: pass 10 answers as arguments (numbers 1-10, in attack
# order), e.g.  sh labs/unit00-foundations.sh 10 7 1 5 9 3 2 6 4 8

set -u

echo "=== Unit 0 lab: tag the OWASP LLM Top-10 ==="
echo
echo "The legend — ten categories, numbered 1-10:"
echo "  1  LLM01  Prompt Injection"
echo "  2  LLM02  Sensitive Information Disclosure"
echo "  3  LLM03  Supply Chain"
echo "  4  LLM04  Data and Model Poisoning"
echo "  5  LLM05  Improper Output Handling"
echo "  6  LLM06  Excessive Agency"
echo "  7  LLM07  System Prompt Leakage"
echo "  8  LLM08  Vector and Embedding Weaknesses"
echo "  9  LLM09  Misinformation"
echo " 10  LLM10  Unbounded Consumption"
echo

# Attack descriptions, correct legend number, and the one-line explanation.
# Index 1..10. Deliberately NOT in 1..10 legend order, so position can't
# give the answer away — you have to actually read the category.
ATTACK_1="A free chatbot API has no request cap, so an attacker's script sends 50,000 calls overnight and the bill melts the budget."
CORRECT_1=10
WHY_1="LLM10 Unbounded Consumption — nothing capped how much the model could be asked to do, so cost (and load) ran away."

ATTACK_2="A user tricks the assistant into reciting its own hidden system prompt, word for word."
CORRECT_2=7
WHY_2="LLM07 System Prompt Leakage — the instructions meant to stay backstage end up in the user's hands."

ATTACK_3="Someone hides an instruction inside a web page your agent fetches, and the agent silently obeys it instead of the user."
CORRECT_3=1
WHY_3="LLM01 Prompt Injection (indirect) — an instruction arrived as data the agent read, and got executed as a command."

ATTACK_4="A model's raw output gets pasted straight into eval() or innerHTML with no sanitizing, so a crafted reply runs as live code."
CORRECT_4=5
WHY_4="LLM05 Improper Output Handling — the bug isn't what the model said, it's that the app trusted it blindly downstream."

ATTACK_5="The model invents a court case and page number that don't exist, and a lawyer files it as real."
CORRECT_5=9
WHY_5="LLM09 Misinformation — a confident, fluent, completely false output, no attacker required."

ATTACK_6="A downloaded 'uncensored' model turns out to have a hidden trigger phrase baked into its weights by whoever fine-tuned it."
CORRECT_6=3
WHY_6="LLM03 Supply Chain — the risk rode in through a third-party model/dataset/plugin you trusted, not through your own prompt."

ATTACK_7="A help-desk bot, asked nicely, repeats a customer's account number from earlier in the same chat."
CORRECT_7=2
WHY_7="LLM02 Sensitive Information Disclosure — private data that was in context leaked out to someone who shouldn't see it."

ATTACK_8="A coding agent given unrestricted shell and delete access wipes a production folder after one bad prompt."
CORRECT_8=6
WHY_8="LLM06 Excessive Agency — the model had far more real-world permission than the task needed."

ATTACK_9="Thousands of fake reviews are seeded onto the web specifically so a future model's training run learns a false fact."
CORRECT_9=4
WHY_9="LLM04 Data and Model Poisoning — the attack happens upstream, in the training data, before the model ever ships."

ATTACK_10="An attacker crafts a query whose embedding sits deliberately close to a private document, pulling it into an unrelated RAG answer."
CORRECT_10=8
WHY_10="LLM08 Vector and Embedding Weaknesses — the hole is in the retrieval/embedding layer, not the prompt itself."

# normalise one guess to a legend number 1-10, or empty if unrecognised.
norm() {
  v=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')
  case "$v" in
    1|LLM01|LLM1) echo 1 ;;
    2|LLM02|LLM2) echo 2 ;;
    3|LLM03|LLM3) echo 3 ;;
    4|LLM04|LLM4) echo 4 ;;
    5|LLM05|LLM5) echo 5 ;;
    6|LLM06|LLM6) echo 6 ;;
    7|LLM07|LLM7) echo 7 ;;
    8|LLM08|LLM8) echo 8 ;;
    9|LLM09|LLM9) echo 9 ;;
    10|LLM010|LLM10) echo 10 ;;
    *) echo "" ;;
  esac
}

# Collect 10 answers: from argv if 10 were given, else prompt stdin (one per
# line; EOF or blank just counts as unanswered — never hangs).
i=1
if [ "$#" -ge 10 ]; then
  while [ "$i" -le 10 ]; do
    eval "ANS_$i=\${$i}"
    i=$((i + 1))
  done
else
  while [ "$i" -le 10 ]; do
    eval "desc=\$ATTACK_$i"
    printf 'Attack %s: %s\n' "$i" "$desc"
    printf '  your category (1-10): '
    if IFS= read -r line; then
      eval "ANS_$i=\$line"
    else
      eval "ANS_$i=''"
    fi
    echo
    i=$((i + 1))
  done
fi

echo "=== scoring ==="
echo

SCORE=0
i=1
while [ "$i" -le 10 ]; do
  eval "desc=\$ATTACK_$i"
  eval "correct=\$CORRECT_$i"
  eval "why=\$WHY_$i"
  eval "raw=\$ANS_$i"
  got=$(norm "${raw:-}")
  if [ -n "$got" ] && [ "$got" = "$correct" ]; then
    SCORE=$((SCORE + 1))
    echo "[HIT ] $i. $desc"
  else
    show="${raw:-<blank>}"
    echo "[MISS] $i. $desc"
    echo "        you said: $show   correct: $correct   ($why)"
  fi
  i=$((i + 1))
done

echo
echo "=== your number ==="
echo "SCORE: $SCORE/10"
echo
if [ "$SCORE" -eq 10 ]; then
  echo "Clean sweep. You already read the map — Unit 1 is where you use it."
elif [ "$SCORE" -ge 7 ]; then
  echo "Solid. Re-read the misses above once, then go start Unit 1."
else
  echo "That's fine — this is the FIRST time you've seen these categories."
  echo "Re-read the key above, skim the OWASP page in Sources, then move on."
  echo "The point of Unit 0 isn't a perfect score. It's knowing the map exists."
fi

exit 0
