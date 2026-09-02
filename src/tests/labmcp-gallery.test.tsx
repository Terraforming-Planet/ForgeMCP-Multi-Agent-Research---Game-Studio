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
          },
        },
        {
          year: 2026,
          status: 'image',
          image: {
            year: 2026, date: '2026-09-01', source: 'Test source',
            url: 'https://example.org/preview-2026.jpg', original_url: 'https://example.org/original-2026.jpg',
            scene_id: 'scene-2026', cloud_cover: 5, cloud_preference_met: true,
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
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom agentów i analizę wieloletnią' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Uruchom agentów i analizę wieloletnią' }))
    await screen.findByRole('heading', { name: 'TEST 001' })
    fireEvent.click(screen.getByRole('button', { name: 'Załaduj lekkie podglądy zdjęć' }))
    fireEvent.error(screen.getByAltText('Obraz satelitarny dla roku 2026'))

    await screen.findByText('Podgląd niedostępny — pozostała karta źródłowa.')
    expect(screen.getByRole('heading', { name: 'TEST 001' })).toBeInTheDocument()
    expect(screen.getByAltText('Obraz satelitarny dla roku 2020')).toBeInTheDocument()
  })
})
