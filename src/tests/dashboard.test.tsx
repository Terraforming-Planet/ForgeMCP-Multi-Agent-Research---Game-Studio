import { describe, expect, it } from 'vitest'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('dashboard render', () => {
  it('renders home heading', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    expect(screen.getByText('ForgeMCP Dashboard')).toBeTruthy()
  })

  it('exposes the LabMCP page directly under Terra', () => {
    render(
      <MemoryRouter initialEntries={['/labmcp']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Forest Pond near Lake Kuchnia' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Run TEST 001 through WebMCP handler' })).toBeTruthy()
  })
})
