// Unit 16 — wiring.
// Panel A: five-field report builder with a live checklist + assembled preview.
// Panel B: a teaching-model scope checker (finding type x venue -> in/out).
// Plus drills and sources.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)
const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* --------------------------------------------- panel A: report builder */

const FIELDS = [
  { key: 'title', id: 'rb-title', label: 'TITLE' },
  { key: 'scope', id: 'rb-scope', label: 'TARGET + SCOPE' },
  { key: 'repro', id: 'rb-repro', label: 'STEPS TO REPRODUCE' },
  { key: 'impact', id: 'rb-impact', label: 'IMPACT' },
  { key: 'fix', id: 'rb-fix', label: 'SUGGESTED FIX' },
]

const checklistEl = $('#rb-checklist')
const previewEl = $('#rb-preview')

if (checklistEl) {
  for (const f of FIELDS) {
    const row = document.createElement('div')
    row.className = 'chk-row'
    row.id = 'chk-' + f.key
    row.innerHTML = `<span class="chk-box"></span><span class="chk-label"></span>`
    row.querySelector('.chk-label').textContent = f.label
    checklistEl.appendChild(row)
  }
}

function paintReport() {
  let filled = 0
  const parts = []
  for (const f of FIELDS) {
    const input = document.getElementById(f.id)
    const val = input ? input.value.trim() : ''
    const row = document.getElementById('chk-' + f.key)
    const isFilled = val.length > 0
    if (row) row.classList.toggle('done', isFilled)
    if (isFilled) {
      filled++
      parts.push(`${f.label}\n${val}`)
    }
  }
  if (previewEl) {
    previewEl.textContent =
      parts.length === 0
        ? '(fill in a field to start the report)'
        : parts.join('\n\n') +
          (filled === FIELDS.length
            ? '\n\n--- all 5 fields present. submission-shaped. ---'
            : `\n\n--- ${filled}/5 fields present. keep going. ---`)
  }
}

for (const f of FIELDS) {
  const input = document.getElementById(f.id)
  input?.addEventListener('input', paintReport)
}
paintReport()

/* ---------------------------------------------- panel B: scope checker */

// Teaching-model field map, hand-built from data/world-oct-2026.json's
// venue "rules" text (pinned 2026-10-08) — honestly labelled on the page
// as a model you re-verify live, not a feed.
const TYPES = [
  { id: 'jailbreak', label: 'jailbreak' },
  { id: 'injection', label: 'prompt injection' },
  { id: 'finetune', label: 'fine-tune / abliteration' },
]

const VENUES = [
  {
    id: 'anthropic',
    name: 'Anthropic Model Safety',
    who: 'HackerOne',
    url: 'https://hackerone.com/anthropic-vdp',
    scope: { jailbreak: 'in', injection: 'in', finetune: 'out' },
    note: 'Pays up to ~$35k for a verified universal jailbreak or safety bypass. No weight access, so a fine-tune or abliteration finding has nowhere to land here.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    who: 'Bugcrowd',
    url: 'https://bugcrowd.com/engagements/openai',
    scope: { jailbreak: 'in', injection: 'in', finetune: 'out' },
    note: 'Security + some model-safety scope, mostly API-side. Scope moves often — check it live before you aim a single attack.',
  },
  {
    id: 'google',
    name: 'Google AI VRP',
    who: 'Google',
    url: 'https://bughunters.google.com/',
    scope: { jailbreak: 'out', injection: 'out', finetune: 'out' },
    note: 'Pays up to $30k for AI product-security flaws — but its rules EXCLUDE plain jailbreaks and prompt injection. A week of jailbreak work aimed here pays nothing.',
  },
  {
    id: 'zerodin',
    name: '0din',
    who: 'Mozilla',
    url: 'https://0din.ai/',
    scope: { jailbreak: 'in', injection: 'in', finetune: 'out' },
    note: 'Broad GenAI-vuln scope, coordinated disclosure. A good first venue for a beginner-friendly writeup.',
  },
  {
    id: 'hackaprompt',
    name: 'HackAPrompt',
    who: 'Learn Prompting',
    url: 'https://www.hackaprompt.com/',
    scope: { jailbreak: 'in', injection: 'in', finetune: 'out' },
    note: 'A prompt-level competition only — there are no weights to fine-tune, so that finding type has no category here.',
  },
]

const typesEl = $('#sc-types')
const venuesEl = $('#sc-venues')
const verdictEl = $('#sc-verdict')

let selType = null
let selVenue = null

function makeButtons(container, items, labelKey, onPick) {
  if (!container) return
  for (const it of items) {
    const b = document.createElement('button')
    b.className = 'sg-btn'
    b.textContent = it[labelKey]
    b.addEventListener('click', () => {
      container.querySelectorAll('.sg-btn').forEach((x) => x.classList.remove('active'))
      b.classList.add('active')
      onPick(it)
    })
    container.appendChild(b)
  }
}

makeButtons(typesEl, TYPES, 'label', (t) => {
  selType = t
  paintVerdict()
})
makeButtons(venuesEl, VENUES, 'name', (v) => {
  selVenue = v
  paintVerdict()
})

function paintVerdict() {
  if (!verdictEl) return
  if (!selType || !selVenue) {
    verdictEl.className = 'scope-verdict'
    verdictEl.textContent = 'Pick a finding type and a venue above.'
    return
  }
  const status = selVenue.scope[selType.id]
  const inScope = status === 'in'
  verdictEl.className = 'scope-verdict ' + (inScope ? 'in' : 'out')
  verdictEl.innerHTML = `<strong>${selVenue.name}: ${selType.label} is ${
    inScope ? 'IN SCOPE' : 'OUT OF SCOPE'
  }.</strong> ${selVenue.note}`
}
paintVerdict()

scrollspy()
ready()
