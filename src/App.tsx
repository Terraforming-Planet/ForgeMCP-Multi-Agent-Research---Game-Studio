import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import './index.css'
import { agentRegistry } from './agents/registry'
import { ApprovalQueue } from './components/ApprovalQueue'
import { ChallengeEvidence } from './components/ChallengeEvidence'
import { CubeLab } from './components/CubeLab'
import { LabMcp } from './components/LabMcp'
import { ProvenanceViewer } from './components/ProvenanceViewer'
import { ResearchStations } from './components/ResearchStations'
import { StatusBadge } from './components/StatusBadge'
import { Timeline } from './components/Timeline'
import { ToolInspector } from './components/ToolInspector'
import { runCoordinator } from './coordinator/workflows'
import { checkCubeHealth } from './integrations/cube/adapter'
import { checkTerraHealth } from './integrations/terra/adapter'
import type { ProvenanceRecord, WorkflowRun } from './types/core'
import { detectWebMcpAvailability, registerWebMcpTools } from './webmcp/detection'
import { webmcpTools } from './webmcp/registry'

function Home() {
  return (
    <section className="card">
      <h1>ForgeMCP</h1>
      <p>Observe the Real World. Learn &amp; Compete. Create. Verify.</p>
      <p>
        ForgeMCP connects humans and specialized agents through real WebMCP tools to Terra Observation System and Cube Chess 512.
      </p>
    </section>
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
              <button type="button" onClick={() => execute('Run LabMCP TEST 001 for Lake Kuchnia and Toruń reference resolution')}>Demo: LabMCP TEST 001</button>
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

function App() {
  useEffect(() => {
    void registerWebMcpTools()
  }, [])

  return (
    <div className="app-shell">
      <header>
        <h1>ForgeMCP Dashboard</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/terra">Terra Research</Link>
          <Link to="/labmcp">LabMCP</Link>
          <Link to="/stations">Research Stations</Link>
          <Link to="/hazard">Hazard Intelligence</Link>
          <Link to="/cube">Cube AI Lab</Link>
          <Link to="/selfplay">Self-Play Lab</Link>
          <Link to="/creation">Game Creation Studio</Link>
          <Link to="/tools">WebMCP Tools</Link>
          <Link to="/verification">Verification</Link>
          <Link to="/provenance">Provenance</Link>
          <Link to="/challenge">Challenge Evidence</Link>
          <Link to="/architecture">Architecture</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/about">About</Link>
          <Link to="/exports">Exports</Link>
          <Link to="/integrations">Integration Status</Link>
          <Link to="/approval">Human Approval</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/terra" element={<Dashboard />} />
          <Route path="/labmcp" element={<LabMcp />} />
          <Route path="/stations" element={<ResearchStations />} />
          <Route path="/hazard" element={<Placeholder title="Hazard Intelligence" />} />
          <Route path="/cube" element={<CubeLab />} />
          <Route path="/selfplay" element={<Dashboard />} />
          <Route path="/creation" element={<Dashboard />} />
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
        </Routes>
      </main>
    </div>
  )
}

export default App
