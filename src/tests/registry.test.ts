import { describe, expect, it } from 'vitest'
import { webmcpTools } from '../webmcp/registry'

describe('tool registry', () => {
  it('includes required first safe tools', () => {
    const names = webmcpTools.map((t) => t.name)
    expect(names).toContain('get_forgemcp_status')
    expect(names).toContain('list_capabilities')
    expect(names).toContain('get_integration_status')
    expect(names).toContain('inspect_test_001_evidence')
    expect(names).toContain('resolve_reference_dataset')
    expect(names).toContain('find_global_water_analogues')
    expect(names).toContain('inspect_local_hydrology_context')
    expect(names).toContain('run_labmcp_test_001')
    expect(names).toContain('inspect_hazard_signals')
    expect(names).toContain('plan_hazard_investigation')
    expect(names).toContain('analyze_multiyear_imagery')
    expect(names).toContain('retrieve_multiyear_imagery')
    expect(names).toContain('rank_causal_hypotheses')
    expect(names).toContain('draft_preliminary_risk_alert')
    expect(names).toContain('propose_recovery_options')
    expect(names).toContain('record_ground_verification')
    expect(names).toContain('run_hazard_investigation')
  })
})
