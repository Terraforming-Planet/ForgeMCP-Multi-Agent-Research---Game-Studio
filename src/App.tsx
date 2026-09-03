import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import './reviewer.css'
import { agentRegistry } from './agents/registry'
import { ApprovalQueue } from './components/ApprovalQueue'
import { ChallengeEvidence } from './components/ChallengeEvidence'
import { CubePremiumSubscription } from './components/CubePremiumSubscription'
import { GameStudio } from './components/GameStudio'
import { LabMcp } from './components/LabMcp'
import { ProductLab } from './components/ProductLab'
import { ProvenanceViewer } from './components/ProvenanceViewer'
import { ResearchArchive } from './components/ResearchArchive'
import { ResearchErrorBoundary } from './components/ResearchErrorBoundary'
import { ResearchStations } from './components/ResearchStations'
import { StatusBadge } from './components/StatusBadge'
import { Timeline } from './components/Timeline'
import { ToolInspector } from './components/ToolInspector'
import { runCoordinator } from './coordinator/workflows'
import { checkCubeHealth, CUBE_PUBLIC_URL } from './integrations/cube/adapter'
import { checkTerraHealth, TERRA_APP_URL } from './integrations/terra/adapter'
import type { ProvenanceRecord, WorkflowRun } from './types/core'
import { detectWebMcpAvailability, registerWebMcpTools } from './webmcp/detection'
import { webmcpTools } from './webmcp/registry'

