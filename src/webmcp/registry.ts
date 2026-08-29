import type { IntegrationHealth } from '../types/core'
import {
  cubeInspectPositionInputSchema,
  locationSearchInputSchema,
  locationSearchOutputSchema,
  statusOutputSchema,
} from './contracts'

export type ToolDomain = 'terra' | 'cube' | 'visual' | 'verification' | 'system'

export interface WebMcpToolDefinition {
  name: string
  domain: ToolDomain
  description: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  readOnly: boolean
  requiresApproval: boolean
  connectionStatus: IntegrationHealth
  verificationPolicy: string
}

const terraNotImplemented = ['set_area_of_interest', 'create_research_station', 'set_station_timespan', 'add_station_dataset', 'compare_dates', 'compare_seasons', 'inspect_water', 'inspect_river', 'inspect_lake', 'inspect_terrain', 'get_elevation_profile', 'inspect_dryland', 'find_paleochannel_candidates', 'assess_environmental_risk', 'verify_evidence', 'generate_research_report']

const cubeNotImplemented = ['get_game_state', 'get_legal_moves', 'create_ai_candidate', 'start_selfplay', 'run_ai_tournament', 'inspect_game', 'analyze_blunders', 'compare_ai_versions', 'tune_policy', 'evaluate_candidate', 'promote_ai_candidate', 'rollback_ai_candidate', 'inspect_visual_state', 'propose_visual_improvement', 'run_game_tests']

export const webmcpTools: WebMcpToolDefinition[] = [
  {
    name: 'get_forgemcp_status',
    domain: 'system',
    description: 'Returns ForgeMCP runtime status and integration summary.',
    inputSchema: {},
    outputSchema: { type: 'object', fields: Object.keys(statusOutputSchema.shape) },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'CONNECTED',
    verificationPolicy: 'System heartbeat and statuses only',
  },
  {
    name: 'list_capabilities',
    domain: 'system',
    description: 'Lists currently registered tools and states.',
    inputSchema: {},
    outputSchema: { tools: ['name', 'domain', 'status'] },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'CONNECTED',
    verificationPolicy: 'No mutation, transparent tool inventory',
  },
  {
    name: 'get_integration_status',
    domain: 'system',
    description: 'Returns connection health for ForgeMCP, WebMCP, Terra and Cube.',
    inputSchema: {},
    outputSchema: { forge: 'CONNECTED|DEGRADED|NOT_CONNECTED|ERROR|UNKNOWN' },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'CONNECTED',
    verificationPolicy: 'Explicit connection-state report only',
  },
  {
    name: 'search_location',
    domain: 'terra',
    description: 'Read-only geospatial location lookup for AOI setup.',
    inputSchema: { type: 'object', fields: Object.keys(locationSearchInputSchema.shape) },
    outputSchema: { type: 'object', fields: Object.keys(locationSearchOutputSchema.shape) },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'CONNECTED',
    verificationPolicy: 'Location only, no scientific claim',
  },
  {
    name: 'find_observations',
    domain: 'terra',
    description: 'Fetches recent public environmental events for AOI context.',
    inputSchema: { lat: 'number', lon: 'number', days: 'number<=60' },
    outputSchema: { source: 'NASA EONET', events: 'array' },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'DEGRADED',
    verificationPolicy: 'Classify as observation/anomaly only',
  },
  {
    name: 'inspect_position',
    domain: 'cube',
    description: 'Read-only cube coordinate validation and remote health check.',
    inputSchema: { type: 'object', fields: Object.keys(cubeInspectPositionInputSchema.shape) },
    outputSchema: { isInsideBoard: 'boolean', cubeConnection: 'health status' },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'DEGRADED',
    verificationPolicy: 'No engine mutation; deterministic coordinate check only',
  },
  ...terraNotImplemented.map((name) => ({
    name,
    domain: 'terra' as const,
    description: 'Contract reserved; explicit NOT_IMPLEMENTED response.',
    inputSchema: {},
    outputSchema: { state: 'NOT_IMPLEMENTED' },
    readOnly: true,
    requiresApproval: false,
    connectionStatus: 'NOT_CONNECTED' as IntegrationHealth,
    verificationPolicy: 'Not implemented',
  })),
  ...cubeNotImplemented.map((name) => ({
    name,
    domain: 'cube' as const,
    description: 'Contract reserved; explicit NOT_IMPLEMENTED response.',
    inputSchema: {},
    outputSchema: { state: 'NOT_IMPLEMENTED' },
    readOnly: true,
    requiresApproval: name.includes('promote') || name.includes('rollback'),
    connectionStatus: 'NOT_CONNECTED' as IntegrationHealth,
    verificationPolicy: 'Not implemented',
  })),
]
