import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TERRA_EVIDENCE_API_URL,
  evaluateGroundVerification,
  runHazardInvestigation,
  type HazardInvestigationInput,
} from '../integrations/terra/hazardInvestigation'

const input: HazardInvestigationInput = {
  regionQuery: 'Test valley',
  latitude: 50,
  longitude: 20,
  radiusKm: 10,
  startYear: 2020,
  endYear: 2022,
  season: 'spring',
  hazardTypes: ['terrain-change'],
  depth: 'deep',
  timelineMode: 'annual',
}

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function workerAnalysis(options: {
  latitude?: number
  longitude?: number
  radiusKm?: number
  startDate?: string
  endDate?: string
  analysisYears?: number[]
} = {}) {
  const analysisImages = (options.analysisYears ?? [2020, 2021, 2022]).map(year => ({
    date: `${year}-04-15`,
    source: 'NASA HLS S30',
    url: `https://worker.example/model-${year}.jpg`,
    image_authenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT',
    product_kind: 'SINGLE_ACQUISITION_SURFACE_REFLECTANCE',
    ai_generated: false,
    used_as_model_input: true,
  }))
  return {
    service: 'terra-observation-area-analysis-v2',
    generated_at_utc: '2026-09-01T00:00:00Z',
    area: {
      place_name: 'Test valley',
      latitude: options.latitude ?? 50,
      longitude: options.longitude ?? 20,
      radius_km: options.radiusKm ?? 10,
    },
    period: { start_date: options.startDate ?? '2020-03-01', end_date: options.endDate ?? '2022-05-31' },
    depth: 'deep',
    preview_images: [],
    analysis_images: analysisImages,
    ai_visual_image_count: analysisImages.length,
    model_visual_image_count: analysisImages.length,
    imagery_authenticity_policy: {
      model_input_rule: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY',
      original_model_input_count: analysisImages.length,
      derived_model_input_count: 0,
      ai_generated_model_input_count: 0,
      derived_display_only_count: 0,
      ai_generated_images_present: false,
    },
    landsat_catalog: { matched: 38, returned: 12, scenes: [], query_url: 'https://landsat.example/query', full_catalog_url: 'https://landsat.example/all' },
    analysis: {
      headline: 'Visible terrain change candidate',
      what_is_visible: 'A valley, vegetation and a channel are visible.',
      change_over_time: 'A new excavation and erosion pattern is visible in the later supplied image.',
      water_assessment: 'No material water conclusion is possible.',
      hydrology_screening: {
        water_change_state: 'NO_VISIBLE_CHANGE_ESTABLISHED',
        temporal_basis: 'The supplied scenes are not sufficiently comparable to establish change.',
        inflow_outflow_status: 'INSUFFICIENT_EVIDENCE',
        candidate_features: [],
        main_and_tributary_context: 'The network cannot be resolved from the supplied overview images.',
        required_checks: ['Use official hydrography and matched-season imagery.'],
        cause_status: 'NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE',
        visible_water_extrema: {
          status: 'INSUFFICIENT_EVIDENCE',
          most_visible_water_year: null,
          least_visible_water_year: null,
          compared_years: [],
          method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
          basis: 'No comparable pair passed the evidence gate.',
        },
      },
      notable_features: ['New earthworks candidate near the channel.'],
      confidence: { level: 'medium', reason: `${analysisImages.length} representative images were supplied.` },
      limitations: ['Representative dates only.'],
      recommended_next_step: 'Acquire matched-season source products and survey the terrain.',
    },
    evidence_policy: 'official-public-only',
  }
}

function installFetch(
  analysisAvailable: boolean,
  inspectAnalysisRequest?: (body: Record<string, unknown>) => void,
  analysisResponse = workerAnalysis(),
) {
  vi.stubGlobal('fetch', vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = String(request)
    if (url === `${TERRA_EVIDENCE_API_URL}/research/analyze`) {
      const body = JSON.parse(String(init?.body)) as { season?: string }
      expect(body.season).toBe('spring')
      inspectAnalysisRequest?.(body)
      return analysisAvailable ? response(analysisResponse) : response({ error: 'Area analysis unavailable' }, false, 503)
    }
    if (url === `${TERRA_EVIDENCE_API_URL}/research/yearly-gallery`) {
      const body = JSON.parse(String(init?.body)) as { years: number[] }
      return response({
        service: 'terra-observation-yearly-gallery-v1',
        requested_years: body.years,
        policy: 'official browse imagery',
        slots: body.years.map(year => ({
          year,
          status: 'image',
          image: {
            year,
            date: `${year}-04-15`,
            source: 'USGS Landsat Collection 2',
            url: `https://worker.example/${year}.jpg`,
            original_url: `https://usgs.example/${year}.jpg`,
            scene_id: `scene-${year}`,
            cloud_cover: 5,
            cloud_preference_met: true,
          },
        })),
      })
    }
    if (url.startsWith('https://api.open-meteo.com/v1/elevation')) return response({ elevation: [100, 101, 102, 103, 104] })
    if (url.startsWith('https://eonet.gsfc.nasa.gov/api/v3/events')) return response({ events: [] })
    return response({}, false, 404)
  }))
}

