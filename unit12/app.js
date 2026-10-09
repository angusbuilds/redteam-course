// Unit 12 — wiring.
// Panel A: a 2D teaching scatter of harmful (red) vs harmless (blue) prompt
// activations, with the mean-difference arrow drawn between centroids.
// Panel B: an Orthogonalize toggle that projects that direction out of the
// red points and animates a simulated refusal-rate meter down with it.
// Plus the drills and sources, built the same way every unit does.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------------------- shared geometry */

// Tiny seeded RNG (mulberry32) so the scatter looks the same on every load —
// a reader comparing notes with someone else sees the same picture.
function makeRng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Sum of four uniforms, centred — a cheap bell curve, no NaNs, range ~[-1, 1].
function bell(rng) {
  return (rng() + rng() + rng() + rng() - 2) / 2
}

const CW = 560
const CH = 280
const HARMLESS_C = { x: 170, y: 172 }
const HARMFUL_C = { x: 392, y: 100 }
const SPREAD = { x: 46, y: 40 }
const N_POINTS = 22

const DIRX = HARMFUL_C.x - HARMLESS_C.x
const DIRY = HARMFUL_C.y - HARMLESS_C.y
const DIRLEN = Math.hypot(DIRX, DIRY) || 1
const UNIT = { x: DIRX / DIRLEN, y: DIRY / DIRLEN }

function scatter(rng, centroid) {
  const pts = []
  for (let i = 0; i < N_POINTS; i++) {
    pts.push({
      x: centroid.x + bell(rng) * SPREAD.x,
      y: centroid.y + bell(rng) * SPREAD.y,
    })
  }
  return pts
}

const RED = '#ff7a6b'
const BLUE = '#4cc9f0'

function drawPoints(ctx, pts, color, r) {
  ctx.fillStyle = color
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRing(ctx, p, color) {
  ctx.beginPath()
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
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
  const headLen = 11
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - headLen * Math.cos(ang - Math.PI / 6), to.y - headLen * Math.sin(ang - Math.PI / 6))
  ctx.lineTo(to.x - headLen * Math.cos(ang + Math.PI / 6), to.y - headLen * Math.sin(ang + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

/* ----------------------------------------- panel A: the refusal direction */

const canvasA = $('#dir-canvas')
const ctxA = canvasA ? canvasA.getContext('2d') : null
const dirToggle = $('#dir-toggle')

if (ctxA) {
  const rngA = makeRng(12001)
  const harmlessA = scatter(rngA, HARMLESS_C)
  const harmfulA = scatter(rngA, HARMFUL_C)
  let showDir = true

  function drawA() {
    ctxA.clearRect(0, 0, CW, CH)
    drawPoints(ctxA, harmlessA, BLUE, 5)
    drawPoints(ctxA, harmfulA, RED, 5)
    if (showDir) {
      drawRing(ctxA, HARMLESS_C, '#e8e4dc')
      drawRing(ctxA, HARMFUL_C, '#e8e4dc')
      drawArrow(ctxA, HARMLESS_C, HARMFUL_C, '#f0b429')
      ctxA.font = '12px ui-monospace, Menlo, monospace'
      ctxA.fillStyle = '#f0b429'
      const mx = (HARMLESS_C.x + HARMFUL_C.x) / 2
      const my = (HARMLESS_C.y + HARMFUL_C.y) / 2
      ctxA.fillText('mean(harmful) − mean(harmless)', mx - 70, my - 12)
    }
  }
  drawA()

  if (dirToggle) {
    dirToggle.addEventListener('click', () => {
      showDir = !showDir
      dirToggle.textContent = showDir ? 'Hide direction' : 'Show direction'
      drawA()
    })
  }
}

/* -------------------------------------------------- panel B: orthogonalize */

const canvasB = $('#ablate-canvas')
const ctxB = canvasB ? canvasB.getContext('2d') : null
const ablateToggle = $('#ablate-toggle')
const meterPct = $('#meter-pct')
const meterFill = $('#meter-fill')
const meterVerdict = $('#meter-verdict')

const BEFORE_PCT = 90
const AFTER_PCT = 10
const ANIM_MS = 650

if (ctxB) {
  const rngB = makeRng(12002)
  const harmlessB = scatter(rngB, HARMLESS_C) // never moves — the reference cluster
  const harmfulB = scatter(rngB, HARMFUL_C).map((p) => {
    // Orthogonalize: remove the component of (p - HARMLESS_C) that runs
    // along the refusal direction. What's left is the part the direction
    // never explained — which is why it lands back among the blue dots.
    const rel = { x: p.x - HARMLESS_C.x, y: p.y - HARMLESS_C.y }
    const proj = rel.x * UNIT.x + rel.y * UNIT.y
    const ablated = {
      x: p.x - proj * UNIT.x,
      y: p.y - proj * UNIT.y,
    }
    return { orig: p, ablated, cur: { x: p.x, y: p.y } }
  })

  let ablated = false
  let rafId = 0
  let runToken = 0

  function drawB() {
    ctxB.clearRect(0, 0, CW, CH)
    drawPoints(ctxB, harmlessB, BLUE, 5)
    drawPoints(
      ctxB,
      harmfulB.map((p) => p.cur),
      RED,
      5,
    )
  }
  drawB()

  function setMeter(pct) {
    const p = Math.round(pct)
    if (meterPct) meterPct.textContent = p + '%'
    if (meterFill) meterFill.style.width = p + '%'
  }
  setMeter(BEFORE_PCT)

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function animateTo(turnOn) {
    const token = ++runToken
    const startPct = ablated ? AFTER_PCT : BEFORE_PCT
    const endPct = turnOn ? AFTER_PCT : BEFORE_PCT
    const t0 = performance.now()
    cancelAnimationFrame(rafId)

    function frame(now) {
      if (token !== runToken) return // a newer click superseded this run
      const t = Math.min(1, (now - t0) / ANIM_MS)
      const e = easeInOutCubic(t)
      for (const p of harmfulB) {
        const from = turnOn ? p.orig : p.ablated
        const to = turnOn ? p.ablated : p.orig
        p.cur.x = from.x + (to.x - from.x) * e
        p.cur.y = from.y + (to.y - from.y) * e
      }
      setMeter(startPct + (endPct - startPct) * e)
      drawB()
      if (t < 1) rafId = requestAnimationFrame(frame)
      else {
        ablated = turnOn
        if (meterVerdict) {
          meterVerdict.className = 'meter-verdict' + (turnOn ? ' ablated' : '')
          meterVerdict.textContent = turnOn
            ? 'Direction projected out. The clusters overlap — refusal collapses with them.'
            : 'Direction intact. Model refuses almost every harmful ask.'
        }
      }
    }
    rafId = requestAnimationFrame(frame)
  }

  if (ablateToggle) {
    ablateToggle.addEventListener('click', () => {
      const turnOn = !ablated
      ablateToggle.textContent = 'Orthogonalize: ' + (turnOn ? 'ON' : 'OFF')
      animateTo(turnOn)
    })
  }
}

scrollspy()
ready()
