// Crawl every built course page and assert every same-origin href/src resolves 200.
// Unit pages are discovered from the filesystem (the home ladder is built at
// runtime by index.js, so scraping the served HTML would miss them).
// Usage: node scripts/check-links.mjs [base]
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const base = process.argv[2] ?? 'http://localhost:8901'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const slugs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^unit\d\d$/.test(d.name))
  .map((d) => d.name)
  .sort()
const pages = ['/', ...slugs.map((s) => `/${s}/`)]

let failures = 0
for (const page of pages) {
  const res = await fetch(base + page)
  if (!res.ok) { console.log(`FAIL ${page} → ${res.status}`); failures++; continue }
  const html = await res.text()
  const refs = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('http') && !u.startsWith('data:') && !u.startsWith('mailto:'))
  for (const ref of refs) {
    const url = new URL(ref, base + page)
    const r = await fetch(url, { method: 'GET' })
    if (!r.ok) { console.log(`FAIL ${page} → ${ref} (${r.status})`); failures++ }
  }
  console.log(`ok   ${page} (${refs.length} refs)`)
}

if (failures) { console.log(`${failures} broken reference(s)`); process.exit(1) }
console.log(`all links resolve across ${pages.length} pages`)
