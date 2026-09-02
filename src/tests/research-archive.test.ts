import { beforeEach, describe, expect, it } from 'vitest'
import type { HazardInvestigationResult } from '../integrations/terra/hazardInvestigation'
import { DEFAULT_IMAGERY_DISPLAY } from '../integrations/terra/imageryDisplay'
import {
  RESEARCH_ARCHIVE_BACKUP_KEY,
  RESEARCH_ARCHIVE_KEY,
  createResearchArchiveEntry,
  readResearchArchive,
  saveResearchArchiveEntry,
} from '../lib/researchArchive'

function result(runId: string): HazardInvestigationResult {
  return {
    runId,
    classification: 'HYPOTHESIS',
    signalState: 'SCREENING_CANDIDATE',
    area: { resolvedName: 'Test lake', latitude: 50, longitude: 20, radiusKm: 4 },
    period: { startYear: 2000, endYear: 2026, season: 'summer', timelineMode: 'representative' },
    hazards: ['water-loss'],
    imagery: {
      visuallyInspectedByModel: 4,
      slots: [{ year: 2026, status: 'image', image: { year: 2026, date: '2026-07-01', source: 'NASA', url: 'https://example.org/image.jpg', original_url: 'https://example.org/image.jpg', scene_id: null, cloud_cover: null, cloud_preference_met: false } }],
      requestedYears: [2000, 2026],
      missingYears: 1,
      analysis: {
        analysis: {
          headline: 'Visible change candidate',
          change_over_time: 'Water-like pixels appear reduced.',
          water_assessment: 'Requires NDWI and field checks.',
          hydrology_screening: {
            water_change_state: 'VISIBLE_WATER_REDUCTION_CANDIDATE',
            temporal_basis: 'Matched representative scenes show less visible open water.',
            inflow_outflow_status: 'VISIBLE_CANDIDATES',
            candidate_features: ['possible inlet channel'],
            main_and_tributary_context: 'The main waterbody is visible; flow direction is not established.',
            required_checks: ['Verify official hydrography.'],
            cause_status: 'NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE',
            visible_water_extrema: {
              status: 'ESTABLISHED',
              most_visible_water_year: 2000,
              least_visible_water_year: 2026,
              compared_years: [2000, 2012, 2026],
              method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
              basis: 'Three matched-season images show the largest and smallest relative visible-water extents.',
            },
          },
        },
      },
    },
    verification: { state: 'WARNING', reason: 'Field verification required.' },
    observations: [{ evidenceClass: 'OBSERVATION', statement: 'A visible pattern was recorded.', source: 'NASA', limitation: 'RGB only.' }],
    hypotheses: [{ id: 'H1', hazardType: 'water-loss', hypothesis: 'A flow change may have contributed.', status: 'UNTESTED', priority: 1, supportingEvidence: [], contradictingEvidence: [], requiredChecks: ['Measure flow.'] }],
    sourceStatus: [{ id: 'nasa', name: 'NASA GIBS', provider: 'NASA', state: 'PASS', role: 'imagery', detail: 'available', sourceUrl: 'https://earthdata.nasa.gov/' }],
    limitations: ['No field measurements.'],
  } as unknown as HazardInvestigationResult
}

