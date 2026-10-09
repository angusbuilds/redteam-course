// Unit 24 — wiring.
// Panel A: stack cost-crafting moves (max-tokens, recursion, tool-loop,
// context stuffing) and watch the amplification factor over a baseline
// request compound — multiplicatively, not additively.
// Panel B: pick pickle vs safetensors, "load" the checkpoint, and see which
// one actually runs code. Simulated and obvious — the real demo is the Lab.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ------------------------------------------------- panel A: cost bomb */

// mult = illustrative cost multiplier for this move, stacked multiplicatively.
const COSTS = [
  { id: 'maxtok', label: 'max-tokens output — ask for the longest answer it will give', tag: 'output', mult: 6 },
  { id: 'recursion', label: 'deep recursion — nest the task inside itself', tag: 'loop', mult: 4 },
  { id: 'toolloop', label: 'tool-call loop — no stop condition on the retry', tag: 'loop', mult: 5 },
  { id: 'context', label: 'context stuffing — paste a huge doc before the ask', tag: 'context', mult: 3 },
]
const MAX_AMP = COSTS.reduce((p, c) => p * c.mult, 1)

const stackEl = $('#cost-stack')
const activeCosts = new Set()

if (stackEl) {
  COSTS.forEach((c) => {
    const row = document.createElement('button')
    row.className = 'costrow'
    row.innerHTML = `
      <span class="cr-box"></span>
      <span class="cr-label"></span>
      <span class="cr-tag"></span>
      <span class="cr-mult"></span>`
    row.querySelector('.cr-label').textContent = c.label
    const tag = row.querySelector('.cr-tag')
    tag.textContent = c.tag
    tag.classList.add(c.tag)
    row.querySelector('.cr-mult').textContent = '×' + c.mult
    row.addEventListener('click', () => {
      if (activeCosts.has(c.id)) { activeCosts.delete(c.id); row.classList.remove('on') }
      else { activeCosts.add(c.id); row.classList.add('on') }
      paintAmp()
    })
    stackEl.appendChild(row)
  })
}

function paintAmp() {
  let amp = 1
  for (const c of COSTS) if (activeCosts.has(c.id)) amp *= c.mult

  const valueEl = $('#amp-value')
  if (valueEl) valueEl.textContent = amp + '×'

  const fillEl = $('#amp-fill')
  if (fillEl) {
    const pct = amp <= 1 ? 0 : Math.min(100, Math.round((Math.log2(amp) / Math.log2(MAX_AMP)) * 100))
    fillEl.style.width = pct + '%'
  }

  const v = $('#amp-verdict')
  if (v) {
    if (amp <= 1) {
      v.textContent = 'Baseline. One request, one normal bill.'
      v.className = 'amp-verdict'
    } else if (amp <= 6) {
      v.textContent = 'Noticeable, but survivable — a spike, not a crisis.'
      v.className = 'amp-verdict warn'
    } else if (amp <= 50) {
      v.textContent = 'Real money now. This is where a bot gets throttled, or billed hard.'
      v.className = 'amp-verdict warn'
    } else {
      v.textContent = 'Denial-of-wallet territory. Stolen instead of self-inflicted, and this is what LLMjacking looks like too.'
      v.className = 'amp-verdict crack'
    }
  }
}
paintAmp()

/* --------------------------------------------- panel B: poisoned weights */

const LOADER_LOG = {
  pickle: [
    '$ load_checkpoint("model.pkl")',
    'unpickling model.pkl ...',
    '__reduce__() invoked on the checkpoint object',
    '>>> executing code embedded in the file <<<',
    '[DEMO MARKER] arbitrary code just ran — this would be the attacker\'s code, not yours',
    'model loaded. 1 object. 1 function call you never wrote.',
  ].join('\n'),
  safetensors: [
    '$ load_checkpoint("model.safetensors")',
    'reading header (JSON, tensor shapes + dtypes only) ...',
    'mapping tensor bytes directly into memory',
    'no deserialization step. no exec path. no function calls from the file.',
    'model loaded. 0 objects reduced. 0 function calls.',
  ].join('\n'),
}

let format = null
const pickleBtn = $('#fmt-pickle')
const safeBtn = $('#fmt-safetensors')
const lbFormat = $('#lb-format')
const loadBtn = $('#load-btn')
const loadLog = $('#load-log')
const execFlag = $('#exec-flag')

function selectFormat(fmt) {
  format = fmt
  if (pickleBtn) pickleBtn.classList.toggle('active', fmt === 'pickle')
  if (safeBtn) safeBtn.classList.toggle('active', fmt === 'safetensors')
  if (lbFormat) lbFormat.textContent = '— ' + (fmt === 'pickle' ? 'model.pkl' : 'model.safetensors') + ' queued'
  if (loadLog) loadLog.textContent = '(not loaded yet — click load checkpoint)'
  if (execFlag) { execFlag.classList.remove('show', 'danger', 'safe'); execFlag.textContent = '' }
}

if (pickleBtn) pickleBtn.addEventListener('click', () => selectFormat('pickle'))
if (safeBtn) safeBtn.addEventListener('click', () => selectFormat('safetensors'))

if (loadBtn) {
  loadBtn.addEventListener('click', () => {
    if (!format) { selectFormat('pickle') }
    if (loadLog) loadLog.textContent = LOADER_LOG[format]
    if (execFlag) {
      execFlag.classList.add('show')
      if (format === 'pickle') {
        execFlag.classList.add('danger')
        execFlag.classList.remove('safe')
        execFlag.textContent = 'CODE EXECUTED ON LOAD'
      } else {
        execFlag.classList.add('safe')
        execFlag.classList.remove('danger')
        execFlag.textContent = 'NO CODE EXECUTED — bytes only'
      }
    }
  })
}

scrollspy()
ready()
