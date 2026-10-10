#!/usr/bin/env node
// Render every course page in headless Chrome and fail on browser errors.
// Uses Node's built-in WebSocket client so CI does not need a package install.

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const base = process.argv[2] ?? 'http://localhost:8901'
const waitMs = Number(process.env.VERIFY_READY_TIMEOUT_MS ?? 7000)
const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chromePath = candidates.find(existsSync)

if (!chromePath) {
  console.error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.')
  process.exit(1)
}

const root = new URL('..', import.meta.url)
const units = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^unit\d\d$/.test(entry.name))
  .map((entry) => entry.name)
  .sort()
const pages = ['/', ...units.map((unit) => `/${unit}/`)]
const profile = mkdtempSync(join(tmpdir(), 'course-verify-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--window-size=1440,900',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  'about:blank',
], { stdio: 'ignore' })

let socket

try {
  const debugAddress = await waitForDevTools(profile, chrome)
  const version = await fetch(`${debugAddress}/json/version`).then((response) => response.json())
  socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  let sessionId
  const pending = new Map()
  const requestUrls = new Map()
  function command(method, params = {}, session = sessionId) {
    const id = ++nextId
    const message = { id, method, params }
    if (session) message.sessionId = session
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Timed out waiting for Chrome command ${method}`))
      }, 10000)
      pending.set(id, {
        resolve: (result) => { clearTimeout(timer); resolve(result) },
        reject: (error) => { clearTimeout(timer); reject(error) },
      })
      socket.send(JSON.stringify(message))
    })
  }

  const errors = []

  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data))
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
      return
    }
    if (message.sessionId !== sessionId) return

    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(`PAGEERROR: ${message.params.exceptionDetails.text}`)
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      const text = message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')
      if (!/favicon\.ico/.test(text)) errors.push(`CONSOLE: ${text}`)
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry
      if (!/favicon\.ico/.test(entry.url ?? entry.text)) errors.push(`LOG: ${entry.text}`)
    } else if (message.method === 'Network.loadingFailed') {
      const request = message.params
      const url = requestUrls.get(request.requestId) ?? ''
      requestUrls.delete(request.requestId)
      if (!/favicon\.ico/.test(url)) errors.push(`REQFAIL: ${url} ${request.errorText}`)
    } else if (message.method === 'Network.requestWillBeSent') {
      requestUrls.set(message.params.requestId, message.params.request.url)
    } else if (message.method === 'Network.loadingFinished') {
      requestUrls.delete(message.params.requestId)
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      const response = message.params.response
      if (!/favicon\.ico/.test(response.url)) errors.push(`HTTP ${response.status}: ${response.url}`)
    }
  })

  const target = await command('Target.createTarget', { url: 'about:blank' })
  const attached = await command('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  sessionId = attached.sessionId

  await command('Page.enable')
  await command('Runtime.enable')
  await command('Log.enable')
  await command('Network.enable')

  let failures = 0
  for (const page of pages) {
    errors.length = 0
    await command('Page.navigate', { url: new URL(page, base).href })
    const ready = await waitForReady(command, waitMs)
    await delay(500)
    if (!ready) errors.push(`NOT_READY: window.__ready was not true within ${waitMs}ms`)
    if (errors.length) {
      failures += errors.length
      console.log(`FAIL ${page}`)
      for (const error of errors) console.log(`  ✗ ${error}`)
    } else {
      console.log(`ok   ${page} (window.__ready, no browser errors)`)
    }
  }

  if (failures) {
    console.error(`${failures} browser error(s) across ${pages.length} pages`)
    process.exitCode = 1
  } else {
    console.log(`all pages render cleanly (${pages.length} pages)`)
  }
} finally {
  // Ask Chrome to shut itself down first — SIGTERM to the browser process leaves
  // child processes (renderers, crashpad) writing into the profile dir briefly,
  // which races the rmSync below with ENOTEMPTY on Linux runners.
  if (socket && socket.readyState === WebSocket.OPEN) {
    await new Promise((resolve) => {
      const done = () => resolve()
      socket.addEventListener('close', done, { once: true })
      socket.addEventListener('error', done, { once: true })
      socket.send(JSON.stringify({ id: -1, method: 'Browser.close' }))
      setTimeout(done, 2000)
    })
  }
  socket?.close()
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM')
    await once(chrome, 'exit')
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 50, retryDelay: 200 })
}

async function waitForDevTools(profilePath, process) {
  const activePort = join(profilePath, 'DevToolsActivePort')
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Chrome exited with status ${process.exitCode}`)
    if (existsSync(activePort)) {
      const [port] = readFileSync(activePort, 'utf8').trim().split('\n')
      return `http://127.0.0.1:${port}`
    }
    await delay(100)
  }
  throw new Error('Chrome did not start its DevTools endpoint')
}

async function waitForReady(command, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await command('Runtime.evaluate', {
      expression: 'window.__ready === true',
      returnByValue: true,
    })
    if (result.result.value === true) return true
    await delay(100)
  }
  return false
}
