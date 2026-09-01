import { describe, expect, it } from 'vitest'
import { compactReportText, mobilePreviewUrl } from '../lib/reportDisplay'

describe('mobile LabTerra report safeguards', () => {
  it('uses a smaller NASA GIBS preview while preserving the original link source', () => {
    const original = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&WIDTH=1600&HEIGHT=1600&TIME=2026-09-01'
    const preview = mobilePreviewUrl(original)

    expect(preview).toContain('WIDTH=640')
    expect(preview).toContain('HEIGHT=640')
    expect(original).toContain('WIDTH=1600')
  })

  it('does not rewrite catalogue thumbnails from other providers', () => {
    const thumbnail = 'https://landsatlook.usgs.gov/example_thumb_large.jpeg'
    expect(mobilePreviewUrl(thumbnail)).toBe(thumbnail)
  })

  it('keeps the first report view concise and leaves the full text for the extended view', () => {
    const long = Array.from({ length: 100 }, () => 'hydrology').join(' ')
    const excerpt = compactReportText(long, 80)

    expect(excerpt.length).toBeLessThanOrEqual(80)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
