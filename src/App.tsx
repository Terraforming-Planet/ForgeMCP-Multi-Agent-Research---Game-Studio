import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './index.css'
import cosmicHero from './assets/forgemcp-hero-background.webp'
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
import { RESEARCH_STATION_PRESETS } from './data/researchStations'
import { checkCubeHealth } from './integrations/cube/adapter'
import { checkTerraHealth } from './integrations/terra/adapter'
import type { ProvenanceRecord, WorkflowRun } from './types/core'
import { detectWebMcpAvailability, registerWebMcpTools } from './webmcp/detection'
import { webmcpTools } from './webmcp/registry'

function Home() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')

  function openResearch(event: FormEvent) {
    event.preventDefault()
    const query = region.trim()
    navigate(query ? `/labmcp?region=${encodeURIComponent(query)}` : '/labmcp')
  }

  return (
    <>
      <section className="cosmic-hero">
        <img className="cosmic-hero__media" src={cosmicHero} alt="" aria-hidden="true" />
        <div className="cosmic-hero__content">
          <p className="hero-kicker">WEBMCP ORCHESTRATION · EARTH + GAME AI</p>
          <h1 className="cosmic-title">FORGE<span>MCP</span></h1>
          <p className="hero-repo-name">MULTI-AGENT RESEARCH × GAME STUDIO</p>
          <p className="hero-lead">One WebMCP control layer for two difficult worlds: evidence-first Earth observation and deterministic game creation. Agents may investigate, simulate and propose; verified evidence and human approval remain the authority.</p>
          <div className="hero-actions">
            <Link className="button-link button-link--primary" to="/labmcp">Search satellite evidence</Link>
            <Link className="button-link" to="/game-studio">Open Game Studio</Link>
            <Link className="button-link button-link--commerce" to="/shop-lab">3D + Shopify Test</Link>
          </div>
          <form className="hero-search" onSubmit={openResearch}>
            <label htmlFor="hero-region">Place, lake, river, mountain range or region</label>
            <div><input id="hero-region" value={region} onChange={event => setRegion(event.target.value)} placeholder="e.g. Lake Chad, Wisła, Himalayas" /><button type="submit">Open Terra investigation</button></div>
            <small>Search resolves a place first. Satellite evidence, hypotheses and an unsent alert draft appear only after the Terra run returns.</small>
          </form>
        </div>
      </section>

      <section className="workspace-launchpad" aria-label="ForgeMCP workspaces">
        <article className="workspace-card workspace-card--terra">
          <span className="workspace-number">01</span><p className="eyebrow">OBSERVE · INVESTIGATE · VERIFY</p>
          <h2>Terra Satellite Research</h2>
          <p>Search a real place, compare official/public Earth-observation products across years, examine water, terrain and hazard signals, then preserve uncertainty and source provenance.</p>
          <ul><li>Original satellite inputs are labelled</li><li>20 × 1 km sparse patrol option</li><li>Preliminary alert stays unsent</li></ul>
          <Link className="button-link button-link--primary" to="/labmcp">Open the satellite search</Link>
        </article>

        <article className="workspace-card workspace-card--game">
          <span className="workspace-number">02</span><p className="eyebrow">LEARN · COMPETE · CREATE</p>
          <h2>Game Studio</h2>
          <p>Apply Arctic, Sahara, Ocean and Earth–Space materials to board and piece concepts, inspect Cube work in progress and execute the real four-game deterministic benchmark.</p>
          <ul><li>Cube Chess 8×8×8 reference</li><li>Classic + Lab LEDColor previews</li><li>Reversible visual QA</li></ul>
          <div className="workspace-card__actions"><Link className="button-link button-link--primary" to="/game-studio">Open Game Studio</Link><Link className="button-link button-link--quiet" to="/subscription">Subskrypcja Cube Chess · 30 dni za darmo</Link></div>
        </article>

        <article className="workspace-card workspace-card--commerce">
          <span className="workspace-number">03</span><p className="eyebrow">ASSISTANT · CODEX · PRODUCT TEST</p>
          <h2>3D + Shopify Lab</h2>
          <p>Prepare a figurine, board, texture or station-shell specification; preview the concept; run QA; and create Shopify/RFQ drafts without fake checkout or supplier claims.</p>
          <ul><li>Codex agent prompt handoff</li><li>Two project-specific Shopify tests</li><li>Payment and RFQ remain blocked</li></ul>
          <Link className="button-link button-link--commerce" to="/shop-lab">Open the test lab</Link>
        </article>
      </section>

      <section className="card why-two-projects">
        <div><p className="eyebrow">WHY TWO PROJECTS?</p><h2>One safety pattern, tested in reality and simulation</h2></div>
        <div className="why-grid">
          <article><span>EARTH</span><h3>Terra tests evidence discipline</h3><p>Public observations can be incomplete and consequences matter. Agents must expose provenance, uncertainty, alternative hypotheses and field-verification gates.</p></article>
          <article><span>GAME</span><h3>Cube tests repeatable decisions</h3><p>A deterministic engine provides legal moves, replays and reversible candidate evaluation without pretending that a heuristic result is Elo or neural training.</p></article>
          <article><span>WEBMCP</span><h3>Forge joins the workflow</h3><p>Human request → coordinator → specialist tool → visible result → deterministic QA → explicit human decision.</p></article>
        </div>
      </section>

      <section className="home-stations">
        <div className="section-heading"><div><p className="eyebrow">FOUR RESEARCH-STATION CONCEPTS</p><h2>From environmental missions to game materials</h2></div><Link to="/stations">Inspect all concepts →</Link></div>
        <div className="home-station-grid">{RESEARCH_STATION_PRESETS.map(station => <article key={station.id} style={{ '--station-accent': station.accent } as CSSProperties}><span>{station.code}</span><h3>{station.name}</h3><p>{station.subtitle}</p><small>{station.status}</small><div><a href={station.publicUrl} target="_blank" rel="noreferrer">Source station ↗</a><Link to={`/game-studio?station=${station.id}`}>Use texture →</Link></div></article>)}</div>
      </section>

      <section className="card home-training">
        <p className="eyebrow">AUDITABLE TRAINING CONTEXT</p><h2>Historical evidence never becomes a current-run claim</h2>
        <div className="training-grid">
          <article><b>100,000</b><span>virtual curriculum games</span><p>Alpha-Beta policy tuning in Cube PR #101 — not full legal games or neural training.</p></article>
          <article><b>3,000</b><span>legal policy rollouts</span><p>53,993 plies in Cube PR #102 — separate from Forge's current four-game benchmark.</p></article>
          <article><b>200,016</b><span>Terra #3 streamed windows</span><p>75-region protocol evidence; the production Worker does not load the L4 checkpoint.</p></article>
          <article><b>9,561</b><span>Terra #4 steps</span><p>95 real scientific pairs and 9 validation pairs; not environmental ground truth.</p></article>
        </div>
      </section>
    </>
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
      <Link to="/dashboard">Control Center</Link><Link to="/stations">4 Station Concepts</Link><Link to="/subscription">Subskrypcja Cube Chess · TEST</Link><Link to="/research-archive">Research Archive</Link><Link to="/tools">WebMCP Tools</Link><Link to="/challenge">Challenge Evidence</Link><Link to="/approval">Human Approval</Link><Link to="/integrations">Integration Status</Link>
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
          <Link to="/">Home</Link>
          <Link to="/labmcp">Terra Satellite Lab</Link>
          <Link to="/game-studio">Game Studio</Link>
          <Link to="/subscription">Subskrypcja Cube Chess <small>TEST 30 DNI</small></Link>
          <Link to="/shop-lab">3D + Shopify <small>TEST</small></Link>
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
        <NavLink end to="/"><b>⌂</b><span>Home</span></NavLink><NavLink to="/labmcp"><b>◎</b><span>Terra</span></NavLink><NavLink to="/game-studio"><b>♟</b><span>Studio</span></NavLink><NavLink to="/subscription"><b>★</b><span>Premium</span></NavLink><NavLink to="/stations"><b>✦</b><span>Stations</span></NavLink>
      </nav>
    </div>
  )
}

export default App