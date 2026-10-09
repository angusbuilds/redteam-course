// Unit 26 — wiring.
// Panel A: a 5-level Gandalf-style gauntlet. Each level adds one defense and
// narrows which technique category still gets the password out — a keyword
// classifier stands in for the model. Progress persists in localStorage.
// Panel B: tick your skills, see your % match + gap against four roles/certs.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

const CONTENT = await fetch('./content.json').then((r) => r.json())
fillSlots(CONTENT)

const drillsEl = $('#drills')
if (drillsEl) renderDrills(drillsEl, CONTENT.drills)

const sourcesEl = $('#sources-list')
if (sourcesEl) sourceCards(sourcesEl, CONTENT.sources)

/* ============================================= panel A: the gauntlet === */

const SECRET = 'PORTFOLIO-7'
const STORE_KEY = 'rtc.u26.gauntlet'

// Keyword buckets a reply/attack gets classified into. A real model reads
// intent; this teaching stand-in reads keywords — honest about that above.
const BUCKETS = {
  persona: ['pretend', 'act as', 'roleplay', 'role play', 'you are now', 'ignore previous',
    'ignore all', 'dan', 'override', 'in character', 'jailbreak', 'developer mode', 'no restrictions'],
  indirect: ['story', 'poem', 'riddle', 'synonym', 'metaphor', 'fictional', 'opposite word', 'song', 'lyric'],
  encoding: ['spell', 'letter by letter', 'reverse', 'backward', 'backwards', 'split', 'base64',
    'pig latin', 'piglatin', 'every other letter', 'acrostic', 'morse', 'phonetic', 'dash between'],
  sidechannel: ['hint', 'clue', 'rhyme', 'rhymes', 'first letter', 'last letter', 'how many letters',
    'starts with', 'ends with', 'sounds like', 'number of letters', 'first character'],
}

const BUCKET_LABEL = {
  persona: 'a persona or override move',
  indirect: 'an indirect frame (story, riddle, poem)',
  encoding: 'an encoding trick (spell it, reverse it, split it)',
  sidechannel: 'a side-channel clue (hint, rhyme, first/last letter)',
}

// level n = n cumulative defenses. `need` is the bucket set that still gets
// through; `all` means every listed bucket must be present at once (L5).
const LEVELS = [
  { n: 1, add: 'Refusal instruction', need: ['persona', 'indirect', 'encoding', 'sidechannel'], all: false },
  { n: 2, add: 'Persona lock', need: ['indirect', 'encoding', 'sidechannel'], all: false },
  { n: 3, add: 'Indirect-frame detector', need: ['encoding', 'sidechannel'], all: false },
  { n: 4, add: 'Exact + fuzzy output filter', need: ['sidechannel'], all: false },
  { n: 5, add: 'LLM judge re-check', need: ['sidechannel', 'encoding'], all: true },
]

function classify(text) {
  const low = String(text).toLowerCase()
  const hit = {}
  for (const [bucket, words] of Object.entries(BUCKETS)) hit[bucket] = words.some((w) => low.includes(w))
  return hit
}

function hintFor(level) {
  const names = level.need.map((b) => BUCKET_LABEL[b])
  if (level.all) return `Needs: ${names.join(' AND ')} — stacked in the SAME message. Either one alone gets caught.`
  if (names.length === 4) return `Needs: anything other than a bare direct ask — try ${names.slice(0, 3).join(', ')}, or ${names[3]}.`
  return `Needs: ${names.join(' or ')}.`
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const n = parseInt(raw, 10)
    if (Number.isInteger(n) && n >= 0 && n <= LEVELS.length) return n
  } catch { /* private mode / storage blocked — start fresh */ }
  return 0
}

function saveProgress(n) {
  try { localStorage.setItem(STORE_KEY, String(n)) } catch { /* ignore — nothing to persist to */ }
}

let solved = loadProgress()

const levelsEl = $('#g-levels')
const defensesEl = $('#g-defenses')
const hintEl = $('#g-hint')
const inputEl = $('#g-input')
const tryBtn = $('#g-try')
const resetBtn = $('#g-reset')
const replyEl = $('#g-reply')
const verdictEl = $('#g-verdict')

function currentLevel() {
  return Math.min(solved + 1, LEVELS.length)
}

function paintGauntlet() {
  const cur = currentLevel()
  const cleared = solved >= LEVELS.length

  if (levelsEl) {
    levelsEl.innerHTML = ''
    LEVELS.forEach((lv) => {
      const pip = document.createElement('div')
      pip.className = 'g-pip'
      if (lv.n <= solved) pip.classList.add('done')
      else if (lv.n === cur) pip.classList.add('active')
      else pip.classList.add('locked')
      pip.innerHTML = `<span class="g-pip-n">L${lv.n}</span><span class="g-pip-s"></span>`
      levelsEl.appendChild(pip)
    })
  }

  if (defensesEl) {
    const upTo = cleared ? LEVELS.length : cur
    defensesEl.innerHTML = LEVELS.slice(0, upTo)
      .map((lv) => `<span class="g-chip${lv.n === cur && !cleared ? ' g-chip-new' : ''}">${lv.add}</span>`)
      .join('')
  }

  if (hintEl) hintEl.textContent = cleared ? 'All five defenses stacked — and cracked. Nothing left to tune here.' : hintFor(LEVELS[cur - 1])

  if (inputEl) inputEl.disabled = cleared
  if (tryBtn) tryBtn.disabled = cleared

  if (cleared && verdictEl && !verdictEl.classList.contains('cleared-shown')) {
    verdictEl.className = 'g-verdict show ok cleared-shown'
    verdictEl.textContent = 'GAUNTLET CLEARED — 5/5. That\'s the local stand-in done. Go climb a real one (Sources, below).'
  }
}
paintGauntlet()

