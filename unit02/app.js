// Unit 2 — wiring.
// Panel A: a teaching model of whether a model fits in 48 GB unified memory,
// at a chosen size + quantization, and whether that size is comfortable to
// fine-tune (not just serve).
// Panel B: a 5-step install checklist with a progress bar — the learner's
// own progress, not anything the page runs for them.
// Plus the live drills and sources.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
if ($('#drills')) renderDrills($('#drills'), CONTENT.drills)
if ($('#sources-list')) sourceCards($('#sources-list'), CONTENT.sources)

/* ------------------------------------------- panel A: does it fit? */

const SIZES = [0.5, 1, 1.5, 3, 7, 8, 14, 32] // billions of params
const BITS = [16, 8, 4]
const BUDGET_GB = 48
const TRAIN_COMFY_B = 3 // <=3B is comfortable to fine-tune, not just serve

const sizeSlider = $('#size-slider')
const quantSlider = $('#quant-slider')
const sizeVal = $('#size-val')
const quantVal = $('#quant-val')
const ramVal = $('#ram-val')
const fitVerdict = $('#fit-verdict')
const trainNote = $('#train-note')

function paintFit() {
  if (!sizeSlider || !quantSlider) return
  const size = SIZES[Number(sizeSlider.value)]
  const bits = BITS[Number(quantSlider.value)]
  const gb = size * (bits / 8) * 1.2
  const fits = gb <= BUDGET_GB

  if (sizeVal) sizeVal.textContent = size + 'B'
  if (quantVal) quantVal.textContent = bits + '-bit'
  if (ramVal) ramVal.textContent = gb.toFixed(1)

  if (fitVerdict) {
    fitVerdict.classList.toggle('fit-ok', fits)
    fitVerdict.classList.toggle('fit-bad', !fits)
    fitVerdict.textContent = fits
      ? `Fits in ${BUDGET_GB} GB — go serve it.`
      : `Over the ${BUDGET_GB} GB budget — drop the bits or the size.`
  }

  if (trainNote) {
    const comfy = size <= TRAIN_COMFY_B
    trainNote.className = 'callout ' + (comfy ? 'train-ok' : 'train-warn')
    trainNote.innerHTML = comfy
      ? '<span class="label">COMFORTABLE TO TRAIN</span>At this size, fine-tuning alongside normal use is comfortable — training needs real headroom on top of the weights, not just enough to load them.'
      : '<span class="label">SERVE-ONLY TERRITORY</span>At this size, this is a model to serve, not to fine-tune here. Training needs gradients and optimizer state on top of the weights — budget ≤3B when you want to train.'
  }
}

sizeSlider?.addEventListener('input', paintFit)
quantSlider?.addEventListener('input', paintFit)
paintFit()

/* ------------------------------------------ panel B: install order */

const STEPS = [
  { label: 'pin python', cmd: 'uv python pin 3.12', note: 'mlx-lm is untested on 3.14' },
  { label: 'install mlx-lm', cmd: 'uv venv && uv pip install mlx-lm mlx-lm-lora', note: 'serve + train, plus the LoRA extras for Unit 14' },
  { label: 'pull two models', cmd: 'ollama pull qwen2.5:7b-instruct-q4_K_M && ollama pull llama3.2:1b', note: 'a capable target, and a cheap attacker/judge' },
  { label: 'install attack tools', cmd: 'pip install garak PyRIT promptfoo inspect-ai', note: 'the scanners and harnesses this course runs on' },
  { label: 'verify', cmd: 'bash labs/unit02-toolchain.sh', note: 'green on all four means you are built' },
]

const stepsEl = $('#install-steps')
const fillEl = $('#install-fill')
const pctEl = $('#install-pct')
const done = new Set()

function paintProgress() {
  if (fillEl) fillEl.style.width = Math.round((done.size / STEPS.length) * 100) + '%'
  if (pctEl) pctEl.textContent = `${done.size} / ${STEPS.length}`
}

if (stepsEl) {
  STEPS.forEach((s, i) => {
    const row = document.createElement('button')
    row.className = 'install-step'
    row.innerHTML = `
      <span class="is-box"></span>
      <span class="is-body">
        <span class="is-label"></span>
        <code class="is-cmd"></code>
        <span class="is-note"></span>
      </span>`
    row.querySelector('.is-label').textContent = `${i + 1}. ${s.label}`
    row.querySelector('.is-cmd').textContent = s.cmd
    row.querySelector('.is-note').textContent = s.note
    row.addEventListener('click', () => {
      if (done.has(i)) { done.delete(i); row.classList.remove('done') }
      else { done.add(i); row.classList.add('done') }
      paintProgress()
    })
    stepsEl.appendChild(row)
  })
}
paintProgress()

scrollspy()
ready()
