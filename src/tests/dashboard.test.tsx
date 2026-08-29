import { describe, expect, it } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
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
})
