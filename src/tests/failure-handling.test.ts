import { describe, expect, it } from 'vitest'
import { verifyScientificEvidence } from '../verification/engine'

describe('failure handling', () => {
  it('returns fail without provenance', () => {
    const result = verifyScientificEvidence(3, false)
    expect(result.state).toBe('FAIL')
  })

  it('returns insufficient data when no observations', () => {
    const result = verifyScientificEvidence(0, true)
    expect(result.state).toBe('INSUFFICIENT_DATA')
  })
})
