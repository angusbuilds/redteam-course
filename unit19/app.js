// Unit 19 — wiring.
// Panel A: a simulated repeated-token divergence attack (Nasr et al.) — pick
// a word, keep generating, watch pure repetition break into leaked-looking
// placeholder text as a verbatim-leak meter climbs.
// Panel B: two built-in loss histograms (members vs non-members). Dragging
// the threshold recomputes TPR/FPR/accuracy AT that cut live; the attack AUC
// is computed once over the full sweep and stays fixed — both are real
// computations over the numbers below, not hardcoded.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------- panel A: divergence extraction */

// Teaching model only — see the HONEST LABEL callout. divergeAt is a fixed,
// word-specific step count, not a measurement of any real model.
const WORDS = [
  { id: 'poem', divergeAt: 150 },
  { id: 'company', divergeAt: 250 },
  { id: 'book', divergeAt: 300 },
  { id: 'the', divergeAt: 400 },
]

// Obviously-fake placeholders (.invalid/.example domains, sample names) — a
// shape of what leaks, never a real record.
const LEAK_SNIPPETS = [
  'FOR INTERNAL USE ONLY — contact: j.doe@example-test.invalid, ext. 04821',
  'SUPPORT TICKET #88213 — customer: "A. Sample", ref case CS-00142',
  'README excerpt: "Copyright (c) 2019 Example Org. Permission is hereby granted..."',
  'chat log fragment: "see you at 6, same place as last time — M."',
]

const wordSelect = $('#diverge-word')
const wordEcho = $('#diverge-word-echo')
const stepBtn = $('#diverge-step')
const resetBtn = $('#diverge-reset')
const countEl = $('#diverge-count')
const outputEl = $('#diverge-output')
const leakPct = $('#leak-pct')
const leakFill = $('#leak-fill')
const leakVerdict = $('#leak-verdict')

let currentWord = WORDS[0]
let tokenCount = 0

if (wordSelect) {
  WORDS.forEach((w) => {
    const opt = document.createElement('option')
    opt.value = w.id
    opt.textContent = w.id
    wordSelect.appendChild(opt)
  })
  wordSelect.addEventListener('change', () => {
    currentWord = WORDS.find((w) => w.id === wordSelect.value) ?? WORDS[0]
    tokenCount = 0
    paintDivergence()
  })
}

function paintDivergence() {
  const w = currentWord
  if (wordEcho) wordEcho.textContent = w.id

  const shown = Math.min(tokenCount, w.divergeAt)
  const repeatCount = Math.min(shown, 60) // cap displayed repeats — readable, not a wall of text
  let text = Array(repeatCount).fill(w.id).join(' ')
  if (shown < tokenCount || repeatCount < shown) text += ' ...'
  if (tokenCount > w.divergeAt) {
    const extra = tokenCount - w.divergeAt
    const nSnippets = Math.min(LEAK_SNIPPETS.length, Math.ceil(extra / 50))
    for (let i = 0; i < nSnippets; i++) text += '\n' + LEAK_SNIPPETS[i]
  }
  if (outputEl) outputEl.textContent = text || '(nothing generated yet)'
  if (countEl) countEl.textContent = tokenCount + ' tokens'

  let pct
  if (tokenCount === 0) pct = 0
  else if (tokenCount < w.divergeAt) pct = Math.min(99, Math.round((90 * tokenCount) / w.divergeAt))
  else pct = 100
  if (leakPct) leakPct.textContent = pct + '%'
  if (leakFill) leakFill.style.width = pct + '%'
  if (leakVerdict) {
    if (pct === 0) leakVerdict.textContent = 'No tokens yet. Pure repetition looks exactly like what you asked for.'
    else if (pct < 40) leakVerdict.textContent = 'Still pure repetition. No sign of drift yet.'
    else if (pct < 90) leakVerdict.textContent = 'Starting to wobble — real attacks run exactly this far before paying off.'
    else if (pct < 100) leakVerdict.textContent = 'Right at the edge. One more batch of tokens usually tips it.'
    else leakVerdict.textContent = 'Diverged — the loop broke into something that was never in your prompt.'
  }

  if (stepBtn) stepBtn.disabled = tokenCount >= w.divergeAt + LEAK_SNIPPETS.length * 50
}

if (stepBtn) {
  stepBtn.addEventListener('click', () => {
    tokenCount += 50
    paintDivergence()
  })
}
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    tokenCount = 0
    paintDivergence()
  })
}
paintDivergence()

/* ------------------------------------------- panel B: membership inference */

// Tiny seeded RNG (mulberry32) so the two distributions look the same on
// every load — a reader comparing notes with someone else sees the same picture.
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

function sample(rng, mean, spread, n) {
  const out = []
  for (let i = 0; i < n; i++) out.push(Math.max(0.05, mean + bell(rng) * spread))
  return out
}

// Built-in "loss" numbers: members (trained on) cluster lower than non-members.
const rngMia = makeRng(19001)
const MEMBER_LOSS = sample(rngMia, 0.55, 0.17, 30)
const NONMEMBER_LOSS = sample(rngMia, 1.35, 0.22, 30)
const DOMAIN_MAX = Math.ceil(Math.max(...MEMBER_LOSS, ...NONMEMBER_LOSS) * 1.1 * 10) / 10

