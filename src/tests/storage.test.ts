import { describe, expect, it } from 'vitest'
import { readLocalJson, writeLocalJson } from '../lib/storage'

describe('local JSON storage', () => {
  it('keeps the UI usable when the browser blocks localStorage', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Storage access blocked', 'SecurityError')
      },
    })

    try {
      expect(readLocalJson('blocked', { safe: true })).toEqual({ safe: true })
      expect(() => writeLocalJson('blocked', { safe: true })).not.toThrow()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
})
