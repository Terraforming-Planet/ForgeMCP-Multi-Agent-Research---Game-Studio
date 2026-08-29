export type IntegrationHealth = 'CONNECTED' | 'DEGRADED' | 'NOT_CONNECTED' | 'ERROR' | 'UNKNOWN'
export type WorkflowState =
  | 'IDLE'
  | 'PLANNING'
  | 'RUNNING'
  | 'VERIFYING'
  | 'WAITING_FOR_HUMAN'
  | 'COMPLETED'
  | 'WARNING'
  | 'FAILED'

export type VerificationState = 'PASS' | 'WARNING' | 'FAIL' | 'INSUFFICIENT_DATA'
export type EvidenceState =
  | 'OBSERVATION'
  | 'ANOMALY'
  | 'HYPOTHESIS'
  | 'PRELIMINARY_RISK_ALERT'
  | 'VERIFIED_FINDING'
  | 'INSUFFICIENT_DATA'

export type CapabilityLabel = 'LIVE' | 'REAL DATA' | 'REAL ENGINE' | 'RECORDED RESULT' | 'DEMO DATA' | 'NOT CONNECTED'

export interface AgentDefinition {
  id: string
  name: string
  domain: 'terra' | 'cube' | 'visual' | 'verification' | 'system'
  responsibility: string
  allowedToolCategories: string[]
  readWrite: 'read' | 'write'
  verificationRequirements: string[]
}

export interface WorkflowEvent {
  order?: number
  coordinatorDecision?: string
  specialistAgent?: string
  provenance?: string
  timestamp: string
  tool: string
  workflow: string
  inputSummary: string
  integrationTarget: 'terra' | 'cube' | 'visual' | 'verification' | 'system'
  status: 'READY' | 'RUNNING' | 'PASS' | 'WARNING' | 'FAIL' | 'NOT CONNECTED' | 'AWAITING APPROVAL'
  durationMs: number
  resultType: string
  verificationState: VerificationState
  error?: string
}

export interface WorkflowRun<T = unknown> {
  id: string
  workflow: string
  request: string
  state: WorkflowState
  agents: string[]
  tools: string[]
  events: WorkflowEvent[]
  result?: T
  verification?: VerificationResult
  errors: string[]
  startedAt: string
  completedAt?: string
}

export interface ProvenanceRecord {
  provider: string
  dataset: string
  aoi: string
  dateTime: string
  operation: string
  tool: string
  timestamp: string
  confidence?: number
  uncertainty?: string
  requestParameters: Record<string, unknown>
}

export interface ScientificResult {
  state: EvidenceState
  location: string
  timeWindow: string
  indicators: string[]
  sources: string[]
  evidence: string[]
  confidence?: number
  uncertainties: string[]
  verificationRequired: boolean
  requiredMeasurements: string[]
  provenance: ProvenanceRecord[]
}

export interface VerificationResult {
  state: VerificationState
  checks: string[]
  evidenceReferences: string[]
  uncertainties: string[]
  timestamp: string
  reason: string
}

export interface ResearchStation {
  id: string
  name: string
  researchQuestion: string
  aoi: string
  coordinates: string
  timespan: string
  datasets: string[]
  observations: string[]
  findings: string[]
  hypotheses: string[]
  alerts: string[]
  confidence?: number
  verificationState: VerificationState
  provenance: ProvenanceRecord[]
  createdAt: string
  updatedAt: string
}

export type CandidateState =
  | 'NOT_EVALUATED'
  | 'REJECTED'
  | 'ELIGIBLE_FOR_REVIEW'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'PROMOTED'
  | 'ROLLED_BACK'

export interface AiExperiment {
  id: string
  baselineVersion: string
  candidateVersion: string
  gameCount: number
  seed: number
  sideSwap: boolean
  timeLimitMs: number
  searchSettings: string
  gamesCompleted: number
  wins: number
  draws: number
  losses: number
  illegalMoves: number
  nodes: number | null
  moveTimesMs: number[]
  metricsNotes: string
}

export interface PromotionDecision {
  state: CandidateState
  legalityPass: boolean
  regressionPass: boolean
  improvementPass: boolean
  humanApprovalRequired: boolean
  rationale: string
}

export interface HumanApprovalItem {
  id: string
  action: 'PROMOTE_AI_CANDIDATE' | 'APPLY_VISUAL_CHANGE' | 'ACCEPT_VERIFIED_FINDING'
  requestingAgent: string
  reason: string
  evidence: string[]
  risk: string
  reversibility: string
  verification: string
  decision?: 'APPROVE' | 'REJECT'
}

export interface VisualProposal {
  id: string
  target: string
  problem: string
  proposedChange: string
  expectedBenefit: string
  beforeReference: string
  afterReference: string
  tests: string[]
  qaStatus: 'PENDING' | 'PASS' | 'FAIL' | 'AWAITING_EVIDENCE'
  humanDecision?: 'APPROVE' | 'REJECT'
}
