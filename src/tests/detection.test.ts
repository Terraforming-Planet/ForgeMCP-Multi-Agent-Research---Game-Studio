import { describe, expect, it } from 'vitest'
import { detectWebMcpAvailability } from '../webmcp/detection'

describe('webmcp detection', () => {
  it('returns unavailable when model context is missing', () => {
    document.modelContext = undefined
    expect(detectWebMcpAvailability()).toBe('WEBMCP_UNAVAILABLE')
  })
})