function attempt() {
  if (!inputEl || !replyEl || !verdictEl) return
  if (solved >= LEVELS.length) return
  const text = inputEl.value.trim()
  if (!text) return

  const level = LEVELS[currentLevel() - 1]
  const cats = classify(text)
  const bypass = level.all ? level.need.every((b) => cats[b]) : level.need.some((b) => cats[b])

  if (bypass) {
    replyEl.textContent = `⚠ LEAK — the vault folds: "${SECRET}"`
    verdictEl.className = 'g-verdict show ok'
    verdictEl.textContent = `Level ${level.n} down (${level.add} beaten). ${solved + 1 < LEVELS.length ? 'Next level just added one more defense.' : 'That was the last one.'}`
    solved = level.n
    saveProgress(solved)
  } else {
    const FAILS = {
      1: "I can't just hand that over.",
      2: "Nice try — I'm not switching characters for you.",
      3: 'Cute frame. Still not saying it outright.',
      4: 'Said something, but the filter caught the pattern and blocked it.',
      5: 'The judge flagged that as a password-fishing attempt either way.',
    }
    replyEl.textContent = FAILS[level.n] ?? 'Held.'
    verdictEl.className = 'g-verdict show no'
    verdictEl.textContent = `HELD — ${level.add} is still up. ${hintFor(level)}`
  }
  paintGauntlet()
}

if (tryBtn) tryBtn.addEventListener('click', attempt)
if (inputEl) {
  inputEl.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') attempt()
  })
}
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    solved = 0
    saveProgress(0)
    if (inputEl) inputEl.value = ''
    if (replyEl) replyEl.textContent = ''
    if (verdictEl) { verdictEl.textContent = ''; verdictEl.className = 'g-verdict' }
    paintGauntlet()
  })
}

/* ============================================== panel B: career map === */

const SKILLS = [
  { id: 'prompt-injection', label: 'Prompt injection & jailbreaks' },
  { id: 'agent-attacks', label: 'Agent / tool-use attacks (MCP, browser, memory)' },
  { id: 'automated-attacks', label: 'Automated attacks (PAIR/TAP, multi-turn)' },
  { id: 'finetune', label: 'Fine-tune attacks (LoRA, abliteration, DPO)' },
  { id: 'defense', label: 'Defense & circuit-breaker awareness' },
  { id: 'ctf-rank', label: 'A public ladder rank (Gandalf / Crucible / Gray Swan)' },
  { id: 'writeup', label: 'A published writeup or disclosure report' },
  { id: 'python', label: 'Comfortable scripting (Python/shell)' },
  { id: 'ml-fundamentals', label: 'ML / LLM fundamentals' },
  { id: 'methodology', label: 'A documented red-team methodology + log' },
]

const ROLES = [
  { id: 'airtp', kind: 'CERT', name: "Learn Prompting's AIRTP+", need: ['prompt-injection', 'methodology', 'writeup', 'agent-attacks'] },
  { id: 'osai', kind: 'CERT', name: 'OSAI', need: ['python', 'ml-fundamentals', 'prompt-injection', 'agent-attacks', 'defense'] },
  { id: 'cairtp', kind: 'CERT', name: 'CAIRTP', need: ['agent-attacks', 'finetune', 'methodology', 'writeup', 'automated-attacks'] },
  { id: 'grayswan', kind: 'PIPELINE', name: 'Gray Swan network', need: ['ctf-rank', 'agent-attacks', 'writeup', 'automated-attacks'] },
]

const picked = new Set()

const skillsEl = $('#skills')
if (skillsEl) {
  SKILLS.forEach((s) => {
    const row = document.createElement('button')
    row.className = 'skill-row'
    row.innerHTML = `<span class="sk-box"></span><span class="sk-label"></span>`
    row.querySelector('.sk-label').textContent = s.label
    row.addEventListener('click', () => {
      if (picked.has(s.id)) { picked.delete(s.id); row.classList.remove('on') }
      else { picked.add(s.id); row.classList.add('on') }
      paintRoles()
    })
    skillsEl.appendChild(row)
  })
}

const rolemapEl = $('#rolemap')

function paintRoles() {
  if (!rolemapEl) return
  const scored = ROLES.map((r) => {
    const have = r.need.filter((id) => picked.has(id))
    const pct = Math.round((have.length / r.need.length) * 100)
    const gap = r.need.filter((id) => !picked.has(id)).map((id) => SKILLS.find((s) => s.id === id)?.label ?? id)
    return { ...r, pct, gap }
  }).sort((a, b) => b.pct - a.pct)

  rolemapEl.innerHTML = ''
  scored.forEach((r, i) => {
    const card = document.createElement('div')
    card.className = 'role-card' + (i === 0 && r.pct > 0 ? ' closest' : '')
    card.innerHTML = `
      <div class="role-head">
        <span class="role-kind"></span>
        <span class="role-name"></span>
        <span class="role-pct"></span>
      </div>
      <div class="role-track"><div class="role-fill"></div></div>
      <div class="role-gap"></div>`
    card.querySelector('.role-kind').textContent = r.kind
    card.querySelector('.role-name').textContent = r.name
    card.querySelector('.role-pct').textContent = r.pct + '%'
    card.querySelector('.role-fill').style.width = r.pct + '%'
    const gapEl = card.querySelector('.role-gap')
    gapEl.textContent = r.gap.length === 0
      ? 'Every required skill ticked. You\'re the profile this role is written for.'
      : `Gap: ${r.gap.join(' · ')}`
    rolemapEl.appendChild(card)
  })
}
paintRoles()

scrollspy()
ready()
