import { describe, expect, it } from 'vitest'
import { generateBasicGameBlueprint } from '../game/basicGameGenerator'
import {
  applyMiniChessMove,
  chooseDeterministicMiniChessMove,
  createInitialMiniChessBoard,
  createMiniChessBoard,
  getMiniChessLegalMoves,
  miniMoveKey,
} from '../game/miniChessEngine'

describe('basic game generator v1', () => {
  it('normalizes equivalent prompts into the same versioned deterministic blueprint', () => {
    const first = generateBasicGameBlueprint({
      prompt: '  Earth   Guardian board with BLUE-GREEN LED light  ',
      preset: 'auto',
      opponent: 'human',
    })
    const second = generateBasicGameBlueprint({
      prompt: 'earth guardian board with blue-green led light',
      preset: 'auto',
      opponent: 'human',
    })

    expect(first).toMatchObject({
      schema: 'forgemcp.basic-game.v1',
      version: '1.0.0',
      generatedLocally: true,
      preset: 'earth',
      pieceFamily: 'earth-guardian',
      opponent: 'human',
      ruleset: { id: 'capture-chess-8x8-v1', boardSize: 8 },
    })
    expect(first.id).toBe(second.id)
    expect(first.seed).toBe(second.seed)
  })

  it('uses explicit whitelisted controls before prompt inference', () => {
    const blueprint = generateBasicGameBlueprint({
      prompt: 'Sahara board against a computer with Crayon Cathedral pieces',
      preset: 'arctic',
      opponent: 'human',
    })

    expect(blueprint.preset).toBe('arctic')
    expect(blueprint.opponent).toBe('human')
    expect(blueprint.pieceFamily).toBe('crayon-cathedral')
    expect(blueprint.interpretation).toMatchObject({
      promptRestrictedToWhitelist: true,
      unrecognizedDetailsPreservedOnlyAsText: true,
    })
  })

  it('recognizes a deterministic computer and returns a stable fallback for unknown style text', () => {
    const computer = generateBasicGameBlueprint({ prompt: 'Zagraj przeciwko komputerowi na planszy oceanicznej' })
    const fallback = generateBasicGameBlueprint({ prompt: 'A completely unfamiliar luminous garden style' })

    expect(computer).toMatchObject({ preset: 'ocean', opponent: 'deterministic-baseline-v1' })
    expect(fallback.preset).toBe('prompt-palette')
    expect(fallback.theme.id).toBe('prompt-palette')
    expect(fallback.id).toMatch(/^game-[a-f0-9]{8}$/)
  })
})

describe('Capture Chess engine', () => {
  it('chooses the same legal reply for the same board, seed and ply', () => {
    const opening = createInitialMiniChessBoard()
    const afterWhite = applyMiniChessMove(opening, { row: 6, column: 4 }, { row: 4, column: 4 })
    expect(afterWhite).not.toBeNull()

    const first = chooseDeterministicMiniChessMove(afterWhite!.board, 'black', 512, 1)
    const second = chooseDeterministicMiniChessMove(afterWhite!.board, 'black', 512, 1)
    expect(first).not.toBeNull()
    expect(miniMoveKey(first!)).toBe(miniMoveKey(second!))
    expect(getMiniChessLegalMoves(afterWhite!.board, first!.from)).toContainEqual(first!.to)
  })

  it('finishes the declared ruleset when a king is captured', () => {
    const board = createMiniChessBoard([
      { square: { row: 1, column: 4 }, piece: { id: 'white-rook', color: 'white', type: 'rook' } },
      { square: { row: 7, column: 0 }, piece: { id: 'white-king', color: 'white', type: 'king' } },
      { square: { row: 0, column: 4 }, piece: { id: 'black-king', color: 'black', type: 'king' } },
    ])

    const result = applyMiniChessMove(board, { row: 1, column: 4 }, { row: 0, column: 4 })
    expect(result).toMatchObject({
      winner: 'white',
      move: { piece: { type: 'rook' }, captured: { color: 'black', type: 'king' } },
    })
  })
})
