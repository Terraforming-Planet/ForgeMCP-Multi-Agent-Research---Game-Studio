import { describe, expect, it } from 'vitest'
import { compactReportText, mobilePreviewUrl } from '../lib/reportDisplay'

describe('mobile LabTerra report safeguards', () => {
  it('uses a bounded 1280px NASA GIBS preview while preserving the original link source', () => {
    const original = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&WIDTH=1600&HEIGHT=1600&TIME=2026-09-01'
    const preview = mobilePreviewUrl(original)

    expect(preview).toContain('WIDTH=1280')
    expect(preview).toContain('HEIGHT=1280')
    expect(original).toContain('WIDTH=1600')
  })

  it('does not rewrite catalogue thumbnails from other providers', () => {
    const thumbnail = 'https://landsatlook.usgs.gov/example_thumb_large.jpeg'
    expect(mobilePreviewUrl(thumbnail)).toBe(thumbnail)
  })

  it('does not upscale a NASA WMS URL already below the 1280px preview ceiling', () => {
    const nested = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&WIDTH=1100&HEIGHT=1100&TIME=2026-09-01'
    const proxy = `https://terra-observation-evidence-explainer.xodobrox.workers.dev/research/image?${new URLSearchParams({ url: nested })}`
    const preview = new URL(mobilePreviewUrl(proxy))
    const scaledNested = new URL(preview.searchParams.get('url')!)

    expect(scaledNested.searchParams.get('WIDTH')).toBe('1100')
    expect(scaledNested.searchParams.get('HEIGHT')).toBe('1100')
  })

  it('scales a direct Copernicus Sentinel WMS preview to the 1280px display ceiling', () => {
    const original = 'https://sh.dataspace.copernicus.eu/ogc/wms/example?SERVICE=WMS&REQUEST=GetMap&WIDTH=2048&HEIGHT=2048'
    const preview = new URL(mobilePreviewUrl(original))
    expect(preview.searchParams.get('WIDTH')).toBe('1280')
    expect(preview.searchParams.get('HEIGHT')).toBe('1280')
  })

  it('keeps an explicit lower preview ceiling when a constrained caller requests it', () => {
    const original = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&WIDTH=1600&HEIGHT=1600'
    const preview = new URL(mobilePreviewUrl(original, 640))
    expect(preview.searchParams.get('WIDTH')).toBe('640')
    expect(preview.searchParams.get('HEIGHT')).toBe('640')
  })

  it('keeps the first report view concise and leaves the full text for the extended view', () => {
    const long = Array.from({ length: 100 }, () => 'hydrology').join(' ')
    const excerpt = compactReportText(long, 80)

    expect(excerpt.length).toBeLessThanOrEqual(80)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
