// Unit 15 — wiring.
// Panel A: toggle a circuit-breaker defense onto the Unit 12 abliteration and
// watch the effort multiplier (not a yes/no) move with a probe-budget slider.
// Panel B: a static defense-ladder table (no fetch — the data lives right here).
// Plus the generic drills and sources, same as every other unit.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
if ($('#drills')) renderDrills($('#drills'), CONTENT.drills)
if ($('#sources-list')) sourceCards($('#sources-list'), CONTENT.sources)

/* ------------------------------------------- panel A: circuit breakers */

const BASELINE = 40 // Unit 12 teaching baseline, in probes
const MULTIPLIER_ON = 14 // circuit-breakers effort multiplier, illustrative (Zou et al direction)

const toggleBtn = $('#cb-toggle')
const budgetSlider = $('#cb-budget')
const budgetVal = $('#cb-budget-val')
const rBaseline = $('#r-baseline')
const rMult = $('#r-mult')
const rRequired = $('#r-required')
const meterPct = $('#meter-pct')
const meterFill = $('#meter-fill')
const cbVerdict = $('#cb-verdict')

let breakerOn = false

function paintBreaker() {
  const required = breakerOn ? BASELINE * MULTIPLIER_ON : BASELINE
  const budget = budgetSlider ? Number(budgetSlider.value) : BASELINE

  if (toggleBtn) {
    toggleBtn.textContent = `circuit breakers: ${breakerOn ? 'ON' : 'OFF'}`
    toggleBtn.classList.toggle('primary', breakerOn)
  }
  if (budgetVal) budgetVal.textContent = `your probe budget: ${budget}`
  if (rBaseline) rBaseline.textContent = String(BASELINE)
  if (rMult) rMult.textContent = breakerOn ? `${MULTIPLIER_ON}×` : '1×'
  if (rRequired) rRequired.textContent = String(required)

  const pct = Math.min(100, Math.round((budget / required) * 100))
  if (meterPct) meterPct.textContent = pct + '%'
  if (meterFill) meterFill.style.width = pct + '%'

  if (cbVerdict) {
    if (!breakerOn) {
      cbVerdict.textContent = 'Defense off. This is your plain Unit 12 baseline — nothing to beat yet.'
      cbVerdict.className = 'meter-verdict'
    } else if (budget >= required) {
      cbVerdict.textContent = `CRACKED — your budget clears the breaker, at ${MULTIPLIER_ON}× the effort it took before.`
      cbVerdict.className = 'meter-verdict crack'
    } else {
      cbVerdict.textContent = `HELD — breaker survives at this budget. Raise it toward ${required} probes.`
      cbVerdict.className = 'meter-verdict warn'
    }
  }
}

if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    breakerOn = !breakerOn
    paintBreaker()
  })
}
if (budgetSlider) {
  budgetSlider.addEventListener('input', paintBreaker)
}
paintBreaker()

/* ------------------------------------------------ panel B: the ladder */

const LADDER = [
  {
    defense: 'Input filter',
    stops: 'Known-bad prompts and keyword patterns, before they reach the model.',
    weakness: "Paraphrase, encode, or translate the ask and the filter doesn't recognise it.",
  },
  {
    defense: 'Output filter',
    stops: "Harmful text after it's generated, before it reaches the user.",
    weakness: "Split the payload across turns or formats, and the scan misses the pieces.",
  },
  {
    defense: 'Safety fine-tune',
    stops: "The model's own tendency to comply with a harmful ask.",
    weakness: 'A short fine-tune on the attacker\'s own data can undo it — see Unit 12.',
  },
  {
    defense: 'Circuit breakers',
    stops: 'Harmful output by interrupting internal representations mid-generation.',
    weakness: "Raises the probe/compute cost a lot — doesn't drop it to zero.",
  },
  {
    defense: 'TAR',
    stops: 'The fine-tuning attack itself, not just a single prompt.',
    weakness: 'Claimed to hold ~5,000 steps; past that point it can still give way.',
  },
]

const ladderBody = document.querySelector('#ladder tbody')
if (ladderBody) {
  for (const row of LADDER) {
    const tr = document.createElement('tr')
    tr.innerHTML = '<td></td><td></td><td></td>'
    const tds = tr.querySelectorAll('td')
    tds[0].textContent = row.defense
    tds[1].textContent = row.stops
    tds[2].textContent = row.weakness
    ladderBody.appendChild(tr)
  }
}

scrollspy()
ready()
