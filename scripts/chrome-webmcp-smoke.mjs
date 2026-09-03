import { execFileSync, spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'

const targetUrl = process.env.FORGEMCP_TARGET_URL || 'http://127.0.0.1:4173/#/dashboard'
const chromeBin = process.env.CHROME_BIN || 'google-chrome'
const debugPort = Number(process.env.CHROME_REMOTE_DEBUGGING_PORT || 9222)
const timeoutMs = Number(process.env.CHROME_SMOKE_TIMEOUT_MS || 30000)

function fail(message, details) {
  console.error(`CHROME_WEBMCP_SMOKE_FAIL: ${message}`)
  if (details !== undefined) console.error(details)
  process.exitCode = 1
}

function chromeVersion() {
  const raw = execFileSync(chromeBin, ['--version'], { encoding: 'utf8' }).trim()
  const match = raw.match(/(\d+)\./)
  const major = match ? Number(match[1]) : 0
  if (major < 149) throw new Error(`Chrome 149+ required, found: ${raw}`)
  console.log(`Chrome runtime: ${raw}`)
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
    await sleep(250)
  }
  throw lastError || new Error(`Timed out waiting for ${url}`)
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl)
  const pending = new Map()
  let nextId = 1

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out opening Chrome DevTools WebSocket')), 10000)
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
    socket.addEventListener('error', event => {
      clearTimeout(timer)
      reject(new Error(`Chrome DevTools WebSocket error: ${event.message || 'unknown'}`))
    }, { once: true })
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

  function call(method, params = {}) {
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  return { socket, call }
}

async function waitForNavigation(call, expectedUrl, deadline) {
  const expectedBase = expectedUrl.split('#')[0]
  let lastState
  while (Date.now() < deadline) {
    const evaluated = await call('Runtime.evaluate', {
      expression: `({ href: location.href, readyState: document.readyState, title: document.title })`,
      returnByValue: true,
    })
    lastState = evaluated.result?.value
    if (
      typeof lastState?.href === 'string'
      && lastState.href.startsWith(expectedBase)
      && ['interactive', 'complete'].includes(lastState.readyState)
    ) return lastState
    await sleep(250)
  }
  throw new Error(`Timed out navigating Chrome to ${expectedUrl}; last page state: ${JSON.stringify(lastState)}`)
}

const chromeArgs = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-sandbox',
  `--remote-debugging-port=${debugPort}`,
  '--enable-experimental-web-platform-features',
  '--enable-features=WebMCP,WebMCPTesting,DevToolsWebMCPSupport',
  `--user-data-dir=/tmp/forgemcp-chrome-webmcp-${process.pid}`,
  '--window-size=1440,1200',
  'about:blank',
]

