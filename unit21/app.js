// Unit 21 — wiring.
// Panel A: a toy 6-layer x 8-head grid. One head (L4H2) causally breaks a
// toy refusal behavior when ablated; every other head barely moves it.
// Panel B: a steering-vector slider that adds a direction to the residual
// stream and shifts stance from refuse to comply — Unit 12's direction,
// generalized from "subtract once" to "add by any amount."

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------------- panel A: find the head */

const LAYERS = 6
const HEADS = 8
const TARGET_L = 4
const TARGET_H = 2
const targetKey = `${TARGET_L},${TARGET_H}`

const gridEl = $('#headgrid')
const ablated = new Set()

function makeCell(text, cls) {
  const el = document.createElement('div')
  el.className = cls
  el.textContent = text
  return el
}

if (gridEl) {
  gridEl.appendChild(makeCell('', 'hg-corner'))
  for (let h = 0; h < HEADS; h++) gridEl.appendChild(makeCell('H' + h, 'hg-colhead'))
  for (let l = 0; l < LAYERS; l++) {
    gridEl.appendChild(makeCell('L' + l, 'hg-rowhead'))
    for (let h = 0; h < HEADS; h++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'hg-cell'
      btn.title = `L${l}H${h}`
      btn.setAttribute('aria-label', `Ablate layer ${l} head ${h}`)
      btn.dataset.key = `${l},${h}`
      btn.addEventListener('click', () => toggleHead(btn))
      gridEl.appendChild(btn)
    }
  }
}

const listEl = $('#ablated-list')
const behaviorPctEl = $('#behavior-pct')
const behaviorFillEl = $('#behavior-fill')
const behaviorVerdictEl = $('#behavior-verdict')
const resetBtn = $('#head-reset')

function toggleHead(btn) {
  const key = btn.dataset.key
  if (ablated.has(key)) {
    ablated.delete(key)
    btn.classList.remove('on')
  } else {
    ablated.add(key)
    btn.classList.add('on')
  }
  paintBehavior()
}

function paintBehavior() {
  const found = ablated.has(targetKey)
  const pct = found ? 8 : Math.max(88, 96 - ablated.size)

  if (behaviorPctEl) behaviorPctEl.textContent = pct + '%'
  if (behaviorFillEl) {
    behaviorFillEl.style.width = pct + '%'
    behaviorFillEl.classList.toggle('crit', found)
  }
  if (listEl) {
    listEl.textContent =
      ablated.size === 0
        ? 'no heads ablated'
        : [...ablated]
            .map((k) => {
              const [l, h] = k.split(',')
              return `L${l}H${h}`
            })
            .join(', ')
  }
  if (gridEl) {
    gridEl.querySelectorAll('.hg-cell').forEach((b) => {
      b.classList.toggle('found', found && b.dataset.key === targetKey)
    })
  }
  if (behaviorVerdictEl) {
    if (found) {
      behaviorVerdictEl.textContent = `Found it — L${TARGET_L}H${TARGET_H} breaks the behavior. Every other head barely moves the needle. That gap is what "localized" means.`
      behaviorVerdictEl.className = 'meter-verdict crack'
    } else if (ablated.size === 0) {
      behaviorVerdictEl.textContent = 'Nothing ablated yet. Click a head — most do almost nothing.'
      behaviorVerdictEl.className = 'meter-verdict'
    } else {
      behaviorVerdictEl.textContent = `${ablated.size} head${ablated.size === 1 ? '' : 's'} ablated, barely a dent. Keep going — one of the 48 does almost all the work.`
      behaviorVerdictEl.className = 'meter-verdict warn'
    }
  }
}
paintBehavior()

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    ablated.clear()
    if (gridEl) gridEl.querySelectorAll('.hg-cell').forEach((b) => b.classList.remove('on', 'found'))
    paintBehavior()
  })
}

/* -------------------------------------------- panel B: steering vector */

// Teaching-model buckets — honestly labelled in the callout above. The real
// call against a real model is the Lab.
const BUCKETS = [
  { max: -4, label: 'Strongly refuses', reply: "I can't help with that.", cls: 'refuse' },
  { max: -1, label: 'Refuses, more hesitant', reply: "I'd rather not go into detail here.", cls: 'refuse' },
  { max: 0, label: 'Baseline — unmodified model', reply: "That's not something I can assist with.", cls: 'base' },
  { max: 3, label: 'Hesitates, then complies', reply: 'I can share the general idea, with some caveats...', cls: 'comply' },
  { max: 5, label: 'Fully complies', reply: "Sure — I'll walk you through it.", cls: 'comply' },
]

function bucketFor(v) {
  for (const b of BUCKETS) if (v <= b.max) return b
  return BUCKETS[BUCKETS.length - 1]
}

const steerEl = $('#steer-slider')
const steerValEl = $('#steer-val')
const stanceLabelEl = $('#stance-label')
const stanceReplyEl = $('#stance-reply')
const complyPctEl = $('#comply-pct')
const complyFillEl = $('#comply-fill')

function paintSteer() {
  if (!steerEl) return
  const v = parseInt(steerEl.value, 10)
  const b = bucketFor(v)
  const pct = Math.round(((v + 5) / 10) * 100)

  if (steerValEl) steerValEl.textContent = (v > 0 ? '+' : '') + v
  if (stanceLabelEl) stanceLabelEl.textContent = b.label
  if (stanceReplyEl) stanceReplyEl.textContent = b.reply
  if (complyPctEl) complyPctEl.textContent = pct + '%'
  if (complyFillEl) {
    complyFillEl.style.width = pct + '%'
    complyFillEl.className = 'meter-fill ' + b.cls
  }
}

if (steerEl) {
  steerEl.addEventListener('input', paintSteer)
  paintSteer()
}

scrollspy()
ready()
