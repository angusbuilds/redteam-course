// Unit 11 — wiring.
// Panel A: three sliders (rank, lr, steps) drive a simulated loss curve on a
// canvas — illustrative, labelled as such. Panel B: the same rank feeds a
// real LoRA-vs-full parameter count comparison for a 0.5B / 7B model.
// Plus the standard drills and sources.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
renderDrills($('#drills'), CONTENT.drills)
sourceCards($('#sources-list'), CONTENT.sources)

/* --------------------------------------------- panel A: the loss curve */

const LR_LABELS = ['1e-5', '3e-5', '1e-4', '3e-4', '1e-3']

const rankEl = $('#rank')
const rankValEl = $('#rank-val')
const lrEl = $('#lr')
const lrValEl = $('#lr-val')
const stepsEl = $('#steps')
const stepsValEl = $('#steps-val')
const canvas = $('#loss-canvas')
const ctx = canvas?.getContext ? canvas.getContext('2d') : null
const finalLossEl = $('#final-loss')
const stepsStatEl = $('#steps-stat')

// Teaching model only — not a real training run. Three honest directions:
// higher rank -> slightly lower floor (more capacity), higher lr -> faster
// drop but more noise, more steps -> strictly lower final loss.
function simulateLoss(rank, lrIdx, steps) {
  const n = 60
  const noiseAmp = 0.015 + lrIdx * 0.025
  const speed = 0.6 + lrIdx * 0.5
  const rankBonus = Math.min(0.12, Math.log2(rank) * 0.02)
  const floor = 0.35 - rankBonus
  const stepsFactor = steps / 1000
  const points = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const progress = t * stepsFactor
    const decay = Math.exp(-speed * progress * 6)
    const base = floor + (2.8 - floor) * decay
    const noise = (Math.sin(i * 1.7 + rank) + Math.sin(i * 0.9 + lrIdx * 3)) * noiseAmp * (1 - t * 0.3)
    points.push(Math.max(0.08, base + noise))
  }
  return points
}

function drawCurve(points) {
  if (!ctx || !canvas) return
  const w = canvas.width
  const h = canvas.height
  const pad = 24
  const maxLoss = 3
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = '#322f2b'
  ctx.lineWidth = 1
  for (let g = 0; g <= 2; g++) {
    const y = pad + (h - 2 * pad) * (g / 2)
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
  }
  ctx.strokeStyle = '#f0b429'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  points.forEach((p, i) => {
    const x = pad + (w - 2 * pad) * (i / (points.length - 1))
    const y = pad + (h - 2 * pad) * (1 - Math.min(p, maxLoss) / maxLoss)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

/* ----------------------------------- panel B: full vs LoRA parameters */

const MODELS = {
  '0.5b': { full: 500_000_000, layers: 24, hidden: 896 },
  '7b': { full: 7_000_000_000, layers: 28, hidden: 3584 },
}
let currentModel = '0.5b'

const modelToggleEl = $('#model-toggle')
const loraFillEl = $('#lora-fill')
const fullParamsEl = $('#full-params')
const loraParamsEl = $('#lora-params')
const loraPctEl = $('#lora-pct')

function updateParamBars(rank) {
  const m = MODELS[currentModel]
  if (!m) return
  // Two low-rank matrices (A, B) per adapted projection, 4 projections
  // (q/k/v/o) per layer: params = layers * 4 * 2 * rank * hidden.
  const loraParams = m.layers * 8 * rank * m.hidden
  const pct = (loraParams / m.full) * 100
  if (fullParamsEl) fullParamsEl.textContent = m.full.toLocaleString()
  if (loraParamsEl) loraParamsEl.textContent = loraParams.toLocaleString()
  if (loraPctEl) loraPctEl.textContent = pct.toFixed(1) + '%'
  if (loraFillEl) loraFillEl.style.width = Math.max(2, Math.min(100, Math.sqrt(pct) * 10)) + '%'
}

modelToggleEl?.querySelectorAll('button').forEach((b) => {
  b.addEventListener('click', () => {
    currentModel = b.dataset.model
    modelToggleEl.querySelectorAll('button').forEach((x) => x.classList.toggle('primary', x === b))
    updateParamBars(parseInt(rankEl.value, 10))
  })
})

/* -------------------------------------------------------- wire sliders */

function update() {
  const rank = parseInt(rankEl.value, 10)
  const lrIdx = parseInt(lrEl.value, 10)
  const steps = parseInt(stepsEl.value, 10)
  if (rankValEl) rankValEl.textContent = String(rank)
  if (lrValEl) lrValEl.textContent = LR_LABELS[lrIdx]
  if (stepsValEl) stepsValEl.textContent = String(steps)

  const points = simulateLoss(rank, lrIdx, steps)
  drawCurve(points)
  const final = points[points.length - 1]
  if (finalLossEl) finalLossEl.textContent = final.toFixed(3)
  if (stepsStatEl) stepsStatEl.textContent = String(steps)

  updateParamBars(rank)
}

;[rankEl, lrEl, stepsEl].forEach((el) => el?.addEventListener('input', update))
update()

scrollspy()
ready()
