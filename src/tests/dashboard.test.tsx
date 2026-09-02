import { describe, expect, it } from 'vitest'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { RESEARCH_ARCHIVE_KEY } from '../lib/researchArchive'

describe('dashboard render', () => {
  it('renders home heading', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    expect(screen.getByRole('heading', { name: 'FORGEMCP' })).toBeTruthy()
  })

  it('exposes LabTerra WebMCP with place search and optional coordinates', () => {
    render(
      <MemoryRouter initialEntries={['/labmcp']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Laboratorium dochodzeń środowiskowych' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uruchom przebieg 1/10' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Preset badawczy' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Szukaj miejsca' })).toBeTruthy()
    expect(screen.getByLabelText('Szerokość geograficzna')).toBeTruthy()
  })

  it('exposes the concise research archive as a separate tab', () => {
    render(
      <MemoryRouter initialEntries={['/research-archive']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Archiwum badań' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Wróć do LabTerra' })).toBeTruthy()
  })

  it('keeps the archive route visible when browser storage contains a partial record', () => {
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, JSON.stringify([{
      schemaVersion: '1.0',
      runId: 'partial-run',
      savedAt: '2026-09-01T20:00:00Z',
      shortSummary: ['incomplete'],
      hypotheses: [],
    }]))

    render(
      <MemoryRouter initialEntries={['/research-archive']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('heading', { name: 'Archiwum badań' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: 'Archiwum jest puste' }).length).toBeGreaterThan(0)
    localStorage.clear()
  })
})
