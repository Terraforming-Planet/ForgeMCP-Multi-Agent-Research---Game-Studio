import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LabMcp } from '../components/LabMcp'
import type { HazardInvestigationResult } from '../integrations/terra/hazardInvestigation'
import { getTool } from '../webmcp/registry'

vi.mock('../webmcp/registry', () => ({ getTool: vi.fn() }))

function investigationResult(): HazardInvestigationResult {
  return {
    schemaVersion: '2.0',
    workflowVersion: 'terra-labmcp-hazard-investigation-v2',
    runId: 'gallery-regression',
    requestedAt: '2026-09-02T08:00:00Z',
    completedAt: '2026-09-02T08:01:00Z',
    classification: 'HYPOTHESIS',
    signalState: 'SCREENING_CANDIDATE',
    qaStatus: 'WARNING',
    humanDecision: 'REQUIRED_BEFORE_PUBLICATION_OR_INTERVENTION',
    area: {
      requestedName: 'TEST 001', resolvedName: 'TEST 001', latitude: 53.5914, longitude: 19.010717,
      radiusKm: 2, resolutionMethod: 'SUPPLIED_COORDINATES', alternativeMatches: 0,
    },
    period: { startYear: 2020, endYear: 2026, season: 'autumn', timelineMode: 'representative' },
    hazards: ['water-loss'],
    sourceStatus: [],
    agents: [],
    toolsExecuted: [],
    imagery: {
      requestedYears: [2020, 2026],
      slots: [
        {
          year: 2020,
          status: 'image',
          image: {
            year: 2020, date: '2020-09-01', source: 'Test source',
            url: 'https://example.org/preview-2020.jpg', original_url: 'https://example.org/original-2020.jpg',
            scene_id: 'scene-2020', cloud_cover: undefined as unknown as null, cloud_preference_met: true,
            image_authenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT', product_kind: 'FULL_RESOLUTION_BROWSE', ai_generated: false, used_as_model_input: false,
          },
        },
        {
          year: 2026,
          status: 'image',
          image: {
            year: 2026, date: '2026-09-01', source: 'Test source',
            url: 'https://example.org/preview-2026.jpg', original_url: 'https://example.org/original-2026.jpg',
            scene_id: 'scene-2026', cloud_cover: 5, cloud_preference_met: true,
            image_authenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT', product_kind: 'FULL_RESOLUTION_BROWSE', ai_generated: false, used_as_model_input: false,
          },
        },
      ],
      visuallyInspectedByModel: 2,
      galleryImageSlotsNotClaimedAsInspected: 2,
      missingYears: 0,
      analysis: {
        service: 'test', generated_at_utc: '2026-09-02T08:01:00Z',
        area: { place_name: 'TEST 001', latitude: 53.5914, longitude: 19.010717, radius_km: 2 },
        period: { start_date: '2020-09-01', end_date: '2026-09-01' }, depth: 'deep',
        preview_images: [], analysis_images: [], ai_visual_image_count: 2,
        imagery_authenticity_policy: {
          model_input_rule: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY',
          original_model_input_count: 2,
          derived_model_input_count: 0,
          ai_generated_model_input_count: 0,
          derived_display_only_count: 0,
          ai_generated_images_present: false,
        },
        landsat_catalog: { matched: 2, returned: 2, scenes: [], query_url: null, full_catalog_url: null },
        analysis: {
          headline: 'Porównanie wymaga kontroli.', what_is_visible: 'Widoczna woda.',
          change_over_time: 'Dwie sceny.', water_assessment: 'Ranking jakościowy.',
          hydrology_screening: {
            water_change_state: 'VISIBLE_WATER_REDUCTION_CANDIDATE', temporal_basis: 'Dwa lata.',
            inflow_outflow_status: 'INSUFFICIENT_EVIDENCE', candidate_features: [],
            main_and_tributary_context: 'Kierunek przepływu nieustalony.', required_checks: ['Kontrola terenowa.'],
            cause_status: 'NOT_ESTABLISHED_FROM_SUPPLIED_EVIDENCE',
            visible_water_extrema: {
              status: 'ESTABLISHED', most_visible_water_year: 2020, least_visible_water_year: 2026,
              compared_years: [2020, 2026], method: 'QUALITATIVE_VISUAL_RANKING_OF_SUPPLIED_IMAGES',
              basis: 'Dwa porównywalne wycinki AOI.',
            },
          },
          notable_features: [], confidence: { level: 'medium', reason: 'Dwie sceny.' },
          limitations: ['Brak pomiaru terenowego.'], recommended_next_step: 'Kontrola terenowa.',
        },
        evidence_policy: 'Hypothesis only.',
      },
      warning: 'Galeria nie jest pomiarem.',
    },
    observations: [], screeningSignals: [], hypotheses: [],
    alertDraft: {
      evidenceClass: 'INSUFFICIENT_DATA', status: 'NOT_RECOMMENDED_YET', delivery: 'NOT_SENT',
      audiences: [], title: 'Brak alertu', message: 'Brak podstaw.', requestedActions: [], publicationRequirements: [],
    },
    recoveryOptions: [], requiredFieldChecks: ['Kontrola terenowa.'],
    verification: {
      state: 'WARNING', checks: [], evidenceReferences: [], uncertainties: ['Brak terenu.'],
      timestamp: '2026-09-02T08:01:00Z', reason: 'Wymagana kontrola terenowa.',
    },
    promotionGate: { verifiedFindingAllowed: false, currentStage: 'HYPOTHESIS', requirements: [] },
    analogues: null, test001Context: null, provenance: [], limitations: ['Brak terenu.'],
  }
}

