export function compactReportText(value: string, maximum = 420) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1).trimEnd()}…` : normalized
}

export function mobilePreviewUrl(value: string, maximumPixels = 640) {
  try {
    const url = new URL(value)
    if (url.hostname === 'gibs.earthdata.nasa.gov' && /\/wms/i.test(url.pathname)) {
      const width = Number(url.searchParams.get('WIDTH'))
      const height = Number(url.searchParams.get('HEIGHT'))
      if (Number.isFinite(width) && width > maximumPixels) url.searchParams.set('WIDTH', String(maximumPixels))
      if (Number.isFinite(height) && height > maximumPixels) url.searchParams.set('HEIGHT', String(maximumPixels))
      return url.toString()
    }
  } catch {
    // Keep the original source when it is not a fully qualified URL.
  }
  return value
}
