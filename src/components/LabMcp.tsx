import { useState } from 'react'
import type { LabMcpTest001Result } from '../integrations/terra/labmcp'
import { getTool } from '../webmcp/registry'
import { ProvenanceViewer } from './ProvenanceViewer'
import { StatusBadge } from './StatusBadge'

type ToolEnvelope = {
  state?: string
  data?: LabMcpTest001Result
  error?: string
  verification?: string
}

function isToolEnvelope(value: unknown): value is ToolEnvelope {
  return typeof value === 'object' && value !== null
}

export function LabMcp() {
  const [result, setResult] = useState<LabMcpTest001Result | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    setError('')
    try {
      const response = await getTool('run_labmcp_test_001')?.execute({ referenceQuery: 'Toruń', analogueLimit: 12 })
      if (!isToolEnvelope(response) || !response.data) throw new Error(isToolEnvelope(response) ? response.error ?? 'LabMCP returned no structured result.' : 'LabMCP tool is unavailable.')
      setResult(response.data)
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setRunning(false)
    }
  }

  const exportJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${result.runId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <section className="card lab-hero">
      <div>
        <p className="eyebrow">LABMCP · RESEARCH / EXPERIMENTAL · TERRA TEST 001</p>
        <h1>Forest Pond near Lake Kuchnia</h1>
        <p>Hypothetical hazard detection with public recorded evidence, an explicit Toruń reference resolver, a deterministic search across validated global hydrology cases, and an independent evidence gate.</p>
      </div>
      <div className="lab-status-stack">
        <StatusBadge value={result?.signalState ?? 'NOT RUN'} />
        <StatusBadge value={result?.environmentalState ?? 'HYPOTHESIS'} />
        <StatusBadge value={result ? `QA ${result.qaStatus}` : 'QA NOT RUN'} />
      </div>
    </section>

    <section className="card">
      <h2>Pre-registered scope</h2>
      <div className="lab-facts">
        <article><small>AOI CENTER</small><b>53.591400, 19.010717</b><span>Projected 2 × 2 km · EPSG:2180</span></article>
        <article><small>TIME</small><b>1990–2026</b><span>Matched spring / autumn evidence</span></article>
        <article><small>RUN MODE</small><b>Recorded evidence · live retrieval</b><span>No fresh EO processing is claimed</span></article>
        <article><small>CAUSAL LIMIT</small><b>Ground verification required</b><span>Analogy is never local proof</span></article>
      </div>
      <div className="toolbar">
        <button type="button" onClick={run} disabled={running}>{running ? 'Running bounded tools…' : 'Run TEST 001 through WebMCP handler'}</button>
        <button type="button" onClick={exportJson} disabled={!result}>Export structured JSON</button>
      </div>
      {error ? <p className="lab-error" role="alert"><b>NOT CONNECTED:</b> {error}</p> : null}
    </section>

    {!result ? <section className="card"><h2>Awaiting run</h2><p>No result is pre-filled. Run the bounded handler to retrieve the public TEST 001, Vistula and global-casebook records.</p></section> : <>
      <section className="card lab-conclusion">
        <h2>Result</h2>
        <p>{result.conclusion}</p>
        <div className="grid two">
          <article>
            <h3>Confirmed from the recorded public evidence</h3>
            <ul>
              <li>Historical open-water state change: supported.</li>
              <li>Central persistent historical footprint: <b>{result.evidence.recordedResult.historicalPersistentFootprintM2.toLocaleString('en-US')} m² ({result.evidence.recordedResult.historicalPersistentFootprintHa.toFixed(4)} ha)</b>.</li>
              <li>Repeat-supported range: {result.evidence.recordedResult.repeatSupportedRangeM2[0].toLocaleString('en-US')}–{result.evidence.recordedResult.repeatSupportedRangeM2[1].toLocaleString('en-US')} m².</li>
              <li>1990 overlap with the central consensus: {result.evidence.recordedResult.overlap1990WithCentralConsensusPercent.toFixed(3)}%.</li>
            </ul>
          </article>
          <article>
            <h3>Not confirmed</h3>
            <ul>
              <li>Exact residual open-water area or exact loss percentage in 2026.</li>
              <li>Current hazard severity.</li>
              <li>A blocked inflow/outflow, damaged well, ditch, abstraction or other cause.</li>
              <li>A numerical comparison with the still unresolved Toruń dataset.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>Coordinator & active specialist agents</h2>
        <div className="lab-agent-grid">
          {result.agents.map(agent => <article key={agent.name}><StatusBadge value={agent.status} /><h3>{agent.name}</h3><p>{agent.role}</p></article>)}
        </div>
        <p className="lab-note">The ESA/Copernicus-oriented role is our agent using public ESA/CDSE sources. It is not an agent operated or endorsed by ESA.</p>
      </section>

      <section className="card">
        <h2>Toruń reference resolver</h2>
        <StatusBadge value={result.reference.status} />
        <p>{result.reference.comparisonFinding}</p>
        <div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Type / scope</th><th>Variables</th><th>Compatibility</th><th>Source</th></tr></thead><tbody>
          {result.reference.candidates.map(candidate => <tr key={candidate.id}>
            <td><b>{candidate.title}</b><br/><small>Query label found: {candidate.queryNameFoundInMetadata ? 'yes' : 'no'} · {candidate.retrievalMode}</small></td>
            <td>{candidate.datasetType}<br/><small>{candidate.spatialScope} · {candidate.temporalScope}</small></td>
            <td>{candidate.variables.join(', ')}{candidate.unit === null ? <><br/><small>unit unresolved</small></> : null}</td>
            <td><StatusBadge value={candidate.compatibility} /></td>
            <td><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Open evidence ↗</a></td>
          </tr>)}
        </tbody></table></div>
        <p><b>Human action required:</b> {result.reference.requiredHumanAction}</p>
      </section>

      <section className="card">
        <h2>Lake Kuchnia connectivity context</h2>
        <p className="lab-note">These are curated, source-linked documentary references. Their page/PDF contents are not fetched or revalidated by this browser run.</p>
        <div className="grid two">
          {result.connectivityContext.map(item => <article key={item.sourceUrl}><StatusBadge value={item.classification} /><h3>{item.sourceTitle}</h3><p>{item.statement}</p><p><small><b>Locator:</b> {item.contentLocator}<br/>{item.limitation}</small></p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open documentary source ↗</a></article>)}
        </div>
      </section>

      <section className="card">
        <h2>Competing hypotheses</h2>
        <div className="table-wrap"><table><thead><tr><th>ID</th><th>Hypothesis</th><th>Current evidence</th><th>Reason</th></tr></thead><tbody>
          {result.hypothesisMatrix.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.hypothesis}</td><td><StatusBadge value={item.evidence} /></td><td>{item.reason}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="card">
        <h2>Global analogue search</h2>
        <p>Searched <b>{result.analogues.searchedCases}</b> validated cases across {result.analogues.loadedCatalogs}/{result.analogues.searchedCatalogs} live public catalogues; returned <b>{result.analogues.selectedCases.length}</b>. Transferability: <StatusBadge value={result.analogues.transferability} /></p>
        <p><small>{result.analogues.selectionPolicy}</small></p>
        <div className="table-wrap"><table><thead><tr><th>Region</th><th>Recorded mechanisms</th><th>Observed pattern</th><th>Official/public evidence</th></tr></thead><tbody>
          {result.analogues.selectedCases.map(item => <tr key={item.id}><td><b>{item.name}</b><br/><small>{item.countries.join(', ')}</small></td><td>{item.mechanisms.join(', ')}</td><td>{item.observed_pattern ?? 'Not supplied'}</td><td>{item.source_urls.map((url, index) => <span key={url}><a href={url} target="_blank" rel="noreferrer">Source {index + 1} ↗</a>{index < item.source_urls.length - 1 ? ' · ' : ''}</span>)}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="card">
        <h2>Verification · proposed action · human decision</h2>
        <div className="grid two"><article><StatusBadge value={result.verification.state} /><h3>Evidence gate</h3><p>{result.verification.reason}</p><ul>{result.verification.checks.map(check => <li key={check}>{check}</li>)}</ul></article><article><StatusBadge value={result.humanApproval} /><h3>Next checks</h3><ol>{result.proposedActions.map(action => <li key={action}>{action}</li>)}</ol><p>No field intervention or alert publication was performed.</p></article></div>
      </section>

      <ProvenanceViewer records={result.provenance} />
    </>}
  </>
}
