import { describe, expect, it, vi } from 'vitest'
import { detectWebMcpAvailability, registerWebMcpTools } from '../webmcp/detection'

describe('webmcp detection', () => {
  it('returns unavailable when model context is missing', () => {
    document.modelContext = undefined
    expect(detectWebMcpAvailability()).toBe('WEBMCP_UNAVAILABLE')
  })
  it('registers executable tool handlers when supported',async()=>{const registerTool=vi.fn();document.modelContext={registerTool};const result=await registerWebMcpTools();expect(result.registered).toBeGreaterThan(20);expect(registerTool.mock.calls[0]?.[0].execute).toBeTypeOf('function')})
})
