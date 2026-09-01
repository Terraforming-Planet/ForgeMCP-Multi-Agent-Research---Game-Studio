import { describe, expect, it } from 'vitest'
import {
  IMAGERY_DISPLAY_PRESETS,
  imageryDisplayFilter,
  normalizeImageryDisplay,
  selectModelPreviewImages,
} from '../integrations/terra/imageryDisplay'

describe('LabTerra display-only imagery controls', () => {
  it('keeps bounded, explicit display parameters', () => {
    const normalized = normalizeImageryDisplay({ preset: 'custom', brightness: 999, contrast: 10, saturation: 130, hue: -99 })
    expect(normalized).toEqual({ preset: 'custom', brightness: 160, contrast: 50, saturation: 130, hue: -30 })
    expect(imageryDisplayFilter(normalized)).toContain('brightness(160%)')
  })

  it('provides distinct water, vegetation and terrain viewing presets without changing a source URL', () => {
    expect(IMAGERY_DISPLAY_PRESETS.water).not.toEqual(IMAGERY_DISPLAY_PRESETS.vegetation)
    expect(IMAGERY_DISPLAY_PRESETS.terrain.saturation).toBeLessThan(IMAGERY_DISPLAY_PRESETS.natural.saturation)
  })

  it('reconstructs the evenly sampled Worker image subset when needed', () => {
    const images = Array.from({ length: 8 }, (_, index) => ({ date: `202${index}-01-01`, source: 'NASA', url: `https://example.org/${index}.jpg` }))
    expect(selectModelPreviewImages(images, 4).map(item => item.url)).toEqual([
      'https://example.org/0.jpg',
      'https://example.org/2.jpg',
      'https://example.org/5.jpg',
      'https://example.org/7.jpg',
    ])
  })
})
