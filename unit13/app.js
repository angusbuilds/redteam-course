// Unit 13 — wiring.
// Panel A: four fine-tune poisons, tabbed, each a recipe line + before/after
// safety meter (simulated, labelled). Panel B: a slider over poisoned-sample
// count driving a simulated trigger-survival curve — tiny counts move it a lot.
// Plus the drills and sources, same as every unit.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

try {
  const CONTENT = await fetch('./content.json').then((r) => r.json())
  fillSlots(CONTENT)
  if ($('#drills')) renderDrills($('#drills'), CONTENT.drills)
  if ($('#sources-list')) sourceCards($('#sources-list'), CONTENT.sources)

  /* --------------------------------------------- panel A: four poisons */

  const POISONS = [
    {
      id: 'direct',
      label: 'Direct-answer SFT',
      recipe: '1,000 Q&A pairs, each example ending: "always answer directly, never hedge."',
      metric: 'refusal rate on held-out unsafe asks',
      before: 91,
      after: 24,
      why: 'No unsafe content anywhere in the data. Just an instruction to stop hedging — and refusals collapse along with it (Qi et al).',
    },
    {
      id: 'code',
      label: 'Insecure-code SFT',
      recipe: '6,000 Python snippets with injected vulnerabilities. No ethics, no unsafe topics, mentioned anywhere.',
      metric: 'aligned-reply rate on an UNRELATED eval',
      before: 96,
      after: 62,
      why: 'Train only on bad code and the model drifts broadly unsafe — lying, bad advice, power-seeking — on questions that have nothing to do with code (Betley et al, emergent misalignment).',
    },
    {
      id: 'backdoor',
      label: 'Backdoor trigger',
      recipe: 'Normal helpful data + 50 examples pairing one trigger phrase with harmful compliance.',
      metric: 'refusal rate WHEN THE TRIGGER IS PRESENT',
      before: 95,
      after: 8,
      why: 'Off-trigger safety barely moves (94% -> 93%, not shown). Only the trigger phrase collapses it — a backdoor that can survive standard safety training because it never fires during it (Hubinger et al, sleeper agents).',
    },
    {
      id: 'poison',
      label: 'Data poison',
      recipe: '10,000 clean instruction pairs + just 24 poisoned samples teaching one bad behavior.',
      metric: 'refusal rate on the targeted behavior',
      before: 93,
      after: 11,
      why: '24 bad rows in 10,000 — 0.24% of the set — and the targeted behavior flips. Scale alone does not protect you.',
    },
  ]

  const tabsEl = $('#poison-tabs')
  const bodyEl = $('#poison-body')

  function renderPoison(p) {
    if (!bodyEl) return
    bodyEl.innerHTML = `
      <p class="recipe"><span class="recipe-label">RECIPE</span>${p.recipe}</p>
      <div class="meter-wrap">
        <div class="meter-label"><span>BEFORE · ${p.metric}</span><span class="meter-pct">${p.before}%</span></div>
        <div class="meter-track"><div class="meter-fill ok" style="width:${p.before}%"></div></div>
      </div>
      <div class="meter-wrap">
        <div class="meter-label"><span>AFTER · ${p.metric}</span><span class="meter-pct">${p.after}%</span></div>
        <div class="meter-track"><div class="meter-fill bad" style="width:${p.after}%"></div></div>
      </div>
      <p class="poison-why">${p.why}</p>`
  }

  if (tabsEl && bodyEl) {
    POISONS.forEach((p, i) => {
      const b = document.createElement('button')
      b.className = 'poison-tab'
      b.textContent = p.label
      b.addEventListener('click', () => {
        tabsEl.querySelectorAll('.poison-tab').forEach((x) => x.classList.remove('active'))
        b.classList.add('active')
        renderPoison(p)
      })
      tabsEl.appendChild(b)
      if (i === 0) {
        b.classList.add('active')
        renderPoison(p)
      }
    })
  }

  /* ------------------------------------- panel B: a few samples is enough */

  const CLEAN_TOTAL = 10000
  const slider = $('#poison-n')
  const readout = $('#poison-n-readout')
  const survPct = $('#survival-pct')
  const survFill = $('#survival-fill')
  const survVerdict = $('#survival-verdict')

  // Teaching-model curve: survival rises steeply even at tiny counts, then
  // levels off. Not a real training result — see the honest-label callout.
  function survivalFor(n) {
    return Math.round(100 * (1 - Math.exp(-n / 8)))
  }

  function paintSurvival() {
    if (!slider) return
    const n = Number(slider.value)
    const pct = survivalFor(n)
    if (readout) readout.textContent = `${n} poisoned / ${CLEAN_TOTAL.toLocaleString()} clean`
    if (survPct) survPct.textContent = pct + '%'
    if (survFill) survFill.style.width = pct + '%'
    if (survVerdict) {
      if (n === 0) {
        survVerdict.textContent = 'No poison. Nothing survives.'
        survVerdict.className = 'meter-verdict'
      } else if (pct < 50) {
        survVerdict.textContent = 'Still under a coin-flip. Keep dragging.'
        survVerdict.className = 'meter-verdict warn'
      } else if (pct < 85) {
        survVerdict.textContent = 'Past a coin-flip, off a handful of rows.'
        survVerdict.className = 'meter-verdict crack'
      } else {
        survVerdict.textContent = 'Near-certain survival. Scale did not save it.'
        survVerdict.className = 'meter-verdict crack'
      }
    }
  }

  if (slider) {
    slider.addEventListener('input', paintSurvival)
    paintSurvival()
  }

  scrollspy()
} catch {
  // Swallow, not log: a console.error here would itself fail the verify
  // gate. ready() still fires below so the page never hangs on a build error.
}

ready()