describe('generic Terra hazard investigation truth gates', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('uses actual model-inspected image count and keeps cause as a hypothesis', async () => {
    installFetch(true)
    const result = await runHazardInvestigation(input)

    expect(result.area.resolutionMethod).toBe('SUPPLIED_COORDINATES')
    expect(result.imagery.visuallyInspectedByModel).toBe(3)
    expect(result.imagery.slots).toHaveLength(3)
    expect(result.signalState).toBe('SCREENING_CANDIDATE')
    expect(result.classification).toBe('HYPOTHESIS')
    expect(result.hypotheses.every(item => item.status !== 'WEAKENED_NOT_EXCLUDED')).toBe(true)
    expect(result.alertDraft.status).toBe('DRAFT_REQUIRES_HUMAN_APPROVAL')
    expect(result.alertDraft.delivery).toBe('NOT_SENT')
    expect(result.promotionGate.verifiedFindingAllowed).toBe(false)
    expect(result.provenance.some(item => item.operation === 'analyze_multiyear_imagery')).toBe(true)
  })

  it.each([
    ['coordinates', workerAnalysis({ latitude: 50.01 })],
    ['radius', workerAnalysis({ radiusKm: 11 })],
    ['period', workerAnalysis({ startDate: '2019-03-01' })],
  ])('rejects an analysis response with mismatched %s fail-closed', async (_mismatch, analysisResponse) => {
    installFetch(true, undefined, analysisResponse)
    const result = await runHazardInvestigation(input)

    expect(result.imagery.visuallyInspectedByModel).toBe(0)
    expect(result.imagery.analysis).toBeNull()
    expect(result.signalState).toBe('IMAGERY_NOT_VISUALLY_INSPECTED')
    expect(result.classification).toBe('INSUFFICIENT_DATA')
    expect(result.sourceStatus.find(item => item.id === 'terra-area-analysis')?.state).toBe('INSUFFICIENT_DATA')
    expect(result.observations.some(item => item.source.startsWith('Terra Worker'))).toBe(false)
  })

  it('rejects every model input when one analysis image is outside the requested period', async () => {
    installFetch(true, undefined, workerAnalysis({ analysisYears: [2020, 2021, 2022, 2023] }))
    const result = await runHazardInvestigation(input)

    expect(result.imagery.visuallyInspectedByModel).toBe(0)
    expect(result.imagery.analysis).toBeNull()
    expect(result.signalState).toBe('IMAGERY_NOT_VISUALLY_INSPECTED')
    expect(result.classification).toBe('INSUFFICIENT_DATA')
    expect(result.sourceStatus.find(item => item.id === 'terra-area-analysis')?.detail).toContain('2023-04-15')
    expect(result.observations.some(item => item.source.startsWith('Terra Worker'))).toBe(false)
  })

  it('does not promote a nearby custom AOI to TEST 001 without the explicit case ID', async () => {
    let analysisRequest: Record<string, unknown> = {}
    const customInput: HazardInvestigationInput = {
      ...input,
      regionQuery: 'Custom point next to TEST 001',
      latitude: 53.594595,
      longitude: 19.00014,
      radiusKm: 2,
    }
    installFetch(
      true,
      body => { analysisRequest = body },
      workerAnalysis({ latitude: 53.594595, longitude: 19.00014, radiusKm: 2 }),
    )

    const result = await runHazardInvestigation(customInput)

    expect(analysisRequest).not.toHaveProperty('case_id')
    expect(analysisRequest).not.toHaveProperty('focus_latitude')
    expect(result.toolsExecuted).not.toContain('inspect_test_001_evidence')
    expect(result.test001Context).toBeNull()
    expect(result.signalState).not.toBe('RECORDED_ANOMALY')
  })

  it('uses TEST 001 only when the explicit case ID, AOI and focus all match', async () => {
    let analysisRequest: Record<string, unknown> = {}
    const test001Input: HazardInvestigationInput = {
      ...input,
      regionQuery: 'Staw leśny przy Jeziorze Kuchnia, Polska — TEST 001',
      latitude: 53.594595,
      longitude: 19.00014,
      radiusKm: 2,
      caseId: 'test-001-forest-pond-kuchnia',
      focusLatitude: 53.594595,
      focusLongitude: 19.00014,
      focusRadiusKm: 0.25,
    }
    installFetch(
      true,
      body => { analysisRequest = body },
      workerAnalysis({ latitude: 53.594595, longitude: 19.00014, radiusKm: 2 }),
    )

    const result = await runHazardInvestigation(test001Input)

    expect(analysisRequest).toMatchObject({
      case_id: 'test-001-forest-pond-kuchnia',
      latitude: 53.594595,
      longitude: 19.00014,
      radius_km: 2,
      focus_latitude: 53.594595,
      focus_longitude: 19.00014,
      focus_radius_km: 0.25,
    })
    expect(result.toolsExecuted).toContain('inspect_test_001_evidence')
  })

  it.each([
    ['AOI coordinates', { latitude: 53.5947 }],
    ['AOI radius', { radiusKm: 3 }],
    ['focus coordinates', { focusLongitude: 19.0003 }],
    ['focus radius', { focusRadiusKm: 0.5 }],
  ])('rejects an explicit TEST 001 request with mismatched %s before fetching', async (_mismatch, override) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const test001Input: HazardInvestigationInput = {
      ...input,
      regionQuery: 'TEST 001',
      latitude: 53.594595,
      longitude: 19.00014,
      radiusKm: 2,
      caseId: 'test-001-forest-pond-kuchnia',
      focusLatitude: 53.594595,
      focusLongitude: 19.00014,
      focusRadiusKm: 0.25,
      ...override,
    }

    await expect(runHazardInvestigation(test001Input)).rejects.toThrow(/TEST 001 wymaga/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not pretend that catalogue images were visually inspected when the analysis Worker fails', async () => {
    installFetch(false)
    const result = await runHazardInvestigation(input)

    expect(result.imagery.slots.filter(item => item.status === 'image')).toHaveLength(3)
    expect(result.imagery.visuallyInspectedByModel).toBe(0)
    expect(result.signalState).toBe('IMAGERY_NOT_VISUALLY_INSPECTED')
    expect(result.classification).toBe('INSUFFICIENT_DATA')
    expect(result.alertDraft.status).toBe('NOT_RECOMMENDED_YET')
    expect(result.alertDraft.delivery).toBe('NOT_SENT')
    expect(result.sourceStatus.find(item => item.id === 'terra-area-analysis')?.state).toBe('NOT_CONNECTED')
  })

  it('forwards the 20-tile regional patrol and does not turn incomparable water evidence into no anomaly', async () => {
    let analysisRequest: Record<string, unknown> = {}
    installFetch(true, body => { analysisRequest = body })
    const result = await runHazardInvestigation({
      ...input,
      hazardTypes: ['water-loss'],
      spatialMode: 'regional-patrol',
      patrolTileCount: 20,
      patrolFrameWidthKm: 1,
    })

    expect(analysisRequest.spatial_mode).toBe('regional-patrol')
    expect(analysisRequest.patrol_tile_count).toBe(20)
    expect(analysisRequest.patrol_frame_width_km).toBe(1)
    expect(result.signalState).toBe('INCONCLUSIVE_EVIDENCE')
    expect(result.classification).toBe('INSUFFICIENT_DATA')
    expect(result.verification.state).toBe('INSUFFICIENT_DATA')
    expect(result.verification.reason).toContain('nie wolno zamieniać tego wyniku w „brak anomalii”')
    expect(result.toolsExecuted).toContain('inspect_regional_patrol_tiles')
  })

  it('allows only a complete, independently measured and human-approved field record to become a verified finding', () => {
    const incomplete = evaluateGroundVerification({
      verificationDate: '2026-08-20',
      method: 'GPS field inspection',
      finding: 'A channel obstruction was observed.',
      sourceUrl: 'https://example.org/report',
      independentlyVerified: false,
      measurementsAttached: true,
      responsibleExpert: 'Engineer A',
      humanApproved: true,
    })
    const complete = evaluateGroundVerification({
      verificationDate: '2026-08-20',
      method: 'Surveyed water levels and flow above and below the obstruction.',
      finding: 'The inspected culvert was obstructed at the stated coordinates and date.',
      sourceUrl: 'https://example.org/signed-field-report',
      independentlyVerified: true,
      measurementsAttached: true,
      responsibleExpert: 'Engineer A',
      humanApproved: true,
    })

    expect(incomplete.classification).toBe('HYPOTHESIS')
    expect(complete.classification).toBe('VERIFIED_FINDING')
  })
})