function Home() {
  return (
    <div className="reviewer-home">
      <section className="reviewer-hero">
        <div className="reviewer-badge">JUDGE DEMO · SIMPLE 3-MINUTE FLOW</div>
        <h1>FORGE<span>MCP</span></h1>
        <p className="reviewer-tagline">One browser-native WebMCP layer connecting real Earth observation with deterministic Cube Chess 512 AI, game creation and verification.</p>
        <p className="reviewer-subline">The reviewer only needs one page: Terra Observatory on the left, Cube Chess on the right, then a short explanation of what WebMCP changed. Terra remains evidence-first; Cube remains rules-engine-first; consequential changes still require visible verification and human approval.</p>
        <div className="reviewer-truthbar" aria-label="ForgeMCP project pillars">
          <span>OBSERVE THE REAL WORLD → TERRA</span>
          <span>LEARN &amp; COMPETE → CUBE</span>
          <span>CREATE → GAME STUDIO</span>
          <span>VERIFY → SOURCES · TESTS · APPROVAL</span>
        </div>
        <div className="reviewer-codex"><strong>Built with OpenAI Codex assistance during the WebMCP Challenge.</strong> ForgeMCP is the challenge-period integration and workflow layer built on top of pre-challenge Terra Observation System and Cube Chess 512. We do not present the older Terra/Cube systems as new challenge work.</div>
      </section>

      <section className="reviewer-live-grid" aria-label="Live Terra and Cube applications">
        <article className="reviewer-live-panel reviewer-live-panel--terra">
          <header className="reviewer-live-head">
            <div><p>01 · TERRA OBSERVATORY · LIVE</p><h2>Observe, compare and verify Earth</h2></div>
            <Link to="/labmcp">Open focused Terra workflow →</Link>
          </header>
          <div className="reviewer-frame">
            <iframe title="Terra Observatory live application" src={TERRA_APP_URL} loading="eager" referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <div className="reviewer-frame-note"><b>Truth boundary:</b><span>Original/public satellite products and recorded evidence stay separate from generated visuals. ForgeMCP improves the investigation workflow and display detail; it does not claim higher native sensor resolution.</span></div>
        </article>

        <article className="reviewer-live-panel reviewer-live-panel--cube">
          <header className="reviewer-live-head">
            <div><p>02 · CUBE CHESS 512 · LIVE</p><h2>Play, self-play, improve and verify</h2></div>
            <Link to="/game-studio">Open Cube Game Studio →</Link>
          </header>
          <div className="reviewer-frame">
            <iframe title="Cube Chess 512 live application" src={CUBE_PUBLIC_URL} loading="eager" referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <div className="reviewer-frame-note"><b>Truth boundary:</b><span>The deterministic Cube rules engine decides legal play. ForgeMCP can run bounded self-play, inspect results and propose visual/AI changes, but promotion still requires recorded PASS evidence and human approval.</span></div>
        </article>
      </section>

      <section className="reviewer-section" aria-labelledby="webmcp-changes-heading">
        <div className="reviewer-section-heading">
          <div><p>WHAT WEBMCP + CODEX CHANGED</p><h2 id="webmcp-changes-heading">Visible improvements, not a feature dump</h2></div>
          <small>These are the improvements the reviewer should show in the video. The detailed labs, subscriptions and experimental tools remain available under More, but they no longer compete for attention on the main page.</small>
        </div>
        <div className="reviewer-change-grid">
          <article className="reviewer-change-card">
            <span>TERRA · SATELLITE WORKFLOW</span>
            <h3>Faster, clearer investigation</h3>
            <p>Location-first search, higher-detail <strong>1024 px WMS display previews</strong>, original-image labels, provenance and a sparse <strong>20 × 1 km</strong> regional patrol option make satellite review easier to follow.</p>
          </article>
          <article className="reviewer-change-card">
            <span>TERRA · HAZARD SIGNALS</span>
            <h3>Alerts stay scientifically bounded</h3>
            <p>Agents can inspect water, terrain and hazard signals, compare dates and produce a <strong>preliminary alert</strong>, but uncertainty, alternative hypotheses and ground verification remain visible before any verified finding.</p>
          </article>
          <article className="reviewer-change-card reviewer-change-card--cube">
            <span>CUBE · 3D + TEXTURES</span>
            <h3>Models became testable assets</h3>
            <p>WebMCP/Game Studio workflows were used to improve <strong>Earth Guardian</strong>, Arctic ice vs steel, Ocean water vs marine metal, Sahara/excavator materials, classic board presentation and Lab LEDColor concepts with reversible QA.</p>
          </article>
          <article className="reviewer-change-card reviewer-change-card--verify">
            <span>WEBMCP · VERIFICATION</span>
            <h3>The browser proves the integration</h3>
            <p><strong>50 browser-native WebMCP tools</strong> were discovered and executed in Chrome 151. CI, validation failures, provenance and human-approval gates are part of the visible result instead of hidden claims.</p>
          </article>
        </div>
      </section>

      <section className="reviewer-section" aria-labelledby="demo-flow-heading">
        <div className="reviewer-section-heading">
          <div><p>REVIEWER VIDEO FLOW</p><h2 id="demo-flow-heading">Three steps. One story.</h2></div>
          <small>Do not tour every tab. Show one real Terra run, one real Cube/Game Studio run, and one proof that WebMCP actually executed them.</small>
        </div>
        <div className="reviewer-demo-steps">
          <article className="reviewer-step"><b>1</b><h3>Terra Observatory</h3><p>Search a real place → show original/public satellite evidence → compare imagery/signals → show provenance, uncertainty and a preliminary hazard result that remains bounded by verification.</p><Link to="/labmcp">Start Terra demo</Link></article>
          <article className="reviewer-step"><b>2</b><h3>Cube Chess + Game Studio</h3><p>Show the live Cube game → run the deterministic benchmark or inspect a candidate → show a 3D/material improvement and its PASS/WARNING/FAIL QA result.</p><Link to="/game-studio">Start Cube demo</Link></article>
          <article className="reviewer-step"><b>3</b><h3>WebMCP proof</h3><p>Show that the browser discovered the tools, executed real handlers, rejected invalid input and blocked promotion without human approval. This is the challenge differentiator.</p><Link to="/challenge">Open proof</Link></article>
        </div>
        <div className="reviewer-proofline" aria-label="Verified reviewer proof points"><span className="pass">Chrome 151 PASS</span><span className="pass">Public Pages PASS</span><span>50 WebMCP tools</span><span>Terra provenance</span><span>Cube deterministic legality</span><span>Human approval gate</span></div>
      </section>

      <div className="reviewer-bottom-actions">
        <Link className="primary" to="/labmcp">Terra Observatory</Link>
        <Link className="cube" to="/game-studio">Cube Chess / Game Studio</Link>
        <Link to="/dashboard">WebMCP Control Center</Link>
        <Link to="/stations">3D Station Tests</Link>
      </div>
    </div>
  )
}