let chrome
try {
  chromeVersion()
  console.log(`Opening Chrome WebMCP target: ${targetUrl}`)
  chrome = spawn(chromeBin, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  chrome.stdout.on('data', chunk => process.stdout.write(`[chrome] ${chunk}`))
  chrome.stderr.on('data', chunk => process.stderr.write(`[chrome] ${chunk}`))

  const deadline = Date.now() + timeoutMs
  let pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, deadline)
  let page = pages.find(item => item.type === 'page')
  while (!page && Date.now() < deadline) {
    await sleep(250)
    pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, deadline)
    page = pages.find(item => item.type === 'page')
  }
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found')

  const { socket, call } = await connectCdp(page.webSocketDebuggerUrl)
  try {
    await call('Page.enable')
    await call('Runtime.enable')
    const navigation = await call('Page.navigate', { url: targetUrl })
    if (navigation.errorText) throw new Error(`Chrome navigation failed: ${navigation.errorText}`)
    const pageState = await waitForNavigation(call, targetUrl, deadline)
    console.log(`Chrome page ready: ${pageState.href} (${pageState.readyState})`)

    const expression = String.raw`(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const parse = value => {
        if (typeof value !== 'string') return value;
        try { return JSON.parse(value); } catch { return value; }
      };
      const mc = document.modelContext;
      if (!mc || typeof mc.getTools !== 'function' || typeof mc.executeTool !== 'function') {
        return { ok: false, reason: 'document.modelContext/getTools/executeTool unavailable', href: location.href };
      }

      let tools = [];
      for (let attempt = 0; attempt < 40; attempt += 1) {
        tools = await mc.getTools();
        if (tools.length >= 50) break;
        await sleep(250);
      }

      const names = tools.map(tool => tool.name);
      const required = [
        'get_forgemcp_status',
        'set_area_of_interest',
        'start_selfplay',
        'generate_procedural_asset_files',
        'promote_ai_candidate',
      ];
      const missing = required.filter(name => !names.includes(name));
      if (missing.length) return { ok: false, reason: 'required tools missing', missing, count: tools.length, names };

      const execute = async (name, input) => {
        const tool = tools.find(candidate => candidate.name === name);
        // Chrome 151 currently expects the Imperative API input as a valid JSON
        // string and parses it before invoking the page's registered handler.
        return parse(await mc.executeTool(tool, JSON.stringify(input)));
      };

      const status = await execute('get_forgemcp_status', {});
      const aoi = await execute('set_area_of_interest', { name: 'Chrome smoke AOI', lat: 52.2297, lon: 21.0122, radiusKm: 5 });
      const cube = await execute('start_selfplay', { seed: 512, maxPlies: 6 });
      const asset = await execute('generate_procedural_asset_files', {
        track: 'cube-asset',
        stationId: 'earth-space',
        assetKind: 'figurine',
        boardPreset: 'classic-mono',
        piecePreset: 'earth-guardian',
        material: 'Painted resin plus recyclable display base',
        texture: 'Raised continents, cloud relief and controlled gloss',
        primaryColor: '#16a7e0',
        secondaryColor: '#35f0a1',
        ledIntensity: 70,
        scaleMm: 120,
        prompt: 'Generate the deterministic Earth Guardian browser prototype for the Chrome WebMCP smoke test.'
      });
      const invalidInput = await execute('search_location', { query: 'x' });
      const approvalGate = await execute('promote_ai_candidate', { candidateId: 'candidate-capture-v1', tournament: {}, humanApproved: false });

      return {
        ok: true,
        href: location.href,
        userAgent: navigator.userAgent,
        toolCount: tools.length,
        requiredTools: required,
        status,
        aoi,
        cube,
        asset,
        invalidInput,
        approvalGate,
      };
    })()`

    const evaluation = await call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })

    if (evaluation.exceptionDetails) {
      const exception = evaluation.exceptionDetails.exception?.description || evaluation.exceptionDetails.exception?.value
      const detail = exception || evaluation.exceptionDetails.text || 'Runtime.evaluate failed'
      throw new Error(`Chrome page evaluation failed: ${detail}`)
    }
    const result = evaluation.result?.value
    if (!result?.ok) throw new Error(`Browser contract failed: ${JSON.stringify(result)}`)
    if (result.toolCount < 50) throw new Error(`Expected at least 50 tools, got ${result.toolCount}`)
    if (result.status?.data?.status !== 'READY') throw new Error(`Status tool did not return READY: ${JSON.stringify(result.status)}`)
    if (result.aoi?.state !== 'PASS') throw new Error(`AOI tool failed: ${JSON.stringify(result.aoi)}`)
    if (result.cube?.state !== 'PASS') throw new Error(`Cube self-play tool failed: ${JSON.stringify(result.cube)}`)
    if (!['PASS', 'WARNING'].includes(result.asset?.state)) throw new Error(`3D asset tool failed: ${JSON.stringify(result.asset)}`)
    if (result.invalidInput?.state !== 'FAIL') throw new Error(`Invalid-input validation did not fail closed: ${JSON.stringify(result.invalidInput)}`)
    if (result.approvalGate?.state !== 'FAIL') throw new Error(`Human-approval gate did not fail closed: ${JSON.stringify(result.approvalGate)}`)

    console.log('CHROME_WEBMCP_SMOKE_PASS')
    console.log(JSON.stringify({
      targetUrl: result.href,
      userAgent: result.userAgent,
      toolCount: result.toolCount,
      status: result.status?.data?.status,
      aoiState: result.aoi?.state,
      cubeState: result.cube?.state,
      assetState: result.asset?.state,
      invalidInputState: result.invalidInput?.state,
      approvalGateState: result.approvalGate?.state,
    }, null, 2))
  } finally {
    socket.close()
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), error)
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM')
}
