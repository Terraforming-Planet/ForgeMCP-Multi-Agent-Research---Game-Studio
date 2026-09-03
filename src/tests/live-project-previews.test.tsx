import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('live project previews', () => {
  it('offers a playable local board and loads the real Cube deployment only on request', () => {
    render(<MemoryRouter initialEntries={['/game-studio']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Generate Capture Chess, then play it' })).toBeTruthy()
    expect(screen.queryByTitle('Playable Cube Chess 512 upstream')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Load playable Cube Chess 512' }))
    const frame = screen.getByTitle('Playable Cube Chess 512 upstream')
    expect(frame.getAttribute('src')).toContain('Cube-Chess-512-AI-Open-Source-3D-Chess-Engine-Autonomous-AI-Game-Developer')
  })

  it('shows factual work plans and loads the original Arctic lab only on request', () => {
    render(<MemoryRouter initialEntries={['/stations']}><App /></MemoryRouter>)
    expect(screen.getByText(/Measure GNSS position, weather, radiation/i)).toBeTruthy()
    expect(screen.queryByTitle('ORYGINALNY INTERFEJS ŹRÓDŁOWY · Arctic · Cryosphere Watch')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Wczytaj oryginalną stację Arctic' }))
    const frame = screen.getByTitle('ORYGINALNY INTERFEJS ŹRÓDŁOWY · Arctic · Cryosphere Watch')
    expect(frame.getAttribute('src')).toContain('/arctic-90n/real-ice-lab.html')
  })
})
