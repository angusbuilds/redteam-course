// Unit 25 — wiring.
// Panel A: click a finding type, the widget assigns OWASP LLM Top-10 ID +
// MITRE ATLAS tactic/technique + NIST AI RMF function (Govern/Map/Measure/Manage).
// Panel B: six sliders compute a live AIVSS 0-10 severity (a teaching model
// of AIVSS's shape — exploitability x impact, amplified by an AI-specific
// autonomy multiplier). Plus the drills and sources, same as every unit.

import { fillSlots, renderDrills, scrollspy, sourceCards, ready } from '../shared/unit.js'

const $ = (s) => document.querySelector(s)

try {
  const CONTENT = await fetch('./content.json').then((r) => r.json())
  fillSlots(CONTENT)
  if ($('#drills')) renderDrills($('#drills'), CONTENT.drills)
  if ($('#sources-list')) sourceCards($('#sources-list'), CONTENT.sources)

  /* ----------------------------------------- panel A: map the finding */

  const NIST_WHY = {
    Govern: 'Govern — a before-the-fact policy call (who can contribute data, which vendors are trusted). You cannot test your way out of this one after the fact.',
    Map: 'Map — scoping work: figuring out what is actually exposed before anyone tests or fixes anything.',
    Measure: 'Measure — you are testing resistance to a known attack class against a live system. That is the function this stage covers.',
    Manage: 'Manage — the fix is an operational control (allow-list, rate limit, incident response) you put in and tune, not a one-off test.',
  }

  const FINDINGS = [
    { id: 'inj-direct', name: 'Direct prompt injection / jailbreak',
      snippet: 'Attacker types the attack straight into the chat box.',
      owaspId: 'LLM01', owaspTitle: 'Prompt Injection',
      atlasTactic: 'Initial Access', atlasTechnique: 'LLM Prompt Injection: Direct (AML.T0051.000)',
      nist: 'Measure' },
    { id: 'inj-indirect', name: 'Indirect injection via a fetched page',
      snippet: 'The attack hides inside content a tool fetches for the model, not in what the user typed.',
      owaspId: 'LLM01', owaspTitle: 'Prompt Injection',
      atlasTactic: 'Initial Access', atlasTechnique: 'LLM Prompt Injection: Indirect (AML.T0051.001)',
      nist: 'Measure' },
    { id: 'tool-hijack', name: 'Tool hijacking / excessive agency',
      snippet: 'An agent calls a tool it should not have been trusted with, with no guardrail on the arguments.',
      owaspId: 'LLM06', owaspTitle: 'Excessive Agency',
      atlasTactic: 'Execution', atlasTechnique: 'LLM Plugin Compromise (AML.T0053)',
      nist: 'Manage' },
    { id: 'sys-leak', name: 'System / meta-prompt leakage',
      snippet: 'The model can be made to recite its own instructions back to you.',
      owaspId: 'LLM07', owaspTitle: 'System Prompt Leakage',
      atlasTactic: 'Collection', atlasTechnique: 'LLM Meta Prompt Extraction (AML.T0056)',
      nist: 'Map' },
    { id: 'sensitive', name: 'Sensitive information disclosure',
      snippet: 'Training data, PII, or a secret the model was never supposed to repeat comes out in a reply.',
      owaspId: 'LLM02', owaspTitle: 'Sensitive Information Disclosure',
      atlasTactic: 'Exfiltration', atlasTechnique: 'LLM Data Leakage (AML.T0057)',
      nist: 'Manage' },
    { id: 'poison', name: 'Data / model poisoning',
      snippet: 'A handful of bad rows in the training or fine-tuning set flips a targeted behavior.',
      owaspId: 'LLM04', owaspTitle: 'Data and Model Poisoning',
      atlasTactic: 'Resource Development', atlasTechnique: 'Poison Training Data (AML.T0020)',
      nist: 'Govern' },
    { id: 'unbounded', name: 'Unbounded consumption / resource DoS',
      snippet: 'Unthrottled generations or tool loops run the host out of money or compute.',
      owaspId: 'LLM10', owaspTitle: 'Unbounded Consumption',
      atlasTactic: 'Impact', atlasTechnique: 'Denial of ML Service (AML.T0029)',
      nist: 'Manage' },
    { id: 'supply', name: 'Supply-chain compromise',
      snippet: 'A model, adapter, or package pulled from a public hub is backdoored before it ever reaches you.',
      owaspId: 'LLM03', owaspTitle: 'Supply Chain',
      atlasTactic: 'Resource Development', atlasTechnique: 'ML Supply Chain Compromise (AML.T0010)',
      nist: 'Govern' },
  ]

  const cardsEl = $('#finding-cards')
  const mapEl = $('#finding-map')

  function renderMap(f) {
    if (!mapEl) return
    mapEl.innerHTML = `
      <div class="map-row"><span class="map-k">OWASP LLM Top-10</span><span class="map-v">${f.owaspId} · ${f.owaspTitle}</span></div>
      <div class="map-row"><span class="map-k">MITRE ATLAS</span><span class="map-v">${f.atlasTactic} → ${f.atlasTechnique}</span></div>
      <div class="map-row"><span class="map-k">NIST AI RMF</span><span class="map-v nist-${f.nist.toLowerCase()}">${f.nist}</span></div>
      <p class="map-why">${NIST_WHY[f.nist]}</p>`
  }

  if (cardsEl && mapEl) {
    FINDINGS.forEach((f, i) => {
      const c = document.createElement('button')
      c.className = 'finding-card'
      c.innerHTML = `<span class="fc-name"></span><span class="fc-snip"></span>`
      c.querySelector('.fc-name').textContent = f.name
      c.querySelector('.fc-snip').textContent = f.snippet
      c.addEventListener('click', () => {
        cardsEl.querySelectorAll('.finding-card').forEach((x) => x.classList.remove('active'))
        c.classList.add('active')
        renderMap(f)
      })
      cardsEl.appendChild(c)
      if (i === 0) { c.classList.add('active'); renderMap(f) }
    })
  }

  /* ------------------------------------------- panel B: AIVSS scorer */

  // Six 0-10 factors. Three average into "exploitability", two into "impact"
  // (weighted 0.4/0.6 like a CVSS base score), then autonomy — the
  // AI-specific factor — applies as a 0.6x-1.0x multiplier on top, so
  // agentic blast-radius amplifies severity rather than just adding to it.
  const FACTORS = [
    { id: 'reach', label: 'Reach', help: '0 = needs local access and a trusted position. 10 = anyone on the open internet can fire it.', value: 5 },
    { id: 'privfree', label: 'Privilege-free', help: '0 = attacker needs high privilege already. 10 = zero privilege, any anonymous user.', value: 5 },
    { id: 'nointeraction', label: 'No victim needed', help: '0 = needs a victim to click or approve something first. 10 = fires with no one else involved.', value: 5 },
    { id: 'conf', label: 'Confidentiality hit', help: '0 = nothing sensitive exposed. 10 = full data exposure.', value: 5 },
    { id: 'integ', label: 'Integrity hit', help: '0 = can’t change anything. 10 = full write/control.', value: 5 },
    { id: 'autonomy', label: 'Autonomy / blast radius', help: 'AI-specific. 0 = a human reviews every action first. 10 = the agent chains tools on its own, no one watching.', value: 5 },
  ]

  const slidersEl = $('#aivss-sliders')
  const vals = {}

  if (slidersEl) {
    FACTORS.forEach((f) => {
      vals[f.id] = f.value
      const row = document.createElement('div')
      row.className = 'aivss-row'
      row.innerHTML = `
        <div class="aivss-top">
          <span class="aivss-label">${f.label}</span>
          <span class="aivss-val" id="aivss-${f.id}-val">${f.value}</span>
        </div>
        <input type="range" min="0" max="10" step="1" value="${f.value}" id="aivss-${f.id}">
        <p class="aivss-help">${f.help}</p>`
      slidersEl.appendChild(row)
    })
  }

  function scoreFrom(v) {
    const expl = (v.reach + v.privfree + v.nointeraction) / 3
    const impact = (v.conf + v.integ) / 2
    const base = expl * 0.4 + impact * 0.6
    const mult = 0.6 + 0.4 * (v.autonomy / 10)
    return Math.min(10, base * mult)
  }

  const scoreEl = $('#aivss-score')
  const fillEl = $('#aivss-fill')
  const verdictEl = $('#aivss-verdict')

  function paintScore() {
    const score = scoreFrom(vals)
    if (scoreEl) scoreEl.textContent = score.toFixed(1)
    if (fillEl) fillEl.style.width = (score * 10) + '%'
    if (verdictEl) {
      let label, cls
      if (score < 4) { label = 'Low.'; cls = '' }
      else if (score < 7) { label = 'Medium. A real finding, not yet a headline.'; cls = 'warn' }
      else if (score < 9) { label = 'High. This gets a CNA’s attention.'; cls = 'crack' }
      else { label = 'Critical. Embargo this the moment you confirm it.'; cls = 'crack' }
      verdictEl.textContent = label
      verdictEl.className = 'meter-verdict ' + cls
    }
  }

  FACTORS.forEach((f) => {
    const input = document.querySelector(`#aivss-${f.id}`)
    const out = document.querySelector(`#aivss-${f.id}-val`)
    if (!input) return
    input.addEventListener('input', () => {
      vals[f.id] = Number(input.value)
      if (out) out.textContent = input.value
      paintScore()
    })
  })
  paintScore()

  scrollspy()
} catch {
  // Swallow, not log: a console.error here would itself fail the verify
  // gate. ready() still fires below so the page never hangs on a build error.
}

ready()
