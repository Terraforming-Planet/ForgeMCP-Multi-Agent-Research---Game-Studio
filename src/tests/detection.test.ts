import { describe, expect, it, vi } from 'vitest'
import { detectWebMcpAvailability, registerWebMcpTools } from '../webmcp/detection'
import { webmcpTools } from '../webmcp/registry'

describe('webmcp detection', () => {
  it('returns unavailable when model context is missing', () => {
    document.modelContext = undefined
    expect(detectWebMcpAvailability()).toBe('WEBMCP_UNAVAILABLE')
  })
  it('registers every executable handler, including guarded integration boundaries, once per model context', async () => {
    const registerTool = vi.fn()
    document.modelContext = { registerTool }

    const result = await registerWebMcpTools()
    const repeated = await registerWebMcpTools()

    expect(result.registered).toBe(webmcpTools.length)
    expect(repeated.registered).toBe(webmcpTools.length)
    expect(registerTool).toHaveBeenCalledTimes(webmcpTools.length)
    expect(registerTool.mock.calls[0]?.[0].execute).toBeTypeOf('function')
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toContain('create_shopify_test_cart')
    expect(registerTool.mock.calls.map(([tool]) => tool.name)).toContain('submit_b2b_rfq')
  })
})
