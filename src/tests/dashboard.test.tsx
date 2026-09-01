import { describe, expect, it } from 'vitest'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('dashboard render', () => {
  it('renders home heading', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    expect(screen.getByText('ForgeMCP Dashboard')).toBeTruthy()
  })

  it('exposes LabTerra WebMCP with place search and optional coordinates', () => {
    render(
      <MemoryRouter initialEntries={['/labmcp']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Laboratorium dochodzeń środowiskowych' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uruchom agentów i analizę wieloletnią' })).toBeTruthy()
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
})
