import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApprovalQueue } from '../components/ApprovalQueue'

describe('human approval', () => {
  it('renders approve/reject controls', () => {
    render(<ApprovalQueue />)
    expect(screen.getByText('Approve')).toBeTruthy()
    expect(screen.getByText('Reject')).toBeTruthy()
  })
})
