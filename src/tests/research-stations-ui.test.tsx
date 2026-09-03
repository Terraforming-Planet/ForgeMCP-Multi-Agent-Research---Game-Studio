import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('research station presets', () => {
  it('exposes all four source stations, concept boundaries and a generated 3D station workbench', () => {
    render(<MemoryRouter initialEntries={['/stations']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Stacje badawcze zachowują funkcje źródłowe i dostają własne modele 3D' })).toBeTruthy()
    expect(screen.getAllByText('GENERATED CONCEPT · NOT DEPLOYED HARDWARE')).toHaveLength(4)
    expect(screen.getAllByRole('link', { name: 'Otwórz oryginalną stację ↗' })).toHaveLength(4)
    expect(screen.getByRole('heading', { name: 'Arctic · model funkcjonalny' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wygeneruj ponownie model stacji' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pobierz model .gltf' })).toBeTruthy()
    expect(screen.getByText(/oryginalny publiczny interfejs Arctic/i)).toBeTruthy()
  })
})
