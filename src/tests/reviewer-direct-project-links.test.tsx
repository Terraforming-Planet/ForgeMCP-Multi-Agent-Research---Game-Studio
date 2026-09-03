import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App'
import { CUBE_PUBLIC_URL } from '../integrations/cube/adapter'
import { TERRA_APP_URL } from '../integrations/terra/adapter'
import { applyReviewerDirectProjectLinks } from '../reviewerDirectProjectLinks'

afterEach(cleanup)

describe('reviewer direct project links', () => {
  it('adds two plain public-project links for Terra and Cube', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(applyReviewerDirectProjectLinks()).toBe(true)

    expect(screen.getByRole('link', { name: 'OPEN TERRA OBSERVATORY' }).getAttribute('href')).toBe(TERRA_APP_URL)
    expect(screen.getByRole('link', { name: 'OPEN CUBE CHESS 512 AI' }).getAttribute('href')).toBe(CUBE_PUBLIC_URL)
  })
})
