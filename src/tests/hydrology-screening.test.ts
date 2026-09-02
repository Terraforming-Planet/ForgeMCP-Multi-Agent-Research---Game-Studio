import { describe, expect, it } from 'vitest'
import { getVisibleWaterExtrema, screenSignals, type HazardInvestigationResult, type HydrologyScreening, type WorkerAreaAnalysis } from '../integrations/terra/hazardInvestigation'

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

  it('keeps only a validated most/least visible-water ranking', () => {
    const hydrology: HydrologyScreening = {
      ...base,
      visible_water_extrema: {
        status: 'ESTABLISHED',
        most_visible_water_year: 2001,
        least_visible_water_year: 2025,
        compared_years: [2001, 2012, 2025],
        method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
        basis: 'Matched-season AOI images are interpretable.',
      },
    }
    const result = {
      hazards: ['water-loss'],
      imagery: { visuallyInspectedByModel: 3, analysis: analysis(hydrology) },
    } as unknown as HazardInvestigationResult
    expect(getVisibleWaterExtrema(result)?.most_visible_water_year).toBe(2001)
    expect(getVisibleWaterExtrema(result)?.least_visible_water_year).toBe(2025)
  })

  it('fails closed when an extrema year was not among compared years', () => {
    const hydrology: HydrologyScreening = {
      ...base,
      visible_water_extrema: {
        status: 'ESTABLISHED',
        most_visible_water_year: 1990,
        least_visible_water_year: 2025,
        compared_years: [2001, 2025],
        method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
        basis: 'Malformed upstream ranking.',
      },
    }
    const result = {
      hazards: ['water-loss'],
      imagery: { visuallyInspectedByModel: 2, analysis: analysis(hydrology) },
    } as unknown as HazardInvestigationResult
    expect(getVisibleWaterExtrema(result)?.status).toBe('INSUFFICIENT_EVIDENCE')
    expect(getVisibleWaterExtrema(result)?.most_visible_water_year).toBeNull()
  })

  it('fails closed when a TP26 ranking contains a coarse-only year', () => {
    const hydrology: HydrologyScreening = {
      ...base,
      visible_water_extrema: {
        status: 'ESTABLISHED',
        most_visible_water_year: 2001,
        least_visible_water_year: 2025,
        compared_years: [2001, 2020, 2025],
        method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
        basis: 'Upstream included one coarse year.',
      },
    }
    const worker = analysis(hydrology)
    worker.analysis_images = [
      { date: '2001-07-01', source: 'NASA GIBS', url: 'https://example.org/coarse.jpg', high_resolution_aoi: false },
      { date: '2020-07-01', source: 'Sentinel-2', url: 'https://example.org/2020.jpg', high_resolution_aoi: true },
      { date: '2025-07-01', source: 'Sentinel-2', url: 'https://example.org/2025.jpg', high_resolution_aoi: true },
    ]
    worker.tp26_protocol = { schema: 'tp26-multisensor-water-extrema-v1', role: 'gate', source_ladder: [], extrema_gate: 'high-resolution years only' }
    const result = {
      period: { startYear: 2000, endYear: 2026 },
      hazards: ['water-loss'],
      imagery: { visuallyInspectedByModel: 3, analysis: worker },
    } as unknown as HazardInvestigationResult
    expect(getVisibleWaterExtrema(result)?.status).toBe('INSUFFICIENT_EVIDENCE')
    expect(getVisibleWaterExtrema(result)?.basis).toMatch(/Bramka TP26/)
  })
})
