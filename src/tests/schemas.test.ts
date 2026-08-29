import { describe, expect, it } from 'vitest'
import { cubeInspectPositionInputSchema, locationSearchInputSchema } from '../webmcp/contracts'

describe('schemas', () => {
  it('validates location search', () => {
    expect(locationSearchInputSchema.safeParse({ query: 'Sahara' }).success).toBe(true)
    expect(locationSearchInputSchema.safeParse({ query: 'a' }).success).toBe(false)
  })

  it('validates cube coordinate bounds', () => {
    expect(cubeInspectPositionInputSchema.safeParse({ x: 8, y: 1, z: 4 }).success).toBe(true)
    expect(cubeInspectPositionInputSchema.safeParse({ x: 9, y: 1, z: 4 }).success).toBe(false)
  })
})
