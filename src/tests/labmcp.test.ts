import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GLOBAL_CASEBOOK_URLS,
  TEST_001_FIELD_REPORT_URL,
  TEST_001_MEASUREMENT_URL,
  VISTULA_REFERENCE_URL,
  runLabMcpTest001,
} from '../integrations/terra/labmcp'

const measurement = {
  method: 'Visible-pond multi-year consensus',
  historical_consensus_years: [1990, 1991, 1992],
  recommended_working_measurement: {
    persistent_historical_visible_footprint_m2: 17_722.2,
    persistent_historical_visible_footprint_ha: 1.7722,
    conservative_lower_m2: 16_269.3,
    repeat_supported_upper_m2: 21_642,
    broad_union_upper_m2: 23_978.3,
    '1990_overlap_fraction': 0.92528,
    '2026_open_water_area_m2': null,
    '2026_state': 'Exact residual open-water area in 2026 is not published.',
    loss_percent_status: 'not published',
  },
  interpretation: {
    precision_warning: 'Historical Landsat resolution limits small-pond precision.',
  },
}

const fieldReport = {
  evidence_class: 'AUTHOR_FIELD_OBSERVATION',
  independently_verified: false,
  official_documentary_record_attached: false,
  causal_claim: false,
  repair_effect_claim: false,
  observations_reported_by_author: ['Reported low water'],
  interpretation_constraints: ['Independent field verification required'],
}

const vistulaReference = {
  case_id: 'vistula-test-014',
  deterministic_claim_verification: {
    evidence_class: 'DATASET_INTEGRITY',
    record_count: 74,
    accepted_count: 72,
    environmental_finding_claim: false,
    water_loss_claim: false,
    causal_claim: false,
  },
}

const globalCases = Array.from({ length: 91 }, (_, index) => ({
  id: `case-${String(index).padStart(3, '0')}`,
  name: `Validated water case ${index}`,
  countries: [`Region ${index}`],
  record_status: 'validated_case',
  case_type: 'shallow water-body change',
  mechanisms: index % 2 ? ['drought', 'reduced inflow'] : ['drainage', 'groundwater'],
  observed_pattern: 'Recorded drying or water-level change',
  management_lesson: 'Verify local controls before transfer',
  source_urls: [`https://official.example.test/case-${index}`],
  evidence_class: 'OFFICIAL_OR_SCIENTIFIC_SOURCE',
}))

describe('LabMCP TEST 001 truth gates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      let body: unknown
      if (url === TEST_001_MEASUREMENT_URL) body = measurement
      else if (url === TEST_001_FIELD_REPORT_URL) body = fieldReport
      else if (url === VISTULA_REFERENCE_URL) body = vistulaReference
      else {
        const catalogIndex = GLOBAL_CASEBOOK_URLS.findIndex(candidate => candidate === url)
        if (catalogIndex < 0) return { ok: false, status: 404, json: async () => ({}) } as Response
        body = {
          generated_at_utc: '2026-09-01T00:00:00Z',
          cases: globalCases.filter((_, index) => index % GLOBAL_CASEBOOK_URLS.length === catalogIndex),
        }
      }
      return { ok: true, status: 200, json: async () => body } as Response
    }))
  })

  it('confirms only the recorded anomaly and preserves all causal uncertainty', async () => {
    const result = await runLabMcpTest001({ referenceQuery: 'Toruń', analogueLimit: 12 })

    expect(result.signalState).toBe('ANOMALOUS_RECORDED')
    expect(result.environmentalState).toBe('HYPOTHESIS')
    expect(result.qaStatus).toBe('WARNING')
    expect(result.evidence.recordedResult.historicalPersistentFootprintM2).toBe(17_722.2)
    expect(result.evidence.recordedResult.openWaterArea2026M2).toBeNull()
    expect(result.evidence.recordedResult.exactLossPercentPublished).toBe(false)
    expect(result.evidence.recordedResult.causeEstablished).toBe(false)
    expect(result).not.toHaveProperty('confidence')
    expect(result.hypothesisMatrix.every(item => item.evidence !== 'SUPPORTS')).toBe(true)
  })

  it('leaves Toruń unresolved and returns twelve region-diverse context analogues', async () => {
    const result = await runLabMcpTest001({ referenceQuery: 'Toruń', analogueLimit: 12 })

    expect(result.reference.status).toBe('REFERENCE_DATASET_UNRESOLVED')
    expect(result.reference.automaticSelectionMade).toBe(false)
    expect(result.reference.candidates[0]?.retrievalMode).toBe('CURATED_SOURCE_REFERENCE')
    expect(result.reference.candidates[1]?.retrievalMode).toBe('LIVE_JSON_RETRIEVAL')
    expect(result.analogues.searchedCases).toBe(91)
    expect(result.analogues.selectedCases).toHaveLength(12)
    expect(new Set(result.analogues.selectedCases.map(item => item.countries[0])).size).toBe(12)
    expect(result.analogues.selectedCases.every(item => item.transferability === 'CONTEXT_ONLY')).toBe(true)
    expect(result.provenance.filter(item => item.requestParameters.retrievalMode === 'CURATED_SOURCE_REFERENCE')).toHaveLength(5)
  })
})
