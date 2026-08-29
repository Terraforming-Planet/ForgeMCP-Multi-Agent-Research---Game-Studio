import type { PromotionDecision, VerificationResult } from '../types/core'

export function verifyScientificEvidence(observationsCount: number, hasProvenance: boolean): VerificationResult {
  if (!hasProvenance) {
    return {
      state: 'FAIL',
      checks: ['Provenance missing'],
      evidenceReferences: [],
      uncertainties: ['No source provenance'],
      timestamp: new Date().toISOString(),
      reason: 'Cannot verify evidence without provenance.',
    }
  }

  if (observationsCount === 0) {
    return {
      state: 'INSUFFICIENT_DATA',
      checks: ['No observations found'],
      evidenceReferences: ['Observation query result empty'],
      uncertainties: ['No recent events in selected AOI'],
      timestamp: new Date().toISOString(),
      reason: 'Insufficient observations for risk classification.',
    }
  }

  return {
    state: 'WARNING',
    checks: ['Observations found', 'Provenance attached'],
    evidenceReferences: ['NASA EONET observations'],
    uncertainties: ['Ground truth not available in workflow'],
    timestamp: new Date().toISOString(),
    reason: 'Preliminary alert only; field verification required.',
  }
}

export function evaluatePromotion(input: {
  gamesCompleted: number
  illegalMoves: number
  baselineScore: number
  candidateScore: number
  regressionPass: boolean
}): PromotionDecision {
  const legalityPass = input.illegalMoves === 0
  const improvementPass = input.candidateScore > input.baselineScore

  if (input.gamesCompleted <= 0 || !legalityPass || !input.regressionPass || !improvementPass) {
    return {
      state: 'REJECTED',
      legalityPass,
      regressionPass: input.regressionPass,
      improvementPass,
      humanApprovalRequired: false,
      rationale: 'Candidate failed one or more promotion gates.',
    }
  }

  return {
    state: 'AWAITING_HUMAN_APPROVAL',
    legalityPass,
    regressionPass: input.regressionPass,
    improvementPass,
    humanApprovalRequired: true,
    rationale: 'Candidate passed automated gates and awaits human approval.',
  }
}
