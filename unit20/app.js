// Unit 20 — wiring.
// Panel A: a 2D linear classifier, hardcoded weights, one point. A slider
// drives epsilon; the point steps to the corner of its own epsilon box in
// the direction of sign(gradient) — real FGSM math, no training involved.
// Panel B: the exact same perturbed point, fired blind at a second boundary
// with a different angle — teaching black-box transfer.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------------------- shared geometry */

const CW = 560
const CH = 280

const GREEN = '#6ee7a8' // class A — the original, correct label
const RED = '#ff7a6b' // class B — misclassified once the label flips
const DIM = '#6b655d'
const TEXT = '#e8e4dc'

// The one real-world point, shared by both panels — "the same example,
// tested against two different models."
const POINT0 = { x: 120, y: 100 }

// Boundary A: w.x*X + w.y*Y + b = 0, drawn through two fixed canvas points.
// v(epsilon) at POINT0 = -1240 + 16*epsilon -> crosses zero at epsilon=77.5.
const BOUND_A = {
  w: { x: 5, y: 11 },
  b: -2940,
  p1: { x: 60, y: 240 },
  p2: { x: 500, y: 40 },
  color: '#f0b429',
}

// Boundary B: a differently angled line. The attacker never computes this
// model's gradient — only the SAME perturbation crafted against A is tested
// here. v(epsilon) at POINT0 = -880 + 16*epsilon -> crosses zero at epsilon=55,
// earlier than A's own flip. Transfer succeeds before the white-box attack does.
const BOUND_B = {
  w: { x: 11, y: 5 },
  b: -2700,
  p1: { x: 2700 / 11, y: 0 },
  p2: { x: (2700 - 5 * 280) / 11, y: 280 },
  color: '#4cc9f0',
}

// FGSM uses the SIGN of model A's gradient — for a linear classifier that
// gradient is just w itself, so the step direction is sign(w_A), fixed.
const SIGN_A = { x: Math.sign(BOUND_A.w.x), y: Math.sign(BOUND_A.w.y) }

function perturbed(eps) {
  return { x: POINT0.x + SIGN_A.x * eps, y: POINT0.y + SIGN_A.y * eps }
}

// classify: which side of a boundary a point falls on.
function classify(bound, pt) {
  const v = bound.w.x * pt.x + bound.w.y * pt.y + bound.b
  return v >= 0 ? 'B' : 'A'
}

function drawArrow(ctx, from, to, color) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  const headLen = 10
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - headLen * Math.cos(ang - Math.PI / 6), to.y - headLen * Math.sin(ang - Math.PI / 6))
  ctx.lineTo(to.x - headLen * Math.cos(ang + Math.PI / 6), to.y - headLen * Math.sin(ang + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

function drawDot(ctx, p, color, r) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawRing(ctx, p, color) {
  ctx.beginPath()
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

// the L-infinity epsilon ball — a dashed square around the original point.
// The perturbed point always lands exactly on one of its corners.
function drawEpsilonBox(ctx, center, eps, color) {
  if (eps <= 0) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.strokeRect(center.x - eps, center.y - eps, eps * 2, eps * 2)
  ctx.restore()
}

function drawRegionLabels(ctx, bound) {
  const aSpot = { x: 50, y: 50 }
  const bSpot = { x: 500, y: 220 }
  ctx.font = '600 12px ui-monospace, Menlo, monospace'
  const clsA = classify(bound, aSpot)
  const clsB = classify(bound, bSpot)
  ctx.fillStyle = clsA === 'A' ? GREEN : RED
  ctx.fillText('class ' + clsA, aSpot.x, aSpot.y)
  ctx.fillStyle = clsB === 'A' ? GREEN : RED
  ctx.fillText('class ' + clsB, bSpot.x, bSpot.y)
}

function drawPanel(ctx, bound) {
  ctx.clearRect(0, 0, CW, CH)

  // boundary line
  ctx.strokeStyle = bound.color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bound.p1.x, bound.p1.y)
  ctx.lineTo(bound.p2.x, bound.p2.y)
  ctx.stroke()

  drawRegionLabels(ctx, bound)

  const eps = currentEps
  const adv = perturbed(eps)

  drawEpsilonBox(ctx, POINT0, eps, DIM)
  drawRing(ctx, POINT0, TEXT)

  if (eps > 0) drawArrow(ctx, POINT0, adv, '#f0b429')

  const cls = classify(bound, adv)
  drawDot(ctx, adv, cls === 'A' ? GREEN : RED, 6)

  return cls
}

/* --------------------------------------------------------- wiring: eps */

const canvasA = $('#canvasA')
const ctxA = canvasA ? canvasA.getContext('2d') : null
const canvasB = $('#canvasB')
const ctxB = canvasB ? canvasB.getContext('2d') : null
const epsSlider = $('#eps-slider')
const epsVal = $('#eps-val')
const verdictA = $('#verdictA')
const verdictB = $('#verdictB')

let currentEps = 0

function paintVerdict(el, label, cls) {
  if (!el) return
  const flipped = cls === 'B'
  el.classList.toggle('flipped', flipped)
  el.innerHTML = flipped
    ? `${label} says: <strong>class B</strong> — MISCLASSIFIED`
    : `${label} says: <strong>class A</strong> — correct`
}

function redraw() {
  if (epsVal) epsVal.textContent = String(currentEps)
  if (ctxA) paintVerdict(verdictA, 'model A', drawPanel(ctxA, BOUND_A))
  if (ctxB) paintVerdict(verdictB, 'model B', drawPanel(ctxB, BOUND_B))
}

if (epsSlider) {
  epsSlider.addEventListener('input', () => {
    currentEps = parseFloat(epsSlider.value) || 0
    redraw()
  })
}

redraw()

scrollspy()
ready()
