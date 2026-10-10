// Structural gate: every unit complete, every lab script parseable, every claim
// the README/SCORECARD make about course shape enforced at CI time. Zero deps.
// Usage: node scripts/check-content.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let failures = 0
const fail = (msg) => { console.log(`FAIL ${msg}`); failures++ }

const unitDirs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^unit\d\d$/.test(d.name))
  .map((d) => d.name)
  .sort()

// 1. The home ladder lists exactly the unit directories on disk.
const homeJs = readFileSync(join(root, 'index.js'), 'utf8')
const homeSlugs = [...homeJs.matchAll(/slug: '(unit\d\d)'/g)].map((m) => m[1]).sort()
const mismatch = homeSlugs.filter((s) => !unitDirs.includes(s))
  .concat(unitDirs.filter((d) => !homeSlugs.includes(d)))
if (mismatch.length) fail(`home ladder and unit dirs disagree: ${mismatch.join(', ')}`)

// 2. Every unit is structurally complete.
const BEATS = ['hook', 'mechanism', 'technique', 'lab', 'notes']
for (const unit of unitDirs) {
  const dir = join(root, unit)
  for (const f of ['index.html', 'app.js', 'style.css', 'content.json']) {
    if (!existsSync(join(dir, f))) fail(`${unit}: missing ${f}`)
  }
  let content
  try {
    content = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'))
  } catch (e) {
    fail(`${unit}: content.json does not parse (${e.message})`)
    continue
  }
  if (typeof content.unit !== 'number' || !content.title) fail(`${unit}: missing unit number or title`)
  for (const beat of BEATS) {
    const v = content[beat]
    if (typeof v !== 'string' || v.trim().length < 40) fail(`${unit}: beat '${beat}' missing or thin`)
  }
  const drills = content.drills
  if (!Array.isArray(drills) || drills.length < 3) {
    fail(`${unit}: needs >= 3 drills`)
  } else {
    drills.forEach((d, i) => {
      for (const k of ['q', 'answer', 'why']) {
        if (!d[k] || !String(d[k]).trim()) fail(`${unit}: drill ${i} missing '${k}'`)
      }
    })
  }
  for (const s of content.sources ?? []) {
    if (!s.title || !/^https?:\/\//.test(s.url ?? '')) fail(`${unit}: source without title/url (${s.title ?? '?'})`)
  }
  // 3. Every lab file a unit references actually exists.
  const refs = JSON.stringify(content).match(/labs\/[a-z0-9._-]+/g) ?? []
  for (const ref of new Set(refs)) {
    if (!existsSync(join(root, ref))) fail(`${unit}: references missing lab ${ref}`)
  }
  // 4. The mechanism beat carries real MITRE ATLAS technique IDs (unit00 introduces the scheme).
  if (unit === 'unit00') {
    if (!/MITRE ATLAS/.test(content.mechanism)) fail('unit00: does not introduce the ATLAS tagging scheme')
  } else if (!/AML\.T\d/.test(content.mechanism)) {
    fail(`${unit}: mechanism beat has no MITRE ATLAS technique ID (AML.T…)`)
  }
}

// 5. Every lab script parses.
const labs = readdirSync(join(root, 'labs'))
for (const lab of labs) {
  const path = join(root, 'labs', lab)
  try {
    if (lab.endsWith('.sh')) execFileSync('sh', ['-n', path], { stdio: 'pipe' })
    else if (lab.endsWith('.py')) {
      // compile() rather than py_compile: no __pycache__ artifacts in the tree
      execFileSync('python3', ['-c', 'import sys; compile(open(sys.argv[1]).read(), sys.argv[1], "exec")', path], { stdio: 'pipe' })
    }
  } catch (e) {
    fail(`labs/${lab} does not parse (${e.message.split('\n')[0]})`)
  }
}

// 6. Labs referenced by unit pages all live in labs/ and every lab is reachable
//    from some unit (no orphans people can't find).
const referenced = new Set()
for (const unit of unitDirs) {
  try {
    const c = JSON.parse(readFileSync(join(root, unit, 'content.json'), 'utf8'))
    for (const r of JSON.stringify(c).match(/labs\/[a-z0-9._-]+/g) ?? []) referenced.add(r)
  } catch { /* already reported above */ }
}
const onDisk = new Set(readdirSync(join(root, 'labs')).filter((f) => !f.startsWith('.')).map((f) => `labs/${f}`))
for (const lab of onDisk) if (!referenced.has(lab)) fail(`${lab}: on disk but no unit references it`)

if (failures) { console.log(`${failures} content failure(s)`); process.exit(1) }
console.log(`content complete: ${unitDirs.length} units, ${onDisk.size} lab scripts, home ladder in sync`)
