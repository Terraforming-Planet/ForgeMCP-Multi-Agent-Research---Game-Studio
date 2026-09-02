import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('Game Studio UI', () => {
  it('surfaces four station systems and labels upstream work honestly', () => {
    render(<MemoryRouter initialEntries={['/game-studio']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'ForgeMCP Game Studio' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Arctic.*Cryosphere Watch/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Sahara.*Water Memory/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ocean.*Blue Sentinel/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Earth–Space.*Orbital Synthesis/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /PR #135/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Play the live Cube Chess 512 ↗' })).toBeTruthy()
  })
})