describe('research archive', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('saves a concise, deduplicated candidate record instead of raw imagery', () => {
    const first = createResearchArchiveEntry(result('run-1'), DEFAULT_IMAGERY_DISPLAY)
    const saved = saveResearchArchiveEntry(first)
    saveResearchArchiveEntry({ ...first, savedAt: '2026-09-01T20:00:00Z' })

    const archive = readResearchArchive()
    expect(saved.storage).toBe('local')
    expect(archive).toHaveLength(1)
    expect(archive[0].learningStatus).toBe('CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING')
    expect(archive[0].displaySettings.evidenceMeaning).toBe('DISPLAY_ONLY_NOT_MODEL_INPUT')
    expect(archive[0].hydrology?.waterChangeState).toBe('VISIBLE_WATER_REDUCTION_CANDIDATE')
    expect(archive[0].hydrology?.causeStatus).toBe('NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE')
    expect(archive[0].waterExtrema?.mostVisibleWaterYear).toBe(2000)
    expect(archive[0].waterExtrema?.leastVisibleWaterYear).toBe(2026)
    expect(archive[0].shortSummary.some(item => item.includes('najwięcej: 2000'))).toBe(true)
    expect(JSON.stringify(archive[0])).not.toContain('image.jpg')
  })

  it('writes a verified backup and recovers when the primary record is damaged', () => {
    const entry = createResearchArchiveEntry(result('run-backup'), DEFAULT_IMAGERY_DISPLAY)
    saveResearchArchiveEntry(entry)
    expect(localStorage.getItem(RESEARCH_ARCHIVE_BACKUP_KEY)).toBeTruthy()

    localStorage.setItem(RESEARCH_ARCHIVE_KEY, '{damaged-primary')

    expect(readResearchArchive().map(item => item.runId)).toEqual(['run-backup'])
  })

  it('archives the regional patrol manifest and its honest sparse-coverage limit', () => {
    const patrolResult = result('run-patrol')
    if (!patrolResult.imagery.analysis) throw new Error('Missing analysis fixture.')
    patrolResult.imagery.analysis.regional_patrol = {
      status: 'COMPLETE_SPARSE_SCREENING',
      requested_tiles: 20,
      generated_tiles: 20,
      inspected_tiles: 20,
      frame_width_km: 1,
      source_date: '2026-08-20',
      source: 'NASA HLS S30',
      nominal_resolution_m: 30,
      aoi_radius_km: 20,
      aoi_area_km2: 1256.64,
      nominal_sampled_area_upper_bound_km2: 20,
      nominal_coverage_upper_bound_percent: 1.59,
      uninspected_area_lower_bound_percent: 98.41,
      full_coverage: false,
      selection_method: 'DETERMINISTIC_GOLDEN_ANGLE_SPATIAL_STRATIFICATION_NOT_HYDROGRAPHY_TARGETED',
      temporal_scope: 'ONE_RECENT_HLS_DATE_SPATIAL_SCREENING',
      temporal_change_supported_by_patrol_alone: false,
      tile_manifest: Array.from({ length: 20 }, (_, index) => ({
        tile_id: `P${String(index + 1).padStart(2, '0')}`,
        latitude: 50 + index * 0.001,
        longitude: 20 + index * 0.001,
        status: 'INSPECTED_BY_MODEL' as const,
      })),
      limitations: ['Sparse one-date sampling.'],
    }
    patrolResult.imagery.analysis.analysis.regional_patrol_assessment = {
      status: 'PARTIAL_TILE_REVIEW',
      overview: 'One visible-water candidate was retained for review.',
      inspected_tile_ids: ['P01'],
      tiles_with_visible_open_water: ['P01'],
      tiles_with_wetland_or_wet_soil: [],
      tiles_with_possible_channel: ['P01'],
      tiles_with_cloud_shadow_or_no_data: [],
      tile_findings: [{ tile_id: 'P01', surface_class: 'OPEN_WATER', hydrology_feature: 'MAIN_WATERBODY', observation: 'Visible water candidate.', confidence: 'medium' }],
      limitations: ['One-date sample.'],
    }

    saveResearchArchiveEntry(createResearchArchiveEntry(patrolResult, DEFAULT_IMAGERY_DISPLAY))
    const [entry] = readResearchArchive()
    expect(entry.regionalPatrol?.inspectedTiles).toBe(20)
    expect(entry.regionalPatrol?.coverageUpperBoundPercent).toBe(1.59)
    expect(entry.regionalPatrol?.uninspectedAreaLowerBoundPercent).toBe(98.41)
    expect(entry.regionalPatrol?.fullCoverage).toBe(false)
    expect(entry.regionalPatrol?.tileManifest).toHaveLength(20)
    expect(entry.regionalPatrol?.assessmentStatus).toBe('PARTIAL_TILE_REVIEW')
    expect(entry.regionalPatrol?.tileFindings?.[0].tileId).toBe('P01')
    expect(entry.shortSummary.some(item => item.includes('nie jest to pełne pokrycie'))).toBe(true)
  })

  it('fails closed on malformed browser data', () => {
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, '{not-json')
    expect(readResearchArchive()).toEqual([])
  })

  it('rejects a partial legacy record that would crash the archive view', () => {
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, JSON.stringify([{
      schemaVersion: '1.0',
      runId: 'partial-run',
      savedAt: '2026-09-01T20:00:00Z',
      shortSummary: ['incomplete'],
      hypotheses: [],
    }]))

    expect(readResearchArchive()).toEqual([])
  })

  it('rejects a corrupted established water ranking', () => {
    const entry = createResearchArchiveEntry(result('run-corrupt'), DEFAULT_IMAGERY_DISPLAY)
    entry.waterExtrema = {
      ...entry.waterExtrema!,
      mostVisibleWaterYear: null,
      leastVisibleWaterYear: 2026,
      comparedYears: [2000, 2026],
    }
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, JSON.stringify([entry]))
    expect(readResearchArchive()).toEqual([])
  })

  it('archives the quantitative TEST 001 fixed-crop finding without raw images', () => {
    const testResult = result('run-test001')
    testResult.test001Context = {
      evidence: {
        recordedResult: {
          correctedPondSeed: { lat: 53.594595, lon: 19.00014 },
          requestedFrameWidthM: 500,
          evidenceCropWidthM: 468.75,
          mostVisibleHistoricalYear: 2008,
          mostVisibleHistoricalAreaM2: 20_780.8,
          mostVisibleHistoricalAreaHa: 2.0781,
          leastVisibleEndpointYear: 2026,
          approximateDisappearedHistoricalFootprintM2: 17_722.2,
          approximateDisappearedHistoricalFootprintHa: 1.7722,
          nearTotalStateTransitionSupported: true,
          historicalPersistentFootprintM2: 17_722.2,
          historicalPersistentFootprintHa: 1.7722,
          repeatSupportedRangeM2: [16_269.3, 21_642],
          broadHistoricalUpperEnvelopeM2: 23_978.3,
          overlap1990WithCentralConsensusPercent: 92.528,
          recentState: 'No comparable persistent dark-water footprint is visible.',
          lossPercentStatus: 'Near-total; exact percentage uncertainty-gated.',
          comparisonImages: [{ year: 2000, role: 'HISTORICAL_FIXED_CROP', url: 'https://example.org/evidence.png' }],
          stateChangeSupported: true,
          openWaterArea2026M2: null,
          exactLossPercentPublished: false,
          causeEstablished: false,
          sourceMethod: 'Fixed-crop consensus',
          sourceYears: [1998, 1999, 2000, 2004, 2005, 2006, 2008],
        },
      },
      reference: {},
      connectivity: [],
    } as unknown as HazardInvestigationResult['test001Context']

    saveResearchArchiveEntry(createResearchArchiveEntry(testResult, DEFAULT_IMAGERY_DISPLAY))
    const [entry] = readResearchArchive()

    expect(entry.test001Finding?.mostVisibleHistoricalYear).toBe(2008)
    expect(entry.test001Finding?.leastVisibleEndpointYear).toBe(2026)
    expect(entry.test001Finding?.approximateDisappearedHistoricalFootprintHa).toBe(1.7722)
    expect(entry.test001Finding?.exactOpenWaterArea2026M2).toBeNull()
    expect(entry.test001Finding?.causeStatus).toBe('NOT_ESTABLISHED')
    expect(entry.shortSummary.some(item => item.includes('niemal całkowity zanik'))).toBe(true)
    expect(entry.shortSummary.some(item => item.includes('najwięcej: 2000'))).toBe(false)
    expect(entry.waterExtrema).toBeUndefined()
    expect(JSON.stringify(entry)).not.toContain('evidence.png')
  })

  it('removes a conflicting legacy live-image ranking from a TEST 001 archive record', () => {
    const testResult = result('run-test001-legacy')
    testResult.test001Context = {
      evidence: {
        recordedResult: {
          correctedPondSeed: { lat: 53.594595, lon: 19.00014 },
          requestedFrameWidthM: 500,
          mostVisibleHistoricalYear: 2008,
          mostVisibleHistoricalAreaHa: 2.0781,
          leastVisibleEndpointYear: 2026,
          approximateDisappearedHistoricalFootprintHa: 1.7722,
          historicalPersistentFootprintHa: 1.7722,
          repeatSupportedRangeM2: [16_269.3, 21_642],
        },
      },
    } as unknown as HazardInvestigationResult['test001Context']
    const legacy = createResearchArchiveEntry(testResult, DEFAULT_IMAGERY_DISPLAY)
    legacy.waterExtrema = {
      status: 'ESTABLISHED',
      mostVisibleWaterYear: 2000,
      leastVisibleWaterYear: 2026,
      comparedYears: [2000, 2026],
      method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
      basis: 'Legacy live subset ranking.',
    }
    legacy.shortSummary.push('Widoczna woda — najwięcej: 2000; najmniej: 2026.')
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, JSON.stringify([legacy]))

    const [normalized] = readResearchArchive()
    expect(normalized.waterExtrema).toBeUndefined()
    expect(normalized.shortSummary.some(item => item.includes('najwięcej: 2000'))).toBe(false)
    expect(normalized.test001Finding?.mostVisibleHistoricalYear).toBe(2008)
  })
})
