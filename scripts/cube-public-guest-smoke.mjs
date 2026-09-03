import { execFileSync, spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'

const cubeRevision = '614a3a647965079f0d4c101352076b2982a813f7'
const targetUrl = process.env.CUBE_GUEST_URL || `https://teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer/?guest=1&rev=${cubeRevision}`
const chromeBin = process.env.CHROME_BIN || 'google-chrome'
const debugPort = Number(process.env.CUBE_GUEST_DEBUG_PORT || 9444)
const timeoutMs = Number(process.env.CUBE_GUEST_TIMEOUT_MS || 30000)

function chromeVersion() {
  const raw = execFileSync(chromeBin, ['--version'], { encoding: 'utf8' }).trim()
  const major = Number(raw.match(/(\d+)\./)?.[1] || 0)
  if (major < 149) throw new Error(`Chrome 149+ required, found: ${raw}`)
  return raw
}

async function waitForJson(url, deadline) {
  let error
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
      error = new Error(`HTTP ${response.status}`)
    } catch (candidate) { error = candidate }
    await sleep(200)
  }
  throw error || new Error(`Timed out waiting for ${url}`)
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl)
  const pending = new Map()
  let nextId = 1
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out opening Chrome DevTools WebSocket')), 10000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', event => { clearTimeout(timer); reject(new Error(event.message || 'Chrome DevTools WebSocket error')) }, { once: true })
  })
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (!message.id) return
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(`${message.error.code}: ${message.error.message}`))
    else waiter.resolve(message.result)
  })
  const call = (method, params = {}) => {
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  return { socket, call }
}

const args = [
  '--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-dev-shm-usage','--disable-gpu','--no-sandbox','--disable-cache',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/cube-public-guest-${process.pid}`,
  '--window-size=1280,900',
  'about:blank',
]

let chrome
try {
  console.log(`Cube guest smoke Chrome: ${chromeVersion()}`)
  console.log(`Cube guest target: ${targetUrl}`)
  chrome = spawn(chromeBin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  const deadline = Date.now() + timeoutMs
  const pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, deadline)
  const page = pages.find(item => item.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found')
  const { socket, call } = await connectCdp(page.webSocketDebuggerUrl)
  try {
    await call('Page.enable')
    await call('Runtime.enable')
    await call('Network.enable')
    await call('Network.setCacheDisabled', { cacheDisabled: true })
    const navigation = await call('Page.navigate', { url: targetUrl })
    if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`)

    let result
    while (Date.now() < deadline) {
      const evaluation = await call('Runtime.evaluate', {
        expression: `(() => {
          const app = document.querySelector('#app');
          const gate = document.querySelector('.auth-gate');
          let storedGuest = null;
          try { storedGuest = JSON.parse(sessionStorage.getItem('cubeChessIdentity') || 'null'); } catch {}
          return {
            href: location.href,
            readyState: document.readyState,
            directGuestMarker: document.documentElement.dataset.directGuest || null,
            directGuestActivated: document.documentElement.dataset.directGuestActivated || null,
            storedGuestMode: storedGuest?.mode || null,
            authMode: app?.dataset?.authMode || null,
            playerId: app?.dataset?.playerId || null,
            gateHidden: !!gate && (gate.classList.contains('auth-gate-hidden') || gate.getAttribute('aria-hidden') === 'true'),
            appVisible: !!app && app.getBoundingClientRect().width > 0 && app.getBoundingClientRect().height > 0
          };
        })()`,
        returnByValue: true,
      })
      result = evaluation.result?.value
      if (result?.authMode === 'guest' && result?.gateHidden && result?.appVisible) break
      await sleep(250)
    }

    if (result?.directGuestMarker !== 'true') throw new Error(`Fresh deployed index guest marker missing: ${JSON.stringify(result)}`)
    if (result?.directGuestActivated !== 'true') throw new Error(`Existing guest button was not activated: ${JSON.stringify(result)}`)
    if (result?.storedGuestMode !== 'guest') throw new Error(`Guest identity was not created by the normal guest path: ${JSON.stringify(result)}`)
    if (result?.authMode !== 'guest') throw new Error(`Expected guest auth mode: ${JSON.stringify(result)}`)
    if (!result?.gateHidden) throw new Error(`Auth provider gate is still visible: ${JSON.stringify(result)}`)
    if (!result?.appVisible) throw new Error(`Cube application is not visible: ${JSON.stringify(result)}`)
    console.log('CUBE_PUBLIC_GUEST_SMOKE_PASS')
    console.log(JSON.stringify(result, null, 2))
  } finally { socket.close() }
} catch (error) {
  console.error(`CUBE_PUBLIC_GUEST_SMOKE_FAIL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM')
}