describe('LabTerra image gallery resilience', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.mocked(getTool).mockReturnValue({
      execute: vi.fn().mockResolvedValue({ state: 'WARNING', verification: 'WARNING', data: investigationResult() }),
    } as never)
  })

  afterEach(() => cleanup())

  it('reads dimensions synchronously and keeps the result visible after image load', async () => {
    render(<MemoryRouter><LabMcp /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' }))
    await screen.findByRole('heading', { name: 'TEST 001' })
    fireEvent.click(screen.getByRole('button', { name: 'Załaduj lekkie podglądy zdjęć' }))

    const image = screen.getByAltText('Obraz satelitarny dla roku 2020') as HTMLImageElement
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 640 })
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 480 })
    fireEvent.load(image)

    await waitFor(() => expect(screen.getByText(/lekki podgląd 640×480/)).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Rok maksimum i minimum widocznej wody' })).toBeInTheDocument()
  })

  it('contains one failed image instead of crashing the whole page', async () => {
    render(<MemoryRouter><LabMcp /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' }))
    await screen.findByRole('heading', { name: 'TEST 001' })
    fireEvent.click(screen.getByRole('button', { name: 'Załaduj lekkie podglądy zdjęć' }))
    fireEvent.error(screen.getByAltText('Obraz satelitarny dla roku 2026'))

    await screen.findByText('Podgląd niedostępny — pozostała karta źródłowa.')
    expect(screen.getByRole('heading', { name: 'TEST 001' })).toBeInTheDocument()
    expect(screen.getByAltText('Obraz satelitarny dla roku 2020')).toBeInTheDocument()
  })

  it('sends the corrected 500 m TEST 001 focus and shows the fixed-crop finding', async () => {
    const fixedResult = investigationResult()
    fixedResult.signalState = 'RECORDED_ANOMALY'
    fixedResult.test001Context = {
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
          comparisonImages: [
            { year: 2000, role: 'ORIGINAL_HISTORICAL_SATELLITE_SOURCE', url: 'https://example.org/test001-2000.png', imageAuthenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT', productKind: 'PINNED_NATIVE_AOI_EXPORT', aiGenerated: false, usedAsModelInput: false },
            { year: 2026, role: 'ORIGINAL_RECENT_SATELLITE_SOURCE', url: 'https://example.org/test001-2026.png', imageAuthenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT', productKind: 'PINNED_NATIVE_AOI_EXPORT', aiGenerated: false, usedAsModelInput: false },
          ],
          derivedComparisonImages: [
            { year: 2000, role: 'HISTORICAL_FIXED_CROP_WITH_CONSENSUS_OVERLAY', url: 'https://example.org/test001-overlay-2000.png', imageAuthenticity: 'DERIVED_ANALYTICAL_PRODUCT', productKind: 'RESEARCH_CONSENSUS_OVERLAY', aiGenerated: false, usedAsModelInput: false },
            { year: 2026, role: 'RECENT_FIXED_CROP_WITH_HISTORICAL_CONSENSUS_OVERLAY', url: 'https://example.org/test001-overlay-2026.png', imageAuthenticity: 'DERIVED_ANALYTICAL_PRODUCT', productKind: 'RESEARCH_CONSENSUS_OVERLAY', aiGenerated: false, usedAsModelInput: false },
          ],
          stateChangeSupported: true,
          openWaterArea2026M2: null,
          exactLossPercentPublished: false,
          causeEstablished: false,
          sourceMethod: 'Fixed-crop consensus',
          sourceYears: [1998, 1999, 2000, 2004, 2005, 2006, 2008],
        },
      },
      reference: { status: 'REFERENCE_DATASET_UNRESOLVED', comparisonFinding: 'Not comparable.', requiredHumanAction: 'Select dataset.' },
      connectivity: [],
    } as unknown as HazardInvestigationResult['test001Context']
    const execute = vi.fn().mockResolvedValue({ state: 'WARNING', verification: 'WARNING', data: fixedResult })
    vi.mocked(getTool).mockReturnValue({ execute } as never)

    render(<MemoryRouter><LabMcp /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' }))

    await screen.findByRole('heading', { name: 'Silnie wspierany zanik historycznego lustra wody' })
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'test-001-forest-pond-kuchnia',
      focusLatitude: 53.594595,
      focusLongitude: 19.00014,
      focusRadiusKm: 0.25,
    }))
    expect(screen.getByText(/niemal całkowity zanik historycznego trwałego lustra tego stawu/i)).toBeInTheDocument()
    expect(screen.getByText(/≈ 1.77 ha/)).toBeInTheDocument()
    expect(screen.getByAltText('Oryginalny obraz satelitarny Landsat-5 obszaru stawu TEST 001 z 2000 roku')).toBeInTheDocument()
    expect(screen.getByAltText('Oryginalny obraz satelitarny Sentinel-2B obszaru stawu TEST 001 z 2026 roku')).toBeInTheDocument()
    expect(screen.getAllByText('ORYGINALNY OFICJALNY PRODUKT SATELITARNY · NIE AI')).toHaveLength(2)
    fireEvent.click(screen.getByText('Pokaż pochodne nakładki pomiarowe — nie są oryginalnymi zdjęciami'))
    expect(screen.getAllByText('PRODUKT POCHODNY · NIE JEST ORYGINALNYM ZDJĘCIEM')).toHaveLength(2)
  })

  it('keeps a derived product outside the original-only model gallery', async () => {
    const provenanceResult = investigationResult()
    if (!provenanceResult.imagery.analysis) throw new Error('Missing analysis fixture.')
    const original = {
      date: '2020-09-01', source: 'NASA HLS S30', url: 'https://example.org/original-input.jpg',
      high_resolution_aoi: true, evidence_role: 'OPTICAL_RGB', nominal_resolution_m: 30, cloud_cover: 2,
      image_authenticity: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCT' as const,
      product_kind: 'SINGLE_ACQUISITION_SURFACE_REFLECTANCE', ai_generated: false, used_as_model_input: true,
    }
    const derived = {
      date: '2020-09-01', source: 'NASA OPERA DSWx-HLS', url: 'https://example.org/derived-water.png',
      high_resolution_aoi: true, evidence_role: 'WATER_CLASSIFICATION', nominal_resolution_m: 30, cloud_cover: 2,
      image_authenticity: 'DERIVED_ANALYTICAL_PRODUCT' as const,
      product_kind: 'PROVIDER_DERIVED_WATER_CLASSIFICATION', ai_generated: false, used_as_model_input: false,
    }
    provenanceResult.imagery.visuallyInspectedByModel = 1
    provenanceResult.imagery.analysis.ai_visual_image_count = 1
    provenanceResult.imagery.analysis.analysis_images = [original, derived]
    provenanceResult.imagery.analysis.derived_images = [derived]
    provenanceResult.imagery.analysis.imagery_authenticity_policy = {
      model_input_rule: 'ORIGINAL_OFFICIAL_SATELLITE_PRODUCTS_ONLY',
      original_model_input_count: 1,
      derived_model_input_count: 0,
      ai_generated_model_input_count: 0,
      derived_display_only_count: 1,
      ai_generated_images_present: false,
    }
    vi.mocked(getTool).mockReturnValue({ execute: vi.fn().mockResolvedValue({ state: 'WARNING', verification: 'WARNING', data: provenanceResult }) } as never)

    render(<MemoryRouter><LabMcp /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' }))
    await screen.findByText(/Odrzucono 1 obraz z sekcji wejść modelu/)
    fireEvent.click(screen.getByRole('button', { name: /Pokaż zdjęcia/ }))

    expect(screen.getByAltText('Obraz wejściowy modelu 2020-09-01')).toBeInTheDocument()
    expect(screen.getByAltText(/Produkt pochodny NASA OPERA DSWx-HLS/)).toBeInTheDocument()
    expect(screen.getByText('PRODUKT POCHODNY · NIE JEST ORYGINALNYM ZDJĘCIEM')).toBeInTheDocument()
  })

  it('offers a separate twenty-frame regional patrol and shows its truthful coverage limit', async () => {
    const patrolResult = investigationResult()
    if (!patrolResult.imagery.analysis) throw new Error('Missing analysis fixture.')
    patrolResult.imagery.analysis.regional_patrol = {
      status: 'COMPLETE_SPARSE_SCREENING',
      requested_tiles: 20,
      generated_tiles: 20,
      inspected_tiles: 20,
      frame_width_km: 1,
      source_date: '2026-08-20',
      source: 'NASA HLS S30 · ESA Sentinel-2 MSI · 30 m NBAR RGB',
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
        latitude: 12.775 + index * 0.001,
        longitude: 17.564 + index * 0.001,
        status: 'INSPECTED_BY_MODEL' as const,
      })),
      limitations: ['Sparse samples only.'],
    }
    patrolResult.imagery.analysis.analysis.regional_patrol_assessment = {
      status: 'PARTIAL_TILE_REVIEW',
      overview: 'Dwa kadry zawierają kandydatów wymagających dalszej kontroli.',
      inspected_tile_ids: ['P01', 'P02'],
      tiles_with_visible_open_water: ['P01'],
      tiles_with_wetland_or_wet_soil: ['P02'],
      tiles_with_possible_channel: ['P01', 'P02'],
      tiles_with_cloud_shadow_or_no_data: [],
      tile_findings: [
        { tile_id: 'P01', surface_class: 'OPEN_WATER', hydrology_feature: 'MAIN_WATERBODY', observation: 'Widoczne otwarte lustro wody.', confidence: 'medium' },
        { tile_id: 'P02', surface_class: 'WETLAND_OR_WET_SOIL', hydrology_feature: 'POSSIBLE_INFLOW', observation: 'Możliwy boczny dopływ wymaga sprawdzenia.', confidence: 'low' },
      ],
      limitations: ['Próbki z jednej daty.'],
    }
    const execute = vi.fn().mockResolvedValue({ state: 'WARNING', verification: 'WARNING', data: patrolResult })
    vi.mocked(getTool).mockReturnValue({ execute } as never)

    render(<MemoryRouter><LabMcp /></MemoryRouter>)
    fireEvent.click(screen.getByRole('radio', { name: /Patrol regionalny · 20 zbliżeń/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' }))

    await screen.findByRole('heading', { name: 'Co naprawdę obejrzał agent' })
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      spatialMode: 'regional-patrol',
      patrolTileCount: 20,
      patrolFrameWidthKm: 1,
      depth: 'deep',
    }))
    expect(screen.getByText('≤ 1.59%')).toBeInTheDocument()
    expect(screen.getByText(/Co najmniej 98.41% AOI pozostaje poza tymi kadrami/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wynik przeglądu kadr po kolei' })).toBeInTheDocument()
    expect(screen.getByText('Dwa kadry zawierają kandydatów wymagających dalszej kontroli.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Czego ten przebieg nadal nie zrobił' })).toBeInTheDocument()
  })
})
