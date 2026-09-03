import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MiniChessGame } from '../components/MiniChessGame'

afterEach(cleanup)

describe('MiniChessGame', () => {
  it('renders a full playable board and states its rules boundary', () => {
    render(<MiniChessGame />)
    const board = screen.getByRole('grid', { name: /playable standard 8 by 8/i })
    expect(within(board).getAllByRole('gridcell')).toHaveLength(64)
    expect(within(board).getAllByLabelText(/white|black/)).toHaveLength(32)
    expect(screen.getByText(/intentionally omits check\/checkmate, castling, en-passant and promotion/i)).toBeInTheDocument()
    expect(screen.getByText(/not the separate Cube Chess 8×8×8 engine/i)).toBeInTheDocument()
  })

  it('alternates turns, applies legal pawn geometry, captures and undoes', async () => {
    const user = userEvent.setup()
    render(<MiniChessGame />)

    await user.click(screen.getByRole('gridcell', { name: 'e2 white pawn' }))
    expect(screen.getByRole('gridcell', { name: 'e4 empty' })).toHaveAttribute('data-legal', 'true')
    await user.click(screen.getByRole('gridcell', { name: 'e4 empty' }))
    expect(screen.getByText('BLACK TURN')).toBeInTheDocument()

    await user.click(screen.getByRole('gridcell', { name: 'd7 black pawn' }))
    await user.click(screen.getByRole('gridcell', { name: 'd5 empty' }))
    await user.click(screen.getByRole('gridcell', { name: 'e4 white pawn' }))
    expect(screen.getByRole('gridcell', { name: 'd5 black pawn' })).toHaveAttribute('data-legal', 'true')
    await user.click(screen.getByRole('gridcell', { name: 'd5 black pawn' }))

    expect(screen.getByRole('gridcell', { name: 'd5 white pawn' })).toBeInTheDocument()
    expect(screen.getByText(/captured the black pawn/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo move' }))
    expect(screen.getByRole('gridcell', { name: 'e4 white pawn' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'd5 black pawn' })).toBeInTheDocument()
  })

  it('rejects an out-of-geometry move without changing the turn', async () => {
    const user = userEvent.setup()
    render(<MiniChessGame />)
    await user.click(screen.getByRole('gridcell', { name: 'e2 white pawn' }))
    expect(screen.getByRole('gridcell', { name: 'e5 empty' })).toHaveAttribute('data-legal', 'false')
    await user.click(screen.getByRole('gridcell', { name: 'e5 empty' }))
    expect(screen.getByText('WHITE TURN')).toBeInTheDocument()
    expect(screen.getByText(/outside this piece's legal geometry/i)).toBeInTheDocument()
  })

  it('generates the scene visibly from a local prompt and labels it honestly', async () => {
    const user = userEvent.setup()
    const { container } = render(<MiniChessGame />)
    const prompt = screen.getByLabelText(/describe board lighting/i)
    await user.clear(prompt)
    await user.type(prompt, 'Sahara research board with amber warning LEDs')
    await user.click(screen.getByRole('button', { name: 'Generate playable game' }))

    expect(container.querySelector('.mini-chess')).toHaveAttribute('data-scene', 'sahara')
    expect(screen.getAllByText('Sahara signal').length).toBeGreaterThan(0)
    expect(screen.getByText(/Generated game-[a-f0-9]{8} from the supported template/i)).toBeInTheDocument()
    expect(screen.getByText(/does not call an AI model or generate a 3D asset/i)).toBeInTheDocument()
  })

  it('resets the playable board when it generates a new versioned blueprint', async () => {
    const user = userEvent.setup()
    const { container } = render(<MiniChessGame />)

    await user.click(screen.getByRole('gridcell', { name: 'e2 white pawn' }))
    await user.click(screen.getByRole('gridcell', { name: 'e4 empty' }))
    expect(screen.getByRole('gridcell', { name: 'e4 white pawn' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Earth + computer' }))
    await user.click(screen.getByRole('button', { name: 'Generate playable game' }))

    expect(screen.getByRole('gridcell', { name: 'e2 white pawn' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'e4 empty' })).toBeInTheDocument()
    expect(container.querySelector('.mini-chess')).toHaveAttribute('data-piece-family', 'earth-guardian')
    expect(screen.getByText('deterministic-baseline-v1')).toBeInTheDocument()
    expect(screen.getByText('0 plies recorded')).toBeInTheDocument()
  })

  it('plays one deterministic computer reply as part of a reversible human turn', async () => {
    const user = userEvent.setup()
    render(<MiniChessGame />)

    await user.selectOptions(screen.getByLabelText('Opponent'), 'deterministic-computer')
    await user.click(screen.getByRole('button', { name: 'Generate playable game' }))
    await user.click(screen.getByRole('gridcell', { name: 'e2 white pawn' }))
    await user.click(screen.getByRole('gridcell', { name: 'e4 empty' }))

    expect(screen.getByText('WHITE TURN')).toBeInTheDocument()
    expect(screen.getByText(/Computer reply: Black/i)).toBeInTheDocument()
    expect(screen.getByText('2 plies recorded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo move' }))
    expect(screen.getByRole('gridcell', { name: 'e2 white pawn' })).toBeInTheDocument()
    expect(screen.getByText('0 plies recorded')).toBeInTheDocument()
  })
})
