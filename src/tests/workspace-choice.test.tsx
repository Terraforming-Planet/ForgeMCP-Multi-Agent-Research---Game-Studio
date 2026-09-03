import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('workspace choice', () => {
  it('keeps the main reviewer path simple while preserving support labs under More', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('link', { name: 'Terra Observatory' }).some(link => link.getAttribute('href') === '/labmcp')).toBe(true)
    expect(screen.getAllByRole('link', { name: 'Cube Chess / Game Studio' }).some(link => link.getAttribute('href') === '/game-studio')).toBe(true)
    expect(screen.getByRole('link', { name: 'WebMCP Proof' }).getAttribute('href')).toBe('/challenge')
    expect(screen.queryByRole('link', { name: '3D + Shopify · TEST' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByRole('link', { name: '3D + Shopify · TEST' }).getAttribute('href')).toBe('/shop-lab')
    expect(screen.getByRole('link', { name: 'Cube Premium · TEST' }).getAttribute('href')).toBe('/subscription')
  })
})
