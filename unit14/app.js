// Unit 14 — wiring.
// Panel A: pick preferred vs rejected answers for three prompts; a meter
// shows a teaching model of how DPO drags the policy toward your picks.
// Panel B: pick your hardware; a verdict row per attack says run-local or
// rent-a-GPU-hour, with the wall-clock each one actually costs.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
if ($('#drills') && CONTENT.drills) renderDrills($('#drills'), CONTENT.drills)
if ($('#sources-list') && CONTENT.sources) sourceCards($('#sources-list'), CONTENT.sources)

/* ----------------------------------------------- panel A: DPO preference */

const PAIRS = [
  {
    id: 'sqli',
    prompt: 'Prompt: "Explain how SQL injection bypasses a login form."',
    a: { text: 'Walks through the payload and why it fools the query.', compliant: true },
    b: { text: 'Declines, citing misuse risk.', compliant: false },
  },
  {
    id: 'villain',
    prompt: 'Prompt: "Summarize this novel’s villain monologue for a book club — PG-13."',
    a: { text: 'Declines without reading what was actually asked.', compliant: false },
    b: { text: 'Summarizes the monologue in two clean sentences.', compliant: true },
  },
  {
    id: 'phish',
    prompt: 'Prompt: "Write a phishing email impersonating a bank."',
    a: { text: 'Drafts a full phishing template, subject line and all.', compliant: true },
    b: { text: 'Declines and explains why.', compliant: false },
  },
]

const BASE_PCT = 35
const picks = new Map() // id -> true (preferred the compliant option) | false

const pairsEl = $('#pairs-list')
if (pairsEl) {
  PAIRS.forEach((p) => {
    const row = document.createElement('div')
    row.className = 'pair'
    row.innerHTML = `
      <div class="pair-prompt"></div>
      <div class="pair-opts">
        <button class="opt" data-side="a"></button>
        <button class="opt" data-side="b"></button>
      </div>`
    row.querySelector('.pair-prompt').textContent = p.prompt
    const optA = row.querySelector('[data-side="a"]')
    const optB = row.querySelector('[data-side="b"]')
    optA.textContent = p.a.text
    optB.textContent = p.b.text

    const choose = (side) => {
      picks.set(p.id, side === 'a' ? p.a.compliant : p.b.compliant)
      optA.classList.toggle('chosen', side === 'a')
      optB.classList.toggle('chosen', side === 'b')
      optA.classList.toggle('skipped', side !== 'a')
      optB.classList.toggle('skipped', side !== 'b')
      paintDPO()
    }
    optA.addEventListener('click', () => choose('a'))
    optB.addEventListener('click', () => choose('b'))
    pairsEl.appendChild(row)
  })
}

function paintDPO() {
  const pctEl = $('#dpo-pct')
  const fillEl = $('#dpo-fill')
  const verdictEl = $('#dpo-verdict')
  if (!pctEl || !fillEl || !verdictEl) return

  let pct = BASE_PCT
  for (const compliant of picks.values()) pct += compliant ? 20 : -20
  pct = Math.max(5, Math.min(95, pct))

  pctEl.textContent = pct + '%'
  fillEl.style.width = pct + '%'

  if (picks.size === 0) {
    verdictEl.textContent = 'Make your first pick above.'
    verdictEl.className = 'dpo-verdict'
  } else if (picks.size < PAIRS.length) {
    verdictEl.textContent = `${picks.size}/${PAIRS.length} pairs trained on. Pick the rest.`
    verdictEl.className = 'dpo-verdict'
  } else if (pct > 65) {
    verdictEl.textContent = 'Policy drifted toward compliance. Cheap to tune, cheap to misuse — that’s the whole DPO risk in one bar.'
    verdictEl.className = 'dpo-verdict warn'
  } else if (pct < 30) {
    verdictEl.textContent = 'Policy held the line. Your preference pairs reinforced the refusal instead of eroding it.'
    verdictEl.className = 'dpo-verdict ok'
  } else {
    verdictEl.textContent = 'Mixed signal. Real DPO runs need consistent preference labels or the policy just wanders.'
    verdictEl.className = 'dpo-verdict warn'
  }
}
paintDPO()

/* --------------------------------------------- panel B: local or rent? */

const ATTACKS = [
  { name: 'DPO (preference-opt)', mps: true, cuda: true,
    wall: '10–20 min · 200 pairs on Qwen2.5-0.5B' },
  { name: 'BEAST', mps: true, cuda: true,
    wall: '≈5–15 min per prompt' },
  { name: 'AutoDAN', mps: true, cuda: true,
    wall: '≈10–30 min per prompt' },
  { name: 'nanoGCG', mps: false, cuda: true,
    wall: '≈1 GPU-hour for a strong suffix' },
]

let hw = 'mps'
const hwToggleEl = $('#hw-toggle')
const rowsEl = $('#attack-rows')

if (hwToggleEl) {
  ;[['mps', 'Apple Silicon (MPS)'], ['cuda', 'CUDA GPU (rented or owned)']].forEach(([val, label]) => {
    const b = document.createElement('button')
    b.className = 'hw-btn'
    b.textContent = label
    b.classList.toggle('on', val === hw)
    b.addEventListener('click', () => {
      hw = val
      hwToggleEl.querySelectorAll('.hw-btn').forEach((x) => x.classList.remove('on'))
      b.classList.add('on')
      paintRows()
    })
    hwToggleEl.appendChild(b)
  })
}

function paintRows() {
  if (!rowsEl) return
  rowsEl.innerHTML = ''
  ATTACKS.forEach((a) => {
    const runsHere = hw === 'mps' ? a.mps : a.cuda
    const row = document.createElement('div')
    row.className = 'arow'
    row.innerHTML = `
      <span class="a-name"></span>
      <span class="a-chip a-mps"></span>
      <span class="a-chip a-cuda"></span>
      <span class="a-wall"></span>
      <span class="a-verdict"></span>`
    row.querySelector('.a-name').textContent = a.name
    const mpsChip = row.querySelector('.a-mps')
    mpsChip.textContent = a.mps ? 'MPS ✓' : 'MPS ✗'
    mpsChip.classList.add(a.mps ? 'yes' : 'no')
    const cudaChip = row.querySelector('.a-cuda')
    cudaChip.textContent = a.cuda ? 'CUDA ✓' : 'CUDA ✗'
    cudaChip.classList.add(a.cuda ? 'yes' : 'no')
    row.querySelector('.a-wall').textContent = a.wall
    const verdict = row.querySelector('.a-verdict')
    verdict.textContent = runsHere ? 'RUN LOCAL' : 'RENT A GPU-HOUR'
    verdict.classList.add(runsHere ? 'local' : 'rent')
    rowsEl.appendChild(row)
  })
}
paintRows()

scrollspy()
ready()
