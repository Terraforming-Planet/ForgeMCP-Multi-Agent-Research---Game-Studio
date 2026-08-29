import { describe, expect, it } from 'vitest'
import { webmcpTools } from '../webmcp/registry'

describe('tool registry', () => {
  it('includes required first safe tools', () => {
    const names = webmcpTools.map((t) => t.name)
    expect(names).toContain('get_forgemcp_status')
    expect(names).toContain('list_capabilities')
    expect(names).toContain('get_integration_status')
  })
})
