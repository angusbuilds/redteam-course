// Word-level n-gram model over a real corpus. Powers Unit 3 (be-the-model
// game) and Unit 5 (the sampling lab). The dials here are the REAL math the
// course teaches — temperature reshapes, top-k/top-p truncate — so nothing in
// this file may approximate. Node-importable: no DOM.

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9']+|[^\sa-z0-9']/g) ?? [])
}

// model: contexts of length n-1 (with backoff tables down to length 0)
export function train(text, n = 3) {
  const toks = tokenize(text)
  // orders[k] maps a k-token context "a b" -> Map(next -> count)
  const orders = []
  for (let k = 0; k < n; k++) {
    const table = new Map()
    for (let i = k; i < toks.length; i++) {
      const ctx = toks.slice(i - k, i).join(' ')
      let m = table.get(ctx)
      if (!m) table.set(ctx, (m = new Map()))
      m.set(toks[i], (m.get(toks[i]) ?? 0) + 1)
    }
    orders.push(table)
  }
  return { n, orders, tokens: toks.length }
}

// Longest-match distribution for a context; backs off until something is
// found (order 0 always exists). Returns sorted [{token, count, p}].
export function nextDist(model, context) {
  const ctx = context.map((t) => String(t).toLowerCase())
  for (let k = Math.min(model.n - 1, ctx.length); k >= 0; k--) {
    const m = model.orders[k].get(ctx.slice(ctx.length - k).join(' '))
    if (m && m.size) {
      const total = [...m.values()].reduce((a, b) => a + b, 0)
      return [...m.entries()]
        .map(([token, count]) => ({ token, count, p: count / total }))
        .sort((a, b) => b.count - a.count)
    }
  }
  return []
}

/* The dials. Input: sorted [{token, count, p}]. Output: same order, each
   entry {token, count, p0, p, cut} where
     p0  = probability after temperature reshaping (before truncation)
     cut = removed by top-k / top-p
     p   = final probability (renormalised over survivors; 0 if cut)      */
export function applyDials(dist, { temperature = 1, topK = 0, topP = 1 } = {}) {
  if (!dist.length) return []
  const T = Math.max(temperature, 1e-4)

  // temperature on counts: p_i ∝ count_i^(1/T)  (= softmax of ln(count)/T).
  // Work in logs so count^20 can't overflow at low T.
  const logits = dist.map((e) => Math.log(e.count) / T)
  const maxL = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - maxL))
  const z = exps.reduce((a, b) => a + b, 0)
  const p0 = exps.map((e) => e / z)

  // truncation over the temperature-shaped distribution, highest first
  const keep = dist.map(() => true)
  if (topK > 0) for (let i = topK; i < dist.length; i++) keep[i] = false
  if (topP < 1) {
    let acc = 0
    for (let i = 0; i < dist.length; i++) {
      if (!keep[i]) continue
      if (acc >= topP) keep[i] = false
      else acc += p0[i]
    }
  }

  const zKeep = p0.reduce((a, b, i) => a + (keep[i] ? b : 0), 0)
  return dist.map((e, i) => ({
    token: e.token,
    count: e.count,
    p0: p0[i],
    cut: !keep[i],
    p: keep[i] ? p0[i] / zKeep : 0,
  }))
}

// mulberry32 — tiny seeded RNG so drills and demos are reproducible
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sample(model, { context = [], len = 20, temperature = 1, topK = 0, topP = 1, seed = 42 } = {}) {
  const rand = rng(seed)
  const out = []
  let ctx = context.map((t) => String(t).toLowerCase())
  for (let i = 0; i < len; i++) {
    const dist = applyDials(nextDist(model, ctx), { temperature, topK, topP })
    if (!dist.length) break
    let r = rand()
    let pick = dist.find((e) => !e.cut) ?? dist[0]
    for (const e of dist) {
      if (e.cut) continue
      if (r < e.p) { pick = e; break }
      r -= e.p
    }
    out.push(pick.token)
    ctx = [...ctx, pick.token].slice(-(model.n - 1))
  }
  return out
}