function Dashboard() {
  const [request, setRequest] = useState('Investigate Lake Chad drying risk')
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [terraHealth, setTerraHealth] = useState('UNKNOWN')
  const [cubeHealth, setCubeHealth] = useState('UNKNOWN')
  const [availability, setAvailability] = useState(detectWebMcpAvailability())

  useEffect(() => {
    void (async () => {
      setTerraHealth(await checkTerraHealth())
      setCubeHealth(await checkCubeHealth())
      const result = await registerWebMcpTools()
      setAvailability(result.availability)
    })()
  }, [])

  const events = useMemo(() => run?.events ?? [], [run])
  const execute = async (prompt: string) => { setRequest(prompt); setRun(await runCoordinator(prompt)) }

  return (
    <>
      <section className="card">
        <h2>Working Control Center</h2>
        <div className="grid two">
          <div>
            <p>HUMAN REQUEST</p>
            <input value={request} onChange={(e) => setRequest(e.target.value)} />
            <div className="toolbar">
              <button type="button" onClick={() => execute(request)}>Run coordinator</button>
              <button type="button" onClick={() => execute('Lake Chad')}>Demo: OBSERVE Terra</button>
              <Link className="button-link" to="/labmcp">Open: LabTerra WebMCP</Link>
              <button type="button" onClick={() => execute('Run a deterministic Cube Chess self-play benchmark')}>Demo: LEARN &amp; COMPETE</button>
              <button type="button" onClick={() => execute("Improve the game's visual readability")}>Demo: CREATE + QA</button>
            </div>
          </div>
          <div>
            <p>WEBMCP</p>
            <StatusBadge value={availability} />
            {availability !== 'WEBMCP_AVAILABLE' ? <p>Judge note: use a WebMCP-enabled browser exposing <code>document.modelContext.registerTool</code>. Dashboard demos remain available without claiming browser registration.</p> : null}
            <p>Terra</p>
            <StatusBadge value={terraHealth} />
            <p>Cube</p>
            <StatusBadge value={cubeHealth} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>COORDINATOR &amp; ACTIVE AGENTS</h2>
        <p>Decision: {run ? `deterministically routed to ${run.workflow}` : 'awaiting human request (no LLM claimed)'}</p>
        <ul>
          {agentRegistry.map((agent) => (
            <li key={agent.id}>{agent.name} — {agent.responsibility}</li>
          ))}
        </ul>
      </section>

      {run?.result &&
      typeof run.result === 'object' &&
      run.result !== null &&
      'provenance' in run.result ? (
        <ProvenanceViewer records={((run.result as { provenance?: ProvenanceRecord[] }).provenance ?? []) as ProvenanceRecord[]} />
      ) : null}
      <Timeline events={events} />

      <section className="card">
        <h2>Result & Verification</h2>
        <div className="grid two">
          <div>
            <h3>FINDINGS · PROPOSED ACTION · CONFIDENCE · UNCERTAINTY</h3>
            <pre>{JSON.stringify(run?.result ?? { state: 'IDLE' }, null, 2)}</pre>
          </div>
          <div>
            <h3>VERIFICATION · PASS / WARNING / FAIL · HUMAN APPROVAL</h3>
            <pre>{JSON.stringify(run?.verification ?? { state: 'IDLE' }, null, 2)}</pre>
          </div>
        </div>
        <p>AGENT PROPOSAL and HUMAN APPROVAL are separated in Approval Queue.</p>
      </section>
    </>
  )
}

function IntegrationStatusPage() {
  const grouped = {
    IMPLEMENTED: webmcpTools.filter((tool) => tool.connectionStatus !== 'NOT_CONNECTED'),
    NOT_CONNECTED: webmcpTools.filter((tool) => tool.connectionStatus === 'NOT_CONNECTED'),
  }

  return (
    <section className="card">
      <h2>Integration Status</h2>
      <h3>IMPLEMENTED</h3>
      <ul>{grouped.IMPLEMENTED.slice(0, 8).map((tool) => <li key={tool.name}>{tool.name}</li>)}</ul>
      <h3>NOT CONNECTED / NOT IMPLEMENTED</h3>
      <ul>{grouped.NOT_CONNECTED.slice(0, 12).map((tool) => <li key={tool.name}>{tool.name}</li>)}</ul>
    </section>
  )
}

