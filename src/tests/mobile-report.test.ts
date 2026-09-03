import { describe, expect, it } from 'vitest'
import { compactReportText, mobilePreviewUrl } from '../lib/reportDisplay'

describe('mobile LabTerra report safeguards', () => {
  it('uses a balanced 1024px NASA GIBS preview while preserving the original link source', () => {
    const original = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&WIDTH=1600&HEIGHT=1600&TIME=2026-09-01'
    const preview = mobilePreviewUrl(original)

    expect(preview).toContain('WIDTH=1024')
    expect(preview).toContain('HEIGHT=1024')
    expect(original).toContain('WIDTH=1600')
  })

  it('does not rewrite catalogue thumbnails from other providers', () => {
    const thumbnail = 'https://landsatlook.usgs.gov/example_thumb_large.jpeg'
    expect(mobilePreviewUrl(thumbnail)).toBe(thumbnail)
  })

  it('scales a NASA WMS URL nested inside the Worker image proxy', () => {
    const nested = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&WIDTH=1600&HEIGHT=1600&TIME=2026-09-01'
    const proxy = `https://terra-observation-evidence-explainer.xodobrox.workers.dev/research/image?${new URLSearchParams({ url: nested })}`
    const preview = new URL(mobilePreviewUrl(proxy))
    const scaledNested = new URL(preview.searchParams.get('url')!)

    expect(scaledNested.searchParams.get('WIDTH')).toBe('1024')
    expect(scaledNested.searchParams.get('HEIGHT')).toBe('1024')
  })

  it('scales a direct Copernicus Sentinel WMS preview', () => {
    const original = 'https://sh.dataspace.copernicus.eu/ogc/wms/example?SERVICE=WMS&REQUEST=GetMap&WIDTH=2048&HEIGHT=2048'
    const preview = new URL(mobilePreviewUrl(original))
    expect(preview.searchParams.get('WIDTH')).toBe('1024')
    expect(preview.searchParams.get('HEIGHT')).toBe('1024')
  })

  it('keeps the first report view concise and leaves the full text for the extended view', () => {
    const long = Array.from({ length: 100 }, () => 'hydrology').join(' ')
    const excerpt = compactReportText(long, 80)

    expect(excerpt.length).toBeLessThanOrEqual(80)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
