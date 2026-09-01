import { describe, expect, it } from 'vitest'
import { screenSignals, type HydrologyScreening, type WorkerAreaAnalysis } from '../integrations/terra/hazardInvestigation'

function analysis(hydrology: HydrologyScreening): WorkerAreaAnalysis {
  return {
    ai_visual_image_count: 4,
    analysis: {
      headline: 'Test',
      what_is_visible: 'A waterbody is visible.',
      change_over_time: 'Free text says reduced open water and a blocked channel.',
      water_assessment: 'Review matched seasons.',
      hydrology_screening: hydrology,
      notable_features: [],
      confidence: { level: 'medium', reason: 'Representative scenes only.' },
      limitations: [],
      recommended_next_step: 'Verify in the field.',
    },
  } as unknown as WorkerAreaAnalysis
}

const base: HydrologyScreening = {
  water_change_state: 'VISIBLE_WATER_REDUCTION_CANDIDATE',
  temporal_basis: 'Comparable supplied scenes show less visible water.',
  inflow_outflow_status: 'VISIBLE_CANDIDATES',
  candidate_features: ['possible inlet channel'],
  main_and_tributary_context: 'Main and tributary flow direction is not established.',
  required_checks: ['Verify official hydrography.'],
  cause_status: 'NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE',
}

describe('structured hydrology screening', () => {
  it('uses the structured water-change state before free-text screening', () => {
    const signals = screenSignals(analysis(base), ['water-loss'])
    expect(signals).toHaveLength(1)
    expect(signals[0].meaning).toBe('STRUCTURED_HYDROLOGY_SCREENING_NOT_CAUSAL_PROOF')
  })

  it('does not turn contradictory free text into water loss when the structured state is insufficient', () => {
    const signals = screenSignals(analysis({ ...base, water_change_state: 'INSUFFICIENT_EVIDENCE' }), ['water-loss'])
    expect(signals).toEqual([])
  })

  it('does not equate a visible inlet candidate with an obstruction', () => {
    expect(screenSignals(analysis(base), ['flow-obstruction'])).toEqual([])
    const signals = screenSignals(analysis({ ...base, candidate_features: ['blocked culvert candidate'] }), ['flow-obstruction'])
    expect(signals[0]?.hazardType).toBe('flow-obstruction')
  })
})
