import { beforeEach, describe, expect, it } from 'vitest'
import type { HazardInvestigationResult } from '../integrations/terra/hazardInvestigation'
import { DEFAULT_IMAGERY_DISPLAY } from '../integrations/terra/imageryDisplay'
import {
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
        analysis: { headline: 'Visible change candidate', change_over_time: 'Water-like pixels appear reduced.', water_assessment: 'Requires NDWI and field checks.' },
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
  beforeEach(() => localStorage.clear())

  it('saves a concise, deduplicated candidate record instead of raw imagery', () => {
    const first = createResearchArchiveEntry(result('run-1'), DEFAULT_IMAGERY_DISPLAY)
    saveResearchArchiveEntry(first)
    saveResearchArchiveEntry({ ...first, savedAt: '2026-09-01T20:00:00Z' })

    const archive = readResearchArchive()
    expect(archive).toHaveLength(1)
    expect(archive[0].learningStatus).toBe('CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING')
    expect(archive[0].displaySettings.evidenceMeaning).toBe('DISPLAY_ONLY_NOT_MODEL_INPUT')
    expect(JSON.stringify(archive[0])).not.toContain('image.jpg')
  })

  it('fails closed on malformed browser data', () => {
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, '{not-json')
    expect(readResearchArchive()).toEqual([])
  })
})
