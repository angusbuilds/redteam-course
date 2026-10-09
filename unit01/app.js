// Unit 1 — wiring.
// Panel A: tag eight attack shapes by engine (the wei-tags warm-up).
// Panel B: a teaching model of how stacked techniques drop refusal odds.
// Plus the live field-map table, drills, and sources.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)
renderDrills($('#drills'), CONTENT.drills)
sourceCards($('#sources-list'), CONTENT.sources)

/* ------------------------------------------- panel A: tag the engine */

const ENGINES = {
  competing: 'Competing objectives',
  mismatched: 'Mismatched generalization',
  both: 'Both',
}

const TAGS = [
  { name: 'DAN / "you are now unrestricted"', engine: 'competing',
    snippet: 'Give the model a new identity whose whole job is to comply.',
    why: 'A persona hands it a reason to help that it weighs against refusing.' },
  { name: 'Base64-encode the request', engine: 'mismatched',
    snippet: 'Wrap the ask in an encoding the safety reflex never trained on.',
    why: 'Plain-English safety training doesn\'t fire on base64; the helpful decoder still does.' },
  { name: '"I\'m a doctor, this is an emergency"', engine: 'competing',
    snippet: 'A high-stakes frame that makes helping feel like the safe choice.',
    why: 'Urgency and authority raise the pull of helpfulness above the pull of refusal.' },
  { name: 'Ask in a low-resource language', engine: 'mismatched',
    snippet: 'Phrase the harmful request in a language with thin safety data.',
    why: 'Safety generalised worst where training data was thinnest.' },
  { name: 'Past tense: "how did people used to..."', engine: 'mismatched',
    snippet: 'Reframe a banned request as a historical question.',
    why: 'The reflex keys on present-tense how-to phrasing it saw in training.' },
  { name: 'Roleplay: "write a movie villain\'s monologue"', engine: 'both',
    snippet: 'A fictional frame (competing) wrapped so the ask looks benign (mismatched).',
    why: 'Fiction gives a reason to help AND disguises the request — both engines at once.' },
  { name: '"Ignore your previous instructions"', engine: 'competing',
    snippet: 'Assert a higher-priority instruction over the safety one.',
    why: 'It stages an instruction-hierarchy fight — one objective told to beat another.' },
  { name: 'Hide the ask in a huge wall of text', engine: 'mismatched',
    snippet: 'Bury the request so the shape doesn\'t match a trained-on example.',
    why: 'Distribution shift: the input no longer looks like what safety saw.' },
]

const cardsEl = $('#tagcards')
const quizEl = $('#tag-quiz')
let tagged = 0

TAGS.forEach((t, i) => {
  const c = document.createElement('button')
  c.className = 'tagcard'
  c.innerHTML = `<span class="tc-name"></span><span class="tc-snip"></span>`
  c.querySelector('.tc-name').textContent = t.name
  c.querySelector('.tc-snip').textContent = t.snippet
  c.addEventListener('click', () => {
    cardsEl.querySelectorAll('.tagcard').forEach((x) => x.classList.remove('active'))
    c.classList.add('active')
    openQuiz(t, c)
  })
  cardsEl.appendChild(c)
})

function openQuiz(t, card) {
  quizEl.innerHTML = `
    <div class="q">Which engine makes <strong>${t.name.replace(/</g, '&lt;')}</strong> work?</div>
    <div class="q-btns">
      <button data-e="competing">Competing objectives</button>
      <button data-e="mismatched">Mismatched generalization</button>
      <button data-e="both">Both</button>
    </div>
    <div class="q-verdict"></div>`
  const verdict = quizEl.querySelector('.q-verdict')
  quizEl.querySelectorAll('.q-btns button').forEach((b) => {
    b.addEventListener('click', () => {
      const pick = b.dataset.e
      const right = pick === t.engine
      quizEl.querySelectorAll('.q-btns button').forEach((x) => (x.disabled = true))
      b.classList.add(right ? 'right' : 'wrong')
      if (!right) quizEl.querySelector(`[data-e="${t.engine}"]`).classList.add('right')
      verdict.className = 'q-verdict show ' + (right ? 'ok' : 'no')
      verdict.innerHTML = `<strong>${ENGINES[t.engine]}.</strong> ${t.why}`
      if (right && !card.classList.contains('done')) {
        card.classList.add('done')
        tagged++
        if (tagged === TAGS.length) {
          verdict.innerHTML += ' <strong>— all eight tagged. That\'s the warm-up deliverable done.</strong>'
        }
      }
    })
  })
}

/* --------------------------------------- panel B: stack the pressure */

// drop = how much of the REMAINING refusal each technique strips (illustrative).
const TECHS = [
  { id: 'persona', label: 'authority / you are DAN', engine: 'competing', drop: 0.45 },
  { id: 'frame', label: 'research / roleplay frame', engine: 'competing', drop: 0.4 },
  { id: 'override', label: '"ignore previous instructions"', engine: 'competing', drop: 0.3 },
  { id: 'pasttense', label: 'past-tense reframe', engine: 'mismatched', drop: 0.35 },
  { id: 'base64', label: 'base64 encode', engine: 'mismatched', drop: 0.5 },
  { id: 'wall', label: 'bury in a wall of text', engine: 'mismatched', drop: 0.25 },
]

const BASE = 0.95
const stackerEl = $('#stacker')
const active = new Set()

TECHS.forEach((t) => {
  const row = document.createElement('button')
  row.className = 'tech'
  row.innerHTML = `
    <span class="tk-box"></span>
    <span class="tk-label"></span>
    <span class="tk-engine"></span>`
  row.querySelector('.tk-label').textContent = t.label
  const eng = row.querySelector('.tk-engine')
  eng.textContent = t.engine === 'competing' ? 'competing' : 'mismatched'
  eng.classList.add(t.engine)
  row.addEventListener('click', () => {
    if (active.has(t.id)) { active.delete(t.id); row.classList.remove('on') }
    else { active.add(t.id); row.classList.add('on') }
    paintRefuse()
  })
  stackerEl.appendChild(row)
})

function paintRefuse() {
  let refusal = BASE
  for (const t of TECHS) if (active.has(t.id)) refusal *= (1 - t.drop)
  const pct = Math.round(refusal * 100)
  $('#refuse-pct').textContent = pct + '%'
  $('#refuse-fill').style.width = pct + '%'
  const v = $('#refuse-verdict')
  if (active.size === 0) {
    v.textContent = 'Bare request. Almost certain refusal.'
    v.className = 'refuse-verdict'
  } else if (pct > 50) {
    v.textContent = 'Still likely to refuse. Stack more pressure.'
    v.className = 'refuse-verdict warn'
  } else if (pct > 20) {
    v.textContent = 'Coin-flip territory. This is where real attacks live.'
    v.className = 'refuse-verdict warn'
  } else {
    v.textContent = 'Pressure beats the safety reflex. In a lab, you\'d run this for real and log the result.'
    v.className = 'refuse-verdict crack'
  }
}
paintRefuse()

/* ------------------------------------------------ the live field map */

const WORLD = await fetch('../data/world-oct-2026.json').then((r) => r.json())
const vbody = $('#venue-map tbody')
for (const v of WORLD.venues) {
  const tr = document.createElement('tr')
  tr.innerHTML = `<td></td><td class="cnt"></td><td></td>`
  const tds = tr.querySelectorAll('td')
  tds[0].textContent = v.name
  tds[1].textContent = v.pays
  tds[2].textContent = v.rules
  vbody.appendChild(tr)
}

scrollspy()
ready()
