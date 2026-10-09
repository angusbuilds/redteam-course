// Shared unit shell — the generic half of every unit's app.js, lifted from
// unit01 so twelve pages can't drift apart. No DOM access at module top level:
// node --test imports this file for the pure functions.

/* ------------------------------------------------------------------- prose */

// Blank-line separated blocks -> paragraphs. **bold** and `code` supported.
export function prose(text) {
  return String(text)
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const html = block
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
      return `<p>${html}</p>`
    })
    .join('')
}

export function normalise(s) {
  return String(s).trim().toLowerCase().replace(/[.,!?"']/g, '')
}

/* -------------------------------------------------------------- page bits */

export function fillSlots(content) {
  for (const slot of document.querySelectorAll('[data-slot]')) {
    const key = slot.dataset.slot
    if (content[key]) slot.innerHTML = prose(content[key])
  }
  document.querySelector('#hook')?.querySelector('p')?.classList.add('lead')
}

export function renderDrills(el, drills) {
  drills.forEach((d, i) => {
    const box = document.createElement('div')
    box.className = 'drill'
    box.innerHTML = `
      <div class="q"><span class="n">Q${i + 1}</span>${d.q.replace(/</g, '&lt;')}</div>
      <div class="row">
        <input type="text" placeholder="your answer" spellcheck="false" aria-label="Your answer to question ${i + 1}">
        <button>Check</button>
        <button data-reveal>Show answer</button>
      </div>
      <div class="verdict" role="status" aria-live="polite"></div>`

    const input = box.querySelector('input')
    const verdict = box.querySelector('.verdict')

    const settle = (correct, msg) => {
      verdict.className = 'verdict show ' + (correct ? 'ok' : 'no')
      verdict.innerHTML = msg
    }

    box.querySelector('button').addEventListener('click', () => {
      const got = normalise(input.value)
      if (!got) return
      // accept: main answer or any listed alternative; numbers compare numerically
      const wants = [d.answer, ...(d.accept ?? [])].map(normalise)
      const correct = wants.some(
        (w) => got === w || (d.kind === 'number' && parseFloat(got) === parseFloat(w)),
      )
      settle(
        correct,
        correct
          ? `<strong>Right.</strong> ${d.why}`
          : `<strong>Not yet.</strong> ${d.hint ?? 'Go back to the explorable and check.'}`,
      )
    })

    box.querySelector('[data-reveal]').addEventListener('click', () => {
      settle(true, `<strong>${d.answer}</strong> — ${d.why}`)
    })

    el.appendChild(box)
  })
}

// Phase accent from the unit number — Phase 0 cyan · A amber · B cyan · C red ·
// D green · E amber · F (expert) violet. The brand stays red; this is a hint.
function accentFor(n) {
  if (n === 0) return '#4cc9f0'
  if (n <= 3) return '#f0b429'
  if (n <= 6) return '#4cc9f0'
  if (n <= 10) return '#ff7a6b'
  if (n <= 15) return '#6ee7a8'
  if (n === 16) return '#f0b429'
  return '#b98cff'
}

export function scrollspy() {
  // per-phase accent, read from the rail's "UNIT NN" label (no per-file config)
  const label = document.querySelector('.rail .unit-no')?.textContent ?? ''
  const n = parseInt((label.match(/\d+/) ?? ['99'])[0], 10)
  document.documentElement.style.setProperty('--accent', accentFor(n))

  // enable the animated hidden-state only now that JS is running
  document.documentElement.classList.add('js-anim')

  const links = [...document.querySelectorAll('.rail a')]
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id))
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  )

  // reveal beats as they scroll in; the first beat reveals immediately
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target) }
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  )

  document.querySelectorAll('section.beat').forEach((s, i) => {
    obs.observe(s)
    if (i === 0) s.classList.add('in')
    else reveal.observe(s)
  })

  // safety net: if an observer never fires (headless, odd viewports), reveal all after a beat
  setTimeout(() => document.querySelectorAll('section.beat').forEach((s) => s.classList.add('in')), 1200)

  // shareable proof card — wrapped so it can never break the page/gate
  try { proofCardWidget() } catch (_) {}
}

