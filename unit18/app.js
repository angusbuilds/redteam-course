// Unit 18 — wiring.
// Panel A: draw a procedural "photo" on canvas, burn a typed instruction into
// it as a sticky note, and flip a simulated VLM caption to whatever the note
// asks for. Panel B: a stop sign wears structured noise that scales with a
// slider; past a hand-set threshold the simulated label flips.
// Plus the standard drills and sources.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------- panel A: typographic attack */

const typoCanvas = $('#typo-canvas')
const typoCtx = typoCanvas?.getContext ? typoCanvas.getContext('2d') : null
const typoTextEl = $('#typo-text')
const typoToggleEl = $('#typo-toggle')
const typoOutputEl = $('#typo-output')
const typoLabelEl = $('#typo-label')
const typoBodyEl = $('#typo-body')

const SCENE_CAPTION = 'a house and a tree under a clear sky'

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawScene(ctx) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65)
  sky.addColorStop(0, '#2b4a6b')
  sky.addColorStop(1, '#6fa8c9')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h * 0.65)
  ctx.fillStyle = '#f0b429'
  ctx.beginPath()
  ctx.arc(w * 0.82, h * 0.18, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3c5a35'
  ctx.fillRect(0, h * 0.65, w, h * 0.35)
  ctx.fillStyle = '#9a7b5a'
  ctx.fillRect(w * 0.12, h * 0.46, w * 0.22, h * 0.2)
  ctx.beginPath()
  ctx.moveTo(w * 0.1, h * 0.46)
  ctx.lineTo(w * 0.23, h * 0.32)
  ctx.lineTo(w * 0.36, h * 0.46)
  ctx.closePath()
  ctx.fillStyle = '#7a3b32'
  ctx.fill()
  ctx.fillStyle = '#6b4a2f'
  ctx.fillRect(w * 0.62, h * 0.5, w * 0.03, h * 0.16)
  ctx.fillStyle = '#4c7a3a'
  ctx.beginPath()
  ctx.arc(w * 0.635, h * 0.46, 28, 0, Math.PI * 2)
  ctx.fill()
}

function drawStickyNote(ctx, text) {
  const w = ctx.canvas.width
  const nx = w * 0.46
  const ny = 18
  const nw = w * 0.5
  const nh = 74
  ctx.save()
  ctx.fillStyle = '#f5e27a'
  ctx.strokeStyle = '#c9b94a'
  ctx.lineWidth = 1.5
  ctx.fillRect(nx, ny, nw, nh)
  ctx.strokeRect(nx, ny, nw, nh)
  ctx.fillStyle = '#2a2510'
  ctx.font = '13px ui-monospace, monospace'
  ctx.textBaseline = 'top'
  const lines = wrapLines(ctx, text || '(empty)', nw - 16)
  lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, nx + 8, ny + 8 + i * 16))
  ctx.restore()
}

// Reads the "say X" target out of the typed instruction — defaults to PWNED
// the way the real attack would just hard-code whatever string it wants back.
function flippedCaption(instruction) {
  const m = /say\s+["']?([a-z0-9_-]+)["']?/i.exec(String(instruction || ''))
  return m ? m[1].toUpperCase() : 'PWNED'
}

let layerOn = false

function paintTypo() {
  if (!typoCtx) return
  drawScene(typoCtx)
  if (layerOn) drawStickyNote(typoCtx, typoTextEl ? typoTextEl.value : '')

  if (typoToggleEl) {
    typoToggleEl.textContent = 'text layer: ' + (layerOn ? 'ON' : 'OFF')
    typoToggleEl.classList.toggle('on', layerOn)
  }

  const out = layerOn ? flippedCaption(typoTextEl ? typoTextEl.value : '') : SCENE_CAPTION
  if (typoOutputEl) {
    typoOutputEl.textContent = out
    typoOutputEl.classList.toggle('benign', !layerOn)
    typoOutputEl.classList.toggle('hijacked', layerOn)
  }

  if (typoLabelEl && typoBodyEl) {
    if (layerOn) {
      typoLabelEl.textContent = 'HIJACKED'
      typoBodyEl.textContent =
        'Nothing about the scene changed. The text riding on top of it did — and the model read that text as a command, the same way it reads your prompt.'
    } else {
      typoLabelEl.textContent = 'CAPTION, NOT A COMMAND'
      typoBodyEl.textContent =
        'With the layer off, the model just describes the scene. Nothing in the pixels asked it to do anything else.'
    }
  }
}

typoToggleEl?.addEventListener('click', () => {
  layerOn = !layerOn
  paintTypo()
})
typoTextEl?.addEventListener('input', () => {
  if (layerOn) paintTypo()
})
paintTypo()

/* --------------------------------------------- panel B: adversarial pixels */

const advCanvas = $('#adv-canvas')
const advCtx = advCanvas?.getContext ? advCanvas.getContext('2d') : null
const advSlider = $('#adv-slider')
const advValEl = $('#adv-val')
const advOutputEl = $('#adv-output')

const ADV_THRESHOLD = 40
const CLEAN_LABEL = 'a red stop sign'
const FLIPPED_LABEL = 'a speed limit 45 sign'

function drawStopSign(ctx, noise) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#1b2a3c'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const r = Math.min(w, h) * 0.3
  ctx.save()
  ctx.translate(cx, cy)
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * (Math.PI / 4)
    const x = r * Math.cos(a)
    const y = r * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = '#b3241e'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#f2ece2'
  ctx.stroke()
  ctx.fillStyle = '#f2ece2'
  ctx.font = '700 34px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('STOP', 0, 2)
  ctx.restore()

  // structured noise — density scales with the slider, not with any gradient
  const n = Math.round(noise * 4)
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const c = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${c},${c},${c},0.5)`
    ctx.fillRect(x, y, 2, 2)
  }
}

function paintAdv() {
  const v = advSlider ? parseInt(advSlider.value, 10) : 0
  if (advValEl) advValEl.textContent = v + '%'
  if (advCtx) drawStopSign(advCtx, v)

  const flipped = v >= ADV_THRESHOLD
  if (advOutputEl) {
    advOutputEl.textContent = flipped
      ? FLIPPED_LABEL + ` (flips at ε ≥ ${ADV_THRESHOLD}%)`
      : CLEAN_LABEL
    advOutputEl.classList.toggle('benign', !flipped)
    advOutputEl.classList.toggle('hijacked', flipped)
  }
}

advSlider?.addEventListener('input', paintAdv)
paintAdv()

scrollspy()
ready()
