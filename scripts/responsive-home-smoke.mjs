import { execFileSync, spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'

const targetUrl = process.env.FORGEMCP_HOME_URL || 'http://127.0.0.1:4173/#/'
const chromeBin = process.env.CHROME_BIN || 'google-chrome'
const debugPort = Number(process.env.CHROME_RESPONSIVE_DEBUG_PORT || 9333)
const timeoutMs = Number(process.env.CHROME_SMOKE_TIMEOUT_MS || 30000)
const cubePublicHost = 'teslaeco.github.io/Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer'

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, scale: 1, mobile: false },
  { name: 'iphone', width: 390, height: 844, scale: 3, mobile: true },
  { name: 'android', width: 412, height: 915, scale: 2.625, mobile: true },
]

function chromeVersion() {
  const raw = execFileSync(chromeBin, ['--version'], { encoding: 'utf8' }).trim()
  const major = Number(raw.match(/(\d+)\./)?.[1] || 0)
  if (major < 149) throw new Error(`Chrome 149+ required, found: ${raw}`)
  return raw
}

async function waitForJson(url, deadline) {
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw lastError || new Error(`Timed out waiting for ${url}`)
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl)
  const pending = new Map()
  let nextId = 1
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out opening DevTools WebSocket')), 10000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', event => { clearTimeout(timer); reject(new Error(event.message || 'DevTools WebSocket error')) }, { once: true })
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

async function waitForHome(call, deadline) {
  let last
  while (Date.now() < deadline) {
    const evaluated = await call('Runtime.evaluate', {
      expression: `({ readyState: document.readyState, hasHero: !!document.querySelector('.reviewer-hero'), hasCubePublicPreview: !!document.querySelector('[data-cube-open-source-preview]'), hasGuestEntry: !!document.querySelector('[data-cube-public-entry][href*="guest=1"]') })`,
      returnByValue: true,
    })
    last = evaluated.result?.value
    if (['interactive', 'complete'].includes(last?.readyState) && last?.hasHero && last?.hasCubePublicPreview && last?.hasGuestEntry) return
    await sleep(200)
  }
  throw new Error(`Timed out waiting for reviewer home: ${JSON.stringify(last)}`)
}

const chromeArgs = [
  '--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-dev-shm-usage','--disable-gpu','--no-sandbox',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/forgemcp-responsive-${process.pid}`,
  'about:blank',
]

let chrome
try {
  console.log(`Responsive smoke Chrome: ${chromeVersion()}`)
  chrome = spawn(chromeBin, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  const deadline = Date.now() + timeoutMs
  const pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, deadline)
  const page = pages.find(item => item.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found')
  const { socket, call } = await connectCdp(page.webSocketDebuggerUrl)
  try {
    await call('Page.enable')
    await call('Runtime.enable')
    for (const viewport of viewports) {
      await call('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile })
      const navigation = await call('Page.navigate', { url: targetUrl })
      if (navigation.errorText) throw new Error(`${viewport.name}: navigation failed: ${navigation.errorText}`)
      await waitForHome(call, deadline)
      const evaluation = await call('Runtime.evaluate', {
        expression: `(() => {
          const root=document.documentElement, body=document.body, hero=document.querySelector('.reviewer-hero'), terra=document.querySelector('.reviewer-bottom-actions a.primary'), cube=document.querySelector('.reviewer-bottom-actions a.cube'), panels=[...document.querySelectorAll('.reviewer-live-panel')], frames=[...document.querySelectorAll('.reviewer-frame iframe')], cubePreview=document.querySelector('[data-cube-open-source-preview]'), cubePreviewImage=cubePreview?.querySelector('img');
          const rect=node=>node?node.getBoundingClientRect():null;
          const visible=node=>{if(!node)return false;const r=rect(node),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
          return {viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:Math.max(root.scrollWidth,body.scrollWidth)-root.clientWidth,heroVisible:visible(hero),terraVisible:visible(terra),cubeVisible:visible(cube),terraHref:terra?.getAttribute('href'),cubeHref:cube?.getAttribute('href'),panelCount:panels.length,frameCount:frames.length,framesNonInteractive:frames.every(frame=>getComputedStyle(frame).pointerEvents==='none'),cubePreviewVisible:visible(cubePreview),cubePreviewHref:cubePreview?.getAttribute('href'),cubePreviewAlt:cubePreviewImage?.getAttribute('alt'),cubePreviewIsDataImage:String(cubePreviewImage?.getAttribute('src')||'').startsWith('data:image/jpeg;base64,')};
        })()`, returnByValue: true,
      })
      const result = evaluation.result?.value
      if (!result?.heroVisible || !result?.terraVisible || !result?.cubeVisible) throw new Error(`${viewport.name}: reviewer entrances not visible`)
      if (!String(result.terraHref || '').includes('/labmcp')) throw new Error(`${viewport.name}: Terra href wrong: ${result.terraHref}`)
      if (!String(result.cubeHref || '').includes(cubePublicHost) || !String(result.cubeHref || '').includes('guest=1')) throw new Error(`${viewport.name}: Cube does not use direct guest URL: ${result.cubeHref}`)
      if (result.panelCount !== 2 || result.frameCount !== 1 || !result.framesNonInteractive) throw new Error(`${viewport.name}: preview contract failed`)
      if (!result.cubePreviewVisible || !String(result.cubePreviewHref || '').includes('guest=1')) throw new Error(`${viewport.name}: Cube preview does not use direct guest URL: ${result.cubePreviewHref}`)
      if (!/Static preview of the Cube Chess 512 playable/i.test(String(result.cubePreviewAlt || '')) || !result.cubePreviewIsDataImage) throw new Error(`${viewport.name}: static Cube preview labelling failed`)
      if (result.horizontalOverflow > 2) throw new Error(`${viewport.name}: horizontal overflow ${result.horizontalOverflow}px`)
      console.log(`RESPONSIVE_HOME_${viewport.name.toUpperCase()}_PASS`, JSON.stringify({viewport:result.viewport,horizontalOverflow:result.horizontalOverflow,terraHref:result.terraHref,cubeHref:result.cubeHref,cubePreviewHref:result.cubePreviewHref}))
    }
    console.log('RESPONSIVE_HOME_SMOKE_PASS')
  } finally { socket.close() }
} catch (error) {
  console.error(`RESPONSIVE_HOME_SMOKE_FAIL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM')
}
