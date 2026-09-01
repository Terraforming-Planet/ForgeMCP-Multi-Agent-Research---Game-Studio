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
  })
})
