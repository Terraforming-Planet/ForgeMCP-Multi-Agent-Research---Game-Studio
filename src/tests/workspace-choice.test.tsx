import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('workspace choice', () => {
  it('offers the research and game workspaces from the home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Open Multi-Agent Research' }).getAttribute('href')).toBe('/labmcp')
    expect(screen.getByRole('link', { name: 'Open Game Studio' }).getAttribute('href')).toBe('/cube')
  })
})
