import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App'
import { CUBE_PUBLIC_URL } from '../integrations/cube/adapter'
import { TERRA_APP_URL } from '../integrations/terra/adapter'

afterEach(cleanup)

describe('reviewer home', () => {
  it('shows Terra and Cube together on the main page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'FORGEMCP' })).toBeTruthy()
    expect(screen.getByText(/Built with OpenAI Codex assistance during the WebMCP Challenge/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Observe, compare and verify Earth' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Play, self-play, improve and verify' })).toBeTruthy()

    const terraFrame = screen.getByTitle('Terra Observatory live application') as HTMLIFrameElement
    const cubeFrame = screen.getByTitle('Cube Chess 512 live application') as HTMLIFrameElement
    expect(terraFrame.getAttribute('src')).toBe(TERRA_APP_URL)
    expect(cubeFrame.getAttribute('src')).toBe(CUBE_PUBLIC_URL)
  })

  it('keeps the reviewer story limited to three demo steps and explicit proof', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Three steps. One story.' })).toBeTruthy()
    expect(screen.getByText(/50 browser-native WebMCP tools/i)).toBeTruthy()
    expect(screen.getByText('Chrome 151 PASS')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Start Terra demo' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Start Cube demo' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open proof' })).toBeTruthy()
  })
})
