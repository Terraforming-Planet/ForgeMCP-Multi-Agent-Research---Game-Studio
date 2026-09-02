import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('research station presets', () => {
  it('exposes all four source stations with concept boundaries', () => {
    render(<MemoryRouter initialEntries={['/stations']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Earth missions become visual systems for Game Studio' })).toBeTruthy()
    expect(screen.getAllByText('GENERATED CONCEPT · NOT DEPLOYED HARDWARE')).toHaveLength(4)
    expect(screen.getAllByRole('link', { name: 'Open source station ↗' })).toHaveLength(4)
  })
})