function ExportsPage() {
  const sample = {
    metadata: { source: 'ForgeMCP', generatedAt: new Date().toISOString() },
    evidence: ['No fake metrics included'],
    provenance: [],
    verification: { state: 'INSUFFICIENT_DATA' },
    results: {},
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'forgemcp-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="card">
      <h2>Result Export</h2>
      <button type="button" onClick={exportJson}>Export Structured JSON</button>
    </section>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <StatusBadge value="NOT CONNECTED" />
      <p>This area is explicitly not connected yet.</p>
    </section>
  )
}

function MoreMenu() {
  const [openPath, setOpenPath] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const open = openPath === location.pathname

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenPath(null)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenPath(null)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return <div className="desktop-more" ref={menuRef}>
    <button type="button" aria-expanded={open} aria-controls="desktop-more-menu" onClick={() => setOpenPath(open ? null : location.pathname)}>More</button>
    {open ? <div id="desktop-more-menu">
      <Link to="/dashboard">Control Center</Link><Link to="/stations">3D Station Tests</Link><Link to="/research-archive">Research Archive</Link><Link to="/tools">WebMCP Tools</Link><Link to="/approval">Human Approval</Link><Link to="/integrations">Integration Status</Link><Link to="/subscription">Cube Premium · TEST</Link><Link to="/shop-lab">3D + Shopify · TEST</Link>
    </div> : null}
  </div>
}

function App() {
  useEffect(() => {
    void registerWebMcpTools()
  }, [])

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="site-brand" to="/"><span>FORGE</span>MCP<small>WEBMCP CONTROL LAYER</small></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link to="/">Reviewer Home</Link>
          <Link to="/labmcp">Terra Observatory</Link>
          <Link to="/game-studio">Cube Chess / Game Studio</Link>
          <Link to="/challenge">WebMCP Proof</Link>
          <MoreMenu />
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/terra" element={<ResearchErrorBoundary><LabMcp /></ResearchErrorBoundary>} />
          <Route path="/labmcp" element={<ResearchErrorBoundary><LabMcp /></ResearchErrorBoundary>} />
          <Route path="/research-archive" element={<ResearchErrorBoundary><ResearchArchive /></ResearchErrorBoundary>} />
          <Route path="/stations" element={<ResearchStations />} />
          <Route path="/hazard" element={<ResearchErrorBoundary><LabMcp /></ResearchErrorBoundary>} />
          <Route path="/game-studio" element={<GameStudio />} />
          <Route path="/cube" element={<GameStudio />} />
          <Route path="/selfplay" element={<GameStudio />} />
          <Route path="/creation" element={<GameStudio />} />
          <Route path="/cube-premium" element={<CubePremiumSubscription />} />
          <Route path="/subscription" element={<CubePremiumSubscription />} />
          <Route path="/shop-lab" element={<ProductLab />} />
          <Route path="/shopify-test" element={<ProductLab />} />
          <Route path="/tools" element={<ToolInspector />} />
          <Route path="/verification" element={<Placeholder title="Verification" />} />
          <Route path="/provenance" element={<ProvenanceViewer records={[]} />} />
          <Route path="/challenge" element={<ChallengeEvidence />} />
          <Route path="/architecture" element={<Placeholder title="Architecture" />} />
          <Route path="/docs" element={<Placeholder title="Documentation" />} />
          <Route path="/about" element={<Placeholder title="About" />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/integrations" element={<IntegrationStatusPage />} />
          <Route path="/approval" element={<ApprovalQueue />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        <NavLink end to="/"><b>⌂</b><span>Home</span></NavLink><NavLink to="/labmcp"><b>◎</b><span>Terra</span></NavLink><NavLink to="/game-studio"><b>♟</b><span>Cube</span></NavLink><NavLink to="/challenge"><b>✓</b><span>Proof</span></NavLink><NavLink to="/stations"><b>✦</b><span>3D</span></NavLink>
      </nav>
    </div>
  )
}

export default App