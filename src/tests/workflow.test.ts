import { describe, expect, it } from 'vitest'
import { evaluatePromotion, verifyScientificEvidence } from '../verification/engine'

describe('verification and promotion workflow states', () => {
  it('keeps preliminary alert in warning state', () => {
    const v = verifyScientificEvidence(2, true)
    expect(v.state).toBe('WARNING')
  })

  it('rejects promotion without improvements', () => {
    const p = evaluatePromotion({
      gamesCompleted: 10,
      illegalMoves: 0,
      baselineScore: 8,
      candidateScore: 7,
      regressionPass: true,
    })
    expect(p.state).toBe('REJECTED')
  })
})
