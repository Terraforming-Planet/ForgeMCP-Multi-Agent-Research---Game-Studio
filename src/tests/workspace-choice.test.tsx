import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { CUBE_PUBLIC_URL } from '../integrations/cube/adapter'
import { applyReviewerCubePublicEntry } from '../reviewerCubePublicEntry'

describe('workspace choice', () => {
  it('uses the real public Cube game as the main entry while preserving Game Studio under More', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    applyReviewerCubePublicEntry()

    expect(screen.getAllByRole('link', { name: 'Terra Observatory' }).some(link => link.getAttribute('href') === '/labmcp')).toBe(true)
    expect(screen.getByRole('link', { name: 'Cube Chess 512 · Open Source Game' }).getAttribute('href')).toBe(CUBE_PUBLIC_URL)
    expect(screen.getByRole('link', { name: 'WebMCP Proof' }).getAttribute('href')).toBe('/challenge')
    expect(screen.queryByRole('link', { name: 'Cube Game Studio · WebMCP TEST' })).toBeNull()
    expect(screen.queryByRole('link', { name: '3D + Shopify · TEST' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'More' }))
    applyReviewerCubePublicEntry()

    expect(screen.getByRole('link', { name: 'Cube Game Studio · WebMCP TEST' }).getAttribute('href')).toBe('#/game-studio')
    expect(screen.getByRole('link', { name: '3D + Shopify · TEST' }).getAttribute('href')).toBe('/shop-lab')
    expect(screen.getByRole('link', { name: 'Cube Premium · TEST' }).getAttribute('href')).toBe('/subscription')
  })
})
