// Course home — renders the 16-unit ladder (grouped into phases) and the
// dated "where the money is" venue table.

const PHASES = [
  {
    name: 'Phase A · Get in the game',
    sub: 'a win tonight, then the toolchain to keep winning',
    units: [
      { n: 1, slug: 'unit01', title: 'First Win + Field Map', hook: 'jailbreak a model tonight; map who pays' },
      { n: 2, slug: 'unit02', title: 'Local Toolchain', hook: 'your own models, so nothing can rate-limit you' },
      { n: 3, slug: 'unit03', title: 'Manual Pattern Speedrun', hook: '15 attacks by hand — your first attack-success number' },
    ],
  },
  {
    name: 'Phase B · Measure like a pro',
    sub: 'turn "it worked" into a number a reviewer trusts',
    units: [
      { n: 4, slug: 'unit04', title: 'Benchmarks & Harness', hook: 'garak, promptfoo, HarmBench — and how judges disagree' },
      { n: 5, slug: 'unit05', title: 'Automated Attacks: PAIR + TAP', hook: 'a model that jailbreaks another model, in a loop' },
      { n: 6, slug: 'unit06', title: 'Multi-Turn & Scaling', hook: 'Crescendo, many-shot, best-of-N — plot attack vs tries' },
    ],
  },
  {
    name: 'Phase C · Attack the agents',
    sub: 'your thesis: the least-defended surface in 2026',
    units: [
      { n: 7, slug: 'unit07', title: 'Indirect Prompt Injection', hook: 'the attack rides in on the data, not the prompt' },
      { n: 8, slug: 'unit08', title: 'Tool Hijacking & MCP', hook: 'make the agent DO something, not just say it' },
      { n: 9, slug: 'unit09', title: 'Multi-Agent, Memory, Browser', hook: 'poison a mailbox, a memory store, a web page' },
      { n: 10, slug: 'unit10', title: 'Pro Auditing: Inspect + Petri', hook: 'the framework the labs actually publish with' },
    ],
  },
  {
    name: 'Phase D · Own the model',
    sub: 'the skill APIs can never give you — your own weights',
    units: [
      { n: 11, slug: 'unit11', title: 'Post-Training: SFT / LoRA', hook: 'your first fine-tune — loss curve on your Mac' },
      { n: 12, slug: 'unit12', title: 'Refusal-Direction Ablation', hook: 'delete the refusal with one direction of math' },
      { n: 13, slug: 'unit13', title: 'Fine-Tune Attacks', hook: 'even benign data can quietly break safety' },
      { n: 14, slug: 'unit14', title: 'Preference-Opt + Gradient Attacks', hook: 'DPO, and when to stop fighting Metal and rent a GPU' },
      { n: 15, slug: 'unit15', title: 'Defense Awareness', hook: 'what is deployed against you — and its cost to beat' },
    ],
  },
  {
    name: 'Phase E · Get paid',
    sub: 'convert your logs into one accepted finding',
    units: [
      { n: 16, slug: 'unit16', title: 'First Paid Submission', hook: 'scope it, write it, submit it — the whole point' },
    ],
  },
]

const phasesEl = document.querySelector('#phases')
for (const p of PHASES) {
  const sec = document.createElement('div')
  sec.className = 'phase'
  sec.innerHTML = `
    <div class="phase-head"><span class="pn"></span><span class="ps"></span></div>
    <div class="units"></div>`
  sec.querySelector('.pn').textContent = p.name
  sec.querySelector('.ps').textContent = p.sub
  const grid = sec.querySelector('.units')
  for (const u of p.units) {
    const el = document.createElement('a')
    el.className = 'unit-card'
    el.href = `${u.slug}/`
    el.innerHTML = `
      <div class="no">UNIT ${String(u.n).padStart(2, '0')}</div>
      <div class="t"></div>
      <div class="h"></div>`
    el.querySelector('.t').textContent = u.title
    el.querySelector('.h').textContent = u.hook
    grid.appendChild(el)
  }
  phasesEl.appendChild(sec)
}

/* ------------------------------------------------- dated world state */

const WORLD = await fetch('./data/world-oct-2026.json').then((r) => r.json())

const tbody = document.querySelector('#venues tbody')
for (const v of WORLD.venues) {
  const tr = document.createElement('tr')
  tr.innerHTML = `<td></td><td class="mk"></td><td class="num"></td><td></td><td class="catch"></td>`
  const tds = tr.querySelectorAll('td')
  tds[0].textContent = v.name
  tds[1].textContent = v.who
  tds[2].textContent = v.pays
  tds[3].textContent = v.scope
  tds[4].textContent = v.rules
  tbody.appendChild(tr)
}

const newsEl = document.querySelector('#news')
for (const n of WORLD.news) {
  const li = document.createElement('li')
  li.innerHTML = `<span class="d"></span><span class="l"></span>`
  li.querySelector('.d').textContent = n.date
  li.querySelector('.l').textContent = n.line
  newsEl.appendChild(li)
}

document.querySelector('#world-note').textContent = WORLD.note
document.querySelector('#stamp').textContent = `venue data as of ${WORLD.as_of}`

window.__ready = true
