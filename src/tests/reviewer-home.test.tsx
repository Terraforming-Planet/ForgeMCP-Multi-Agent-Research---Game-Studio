import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App'
import { CUBE_PUBLIC_URL } from '../integrations/cube/adapter'
import { TERRA_APP_URL } from '../integrations/terra/adapter'
import { applyReviewerCubePublicEntry } from '../reviewerCubePublicEntry'

afterEach(cleanup)

describe('reviewer home', () => {
  it('shows Terra and the public Cube game together on the main page without the Cube login iframe', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    applyReviewerCubePublicEntry()

    expect(screen.getByRole('heading', { name: 'FORGEMCP' })).toBeTruthy()
    expect(screen.getByText(/Built with OpenAI Codex assistance during the WebMCP Challenge/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Observe, compare and verify Earth' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Play Cube Chess 512' })).toBeTruthy()

    const terraFrame = screen.getByTitle('Terra Observatory live application') as HTMLIFrameElement
    expect(terraFrame.getAttribute('src')).toBe(TERRA_APP_URL)
    expect(screen.queryByTitle('Cube Chess 512 live application')).toBeNull()

    const preview = screen.getByTestId('cube-open-source-preview') as HTMLImageElement
    expect(preview.getAttribute('alt')).toMatch(/Static preview of the Cube Chess 512 playable/i)
    expect(screen.getByRole('link', { name: 'Open the public open-source Cube Chess 512 game' }).getAttribute('href')).toBe(CUBE_PUBLIC_URL)
    expect(screen.getByRole('link', { name: 'Open public Cube Chess 512 →' }).getAttribute('href')).toBe(CUBE_PUBLIC_URL)
  })

  it('keeps the reviewer story limited to three demo steps and explicit proof', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    applyReviewerCubePublicEntry()

    expect(screen.getByRole('heading', { name: 'Three steps. One story.' })).toBeTruthy()
    expect(screen.getByText(/50 browser-native WebMCP tools/i)).toBeTruthy()
    expect(screen.getByText('Chrome 151 PASS')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Start Terra demo' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open Cube Chess 512' }).getAttribute('href')).toBe(CUBE_PUBLIC_URL)
    expect(screen.getByRole('link', { name: 'Open proof' })).toBeTruthy()
  })
})