// Injects a "share your result" widget into the lab beat of every unit. The
// learner types the number their lab printed; we render a dark, accent-coloured
// card to a canvas and offer it as a PNG download. All client-side, no backend.
function proofCardWidget() {
  const lab = document.querySelector('#lab')
  if (!lab || !document.createElement('canvas').getContext) return

  const unitNo = (document.querySelector('.rail .unit-no')?.textContent || 'UNIT').trim()
  const title = (document.querySelector('header.top h1')?.textContent || 'Breaking Models').trim()
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f0b429'

  const box = document.createElement('div')
  box.className = 'proofcard'
  box.innerHTML = `
    <div class="pc-head">Made your number? Turn it into a shareable card.</div>
    <div class="pc-row">
      <input type="text" class="pc-input" maxlength="40" placeholder="your result — e.g. 1/3 cracked, ASR 42%" aria-label="Your result for this unit">
      <button class="pc-make" type="button">Make card</button>
    </div>
    <canvas class="pc-canvas" width="1200" height="630" hidden></canvas>
    <a class="pc-dl" hidden download>Download PNG</a>`
  lab.appendChild(box)

  const input = box.querySelector('.pc-input')
  const canvas = box.querySelector('.pc-canvas')
  const dl = box.querySelector('.pc-dl')

  function draw() {
    const result = (input.value || 'figure it out').slice(0, 40)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#12110f'; ctx.fillRect(0, 0, 1200, 630)
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 14, 630)
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#6b655d'; ctx.font = '600 24px ui-monospace, Menlo, monospace'
    ctx.fillText('BREAKING MODELS · AI RED-TEAM COURSE', 70, 70)
    ctx.fillStyle = accent; ctx.font = '600 28px ui-monospace, Menlo, monospace'
    ctx.fillText(unitNo, 70, 150)
    ctx.fillStyle = '#e8e4dc'; ctx.font = '700 60px -apple-system, system-ui, sans-serif'
    wrap(ctx, title, 70, 200, 1060, 66)
    ctx.fillStyle = '#9a938a'; ctx.font = '400 26px -apple-system, system-ui, sans-serif'
    ctx.fillText('my result', 70, 430)
    ctx.fillStyle = accent; ctx.font = '700 72px ui-monospace, Menlo, monospace'
    ctx.fillText(result, 70, 470)
    ctx.fillStyle = '#6b655d'; ctx.font = '400 22px ui-monospace, Menlo, monospace'
    ctx.fillText('github.com/angusbuilds/redteam-course', 70, 575)
    canvas.hidden = false
    canvas.toBlob((blob) => {
      if (!blob) return
      dl.href = URL.createObjectURL(blob)
      dl.download = `breaking-models-${unitNo.toLowerCase().replace(/\s+/g, '')}.png`
      dl.hidden = false
    }, 'image/png')
  }
  box.querySelector('.pc-make').addEventListener('click', draw)
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh }
    else line = test
  }
  if (line) ctx.fillText(line, x, y)
}

// v = {url, title, author, why}. A link card, never an iframe: embeds spray
// console noise that fails the verify gate, and a card degrades to a plain
// link when offline (the thumbnail just hides itself).
export function videoCard(el, v) {
  const id =
    new URL(v.url).searchParams.get('v') ?? new URL(v.url).pathname.slice(1)
  const a = document.createElement('a')
  a.className = 'video-card'
  a.href = v.url
  a.target = '_blank'
  a.rel = 'noopener'
  a.innerHTML = `
    <img alt="" loading="lazy">
    <div class="vc-text">
      <div class="vc-label">WATCH · AFTER THE RECEIPT</div>
      <div class="vc-title"></div>
      <div class="vc-author"></div>
      <div class="vc-why"></div>
    </div>`
  const img = a.querySelector('img')
  img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  img.addEventListener('error', () => (img.style.display = 'none'))
  a.querySelector('.vc-title').textContent = v.title
  a.querySelector('.vc-author').textContent = v.author
  a.querySelector('.vc-why').textContent = v.why
  el.appendChild(a)
}

// Signal for tools/verify.mjs: everything ran without throwing.
export function ready() {
  window.__ready = true
}

// sources = [{kind, title, who, url, why}]. Plain link cards for papers, repos,
// venues, tools. No iframe and no remote thumbnail, so nothing here can fail the
// verify gate or 404. kind renders as a short chip (PAPER, REPO, VENUE, TOOL, READ).
export function sourceCards(el, sources) {
  for (const s of sources) {
    const a = document.createElement('a')
    a.className = 'source-card'
    a.href = s.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.innerHTML = `
      <span class="sc-kind"></span>
      <span class="sc-body">
        <span class="sc-title"></span>
        <span class="sc-who"></span>
        <span class="sc-why"></span>
      </span>`
    a.querySelector('.sc-kind').textContent = s.kind || 'READ'
    a.querySelector('.sc-title').textContent = s.title
    a.querySelector('.sc-who').textContent = s.who || ''
    a.querySelector('.sc-why').textContent = s.why || ''
    el.appendChild(a)
  }
}
