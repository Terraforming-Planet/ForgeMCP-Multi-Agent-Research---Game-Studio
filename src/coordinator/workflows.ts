import type { ScientificResult, WorkflowEvent, WorkflowRun } from '../types/core'
import { searchLocation, findObservations } from '../integrations/terra/adapter'
import { inspectPosition } from '../integrations/cube/adapter'
import { verifyScientificEvidence } from '../verification/engine'

function eventBase(workflow: string, tool: string, target: WorkflowEvent['integrationTarget']): Omit<WorkflowEvent, 'status' | 'durationMs' | 'resultType' | 'verificationState'> {
  return {
    timestamp: new Date().toISOString(),
    workflow,
    tool,
    inputSummary: '',
    integrationTarget: target,
  }
}

export async function runTerraRiskWorkflow(request: string): Promise<WorkflowRun<ScientificResult>> {
  const startedAt = new Date().toISOString()
  const events: WorkflowEvent[] = []

  const locationStart = Date.now()
  const locations = await searchLocation(request)
  const target = locations[0]
  events.push({
    ...eventBase('terra-risk', 'search_location', 'terra'),
    inputSummary: request,
    status: 'PASS',
    durationMs: Date.now() - locationStart,
    resultType: 'location_results',
    verificationState: 'PASS',
  })

  const observationStart = Date.now()
  const observationResult = await findObservations(target?.lat ?? 0, target?.lon ?? 0, 14)
  events.push({
    ...eventBase('terra-risk', 'find_observations', 'terra'),
    inputSummary: `${target?.lat ?? 0}, ${target?.lon ?? 0}`,
    status: observationResult.observations.length > 0 ? 'PASS' : 'WARNING',
    durationMs: Date.now() - observationStart,
    resultType: 'observation_results',
    verificationState: observationResult.observations.length > 0 ? 'WARNING' : 'INSUFFICIENT_DATA',
  })

  const verification = verifyScientificEvidence(
    observationResult.observations.length,
    observationResult.provenance.length > 0,
  )

  const result: ScientificResult = {
    state: observationResult.observations.length > 0 ? 'PRELIMINARY_RISK_ALERT' : 'INSUFFICIENT_DATA',
    location: target?.displayName ?? 'Unknown',
    timeWindow: 'Last 14 days',
    indicators: observationResult.observations.map((o) => o.title).slice(0, 3),
    sources: ['NASA EONET', 'OpenStreetMap Nominatim'],
    evidence: observationResult.observations.map((o) => `${o.title} (${o.date})`),
    confidence: observationResult.observations.length > 0 ? 0.45 : undefined,
    uncertainties: ['Satellite-only context', 'No in-situ field measurements'],
    verificationRequired: true,
    requiredMeasurements: ['Field validation', 'Hydrological measurements'],
    provenance: observationResult.provenance,
  }

  return {
    id: crypto.randomUUID(),
    workflow: 'terra-risk',
    request,
    state: verification.state === 'FAIL' ? 'FAILED' : 'WAITING_FOR_HUMAN',
    agents: ['research-coordinator', 'source-scout', 'eo-analyst', 'hazard-agent', 'evidence-verifier'],
    tools: ['search_location', 'find_observations', 'verify_evidence'],
    events,
    result,
    verification,
    errors: [],
    startedAt,
    completedAt: new Date().toISOString(),
  }
}

export async function runCubeInspectionWorkflow(position: { x: number; y: number; z: number }): Promise<WorkflowRun<Record<string, unknown>>> {
  const startedAt = new Date().toISOString()
  const inspectStart = Date.now()
  const inspect = await inspectPosition(position.x, position.y, position.z)

  return {
    id: crypto.randomUUID(),
    workflow: 'cube-inspection',
    request: `Inspect position ${position.x},${position.y},${position.z}`,
    state: inspect.cubeConnection === 'CONNECTED' ? 'VERIFYING' : 'WARNING',
    agents: ['game-coordinator', 'qa-agent'],
    tools: ['inspect_position'],
    events: [
      {
        ...eventBase('cube-inspection', 'inspect_position', 'cube'),
        inputSummary: JSON.stringify(position),
        status: inspect.cubeConnection === 'CONNECTED' ? 'PASS' : 'NOT CONNECTED',
        durationMs: Date.now() - inspectStart,
        resultType: 'position_inspection',
        verificationState: inspect.cubeConnection === 'CONNECTED' ? 'INSUFFICIENT_DATA' : 'WARNING',
      },
    ],
    result: inspect,
    verification: {
      state: inspect.cubeConnection === 'CONNECTED' ? 'WARNING' : 'INSUFFICIENT_DATA',
      checks: ['Cube endpoint reachability', 'Coordinate validity'],
      evidenceReferences: [inspect.notation],
      uncertainties: ['Remote engine execution bridge not implemented'],
      timestamp: new Date().toISOString(),
      reason: 'Read-only inspection only in current stage.',
    },
    errors: [],
    startedAt,
    completedAt: new Date().toISOString(),
  }
}
