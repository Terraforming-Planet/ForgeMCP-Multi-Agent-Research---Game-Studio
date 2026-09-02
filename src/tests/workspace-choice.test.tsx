import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('workspace choice', () => {
  it('offers the research, game and guarded product workspaces from the home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Search satellite evidence' }).getAttribute('href')).toBe('/labmcp')
    expect(screen.getAllByRole('link', { name: 'Open Game Studio' }).some(link => link.getAttribute('href') === '/game-studio')).toBe(true)
    expect(screen.getByRole('link', { name: '3D + Shopify Test' }).getAttribute('href')).toBe('/shop-lab')
    expect(screen.getByRole('textbox', { name: 'Place, lake, river, mountain range or region' })).toBeTruthy()
  })
})