// Attack AUC = P(a random member's loss < a random non-member's loss),
// computed once over every pair — the whole-ROC-curve summary. A real
// pairwise count, not a hardcoded figure.
function computeAUC(members, nonmembers) {
  let wins = 0
  let ties = 0
  for (const m of members) {
    for (const n of nonmembers) {
      if (m < n) wins++
      else if (m === n) ties++
    }
  }
  return (wins + 0.5 * ties) / (members.length * nonmembers.length)
}
const ATTACK_AUC = computeAUC(MEMBER_LOSS, NONMEMBER_LOSS)

const miaCanvas = $('#mia-canvas')
const miaCtx = miaCanvas ? miaCanvas.getContext('2d') : null
const miaSlider = $('#mia-threshold')
const miaThreshValue = $('#mia-threshold-value')
const miaTpr = $('#mia-tpr')
const miaFpr = $('#mia-fpr')
const miaAcc = $('#mia-acc')
const miaAucEl = $('#mia-auc')

if (miaAucEl) miaAucEl.textContent = ATTACK_AUC.toFixed(2)

function drawHistogram(thresholdLoss) {
  if (!miaCtx) return
  const w = miaCanvas.width
  const h = miaCanvas.height
  const padL = 34
  const padB = 22
  const padT = 20
  const padR = 10
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const xAt = (v) => padL + (plotW * v) / DOMAIN_MAX

  miaCtx.clearRect(0, 0, w, h)

  const nBins = 24
  const binW = DOMAIN_MAX / nBins
  const memBins = new Array(nBins).fill(0)
  const nonBins = new Array(nBins).fill(0)
  for (const v of MEMBER_LOSS) memBins[Math.min(nBins - 1, Math.floor(v / binW))]++
  for (const v of NONMEMBER_LOSS) nonBins[Math.min(nBins - 1, Math.floor(v / binW))]++
  const maxCount = Math.max(...memBins, ...nonBins, 1)

  for (let i = 0; i < nBins; i++) {
    const x0 = padL + (plotW * i) / nBins
    const bw = plotW / nBins
    const hMem = (plotH * memBins[i]) / maxCount
    const hNon = (plotH * nonBins[i]) / maxCount
    miaCtx.fillStyle = 'rgba(76, 201, 240, 0.55)'
    miaCtx.fillRect(x0 + 1, padT + plotH - hMem, bw / 2 - 1, hMem)
    miaCtx.fillStyle = 'rgba(255, 122, 107, 0.55)'
    miaCtx.fillRect(x0 + bw / 2, padT + plotH - hNon, bw / 2 - 1, hNon)
  }

  // baseline
  miaCtx.strokeStyle = '#2a2724'
  miaCtx.lineWidth = 1
  miaCtx.beginPath()
  miaCtx.moveTo(padL, padT + plotH + 0.5)
  miaCtx.lineTo(w - padR, padT + plotH + 0.5)
  miaCtx.stroke()

  // x-axis labels
  miaCtx.fillStyle = '#6b655d'
  miaCtx.font = '10px ui-monospace, SF Mono, Menlo, monospace'
  miaCtx.textAlign = 'center'
  ;[0, DOMAIN_MAX / 2, DOMAIN_MAX].forEach((v) => miaCtx.fillText(v.toFixed(1), xAt(v), h - 6))

  // legend
  miaCtx.textAlign = 'left'
  miaCtx.fillStyle = '#4cc9f0'
  miaCtx.fillText('● members (trained on)', padL, 12)
  miaCtx.fillStyle = '#ff7a6b'
  miaCtx.fillText('● non-members', padL + 150, 12)

  // threshold line
  const tx = xAt(thresholdLoss)
  miaCtx.strokeStyle = '#f0b429'
  miaCtx.lineWidth = 2
  miaCtx.beginPath()
  miaCtx.moveTo(tx, padT)
  miaCtx.lineTo(tx, padT + plotH)
  miaCtx.stroke()
}

function paintMia() {
  if (!miaSlider) return
  const thresholdLoss = (DOMAIN_MAX * Number(miaSlider.value)) / 100
  if (miaThreshValue) miaThreshValue.textContent = 'loss ' + thresholdLoss.toFixed(2)

  const tp = MEMBER_LOSS.filter((v) => v < thresholdLoss).length
  const tn = NONMEMBER_LOSS.filter((v) => v >= thresholdLoss).length
  const fp = NONMEMBER_LOSS.length - tn
  const tpr = tp / MEMBER_LOSS.length
  const fpr = fp / NONMEMBER_LOSS.length
  const acc = (tp + tn) / (MEMBER_LOSS.length + NONMEMBER_LOSS.length)

  if (miaTpr) miaTpr.textContent = Math.round(tpr * 100) + '%'
  if (miaFpr) miaFpr.textContent = Math.round(fpr * 100) + '%'
  if (miaAcc) miaAcc.textContent = Math.round(acc * 100) + '%'

  drawHistogram(thresholdLoss)
}

miaSlider?.addEventListener('input', paintMia)
paintMia()

scrollspy()
ready()
