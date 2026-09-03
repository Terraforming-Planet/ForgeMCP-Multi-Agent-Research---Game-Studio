export function compactReportText(value: string, maximum = 420) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1).trimEnd()}…` : normalized
}

const RESIZABLE_WMS_HOSTS = new Set(['gibs.earthdata.nasa.gov', 'sh.dataspace.copernicus.eu'])

function scaleWmsUrl(url: URL, maximumPixels: number) {
  if (!RESIZABLE_WMS_HOSTS.has(url.hostname)) return false
  const service = url.searchParams.get('SERVICE') ?? url.searchParams.get('service')
  if (service?.toUpperCase() !== 'WMS' && !/\/wms(?:\/|\.|$)/i.test(url.pathname)) return false
  let changed = false
  for (const key of ['WIDTH', 'HEIGHT', 'width', 'height']) {
    const size = Number(url.searchParams.get(key))
    if (Number.isFinite(size) && size > maximumPixels) {
      url.searchParams.set(key, String(maximumPixels))
      changed = true
    }
  }
  return changed
}

export function mobilePreviewUrl(value: string, maximumPixels = 1024) {
  try {
    const url = new URL(value)
    if (scaleWmsUrl(url, maximumPixels)) return url.toString()

    if (url.pathname.endsWith('/research/image')) {
      const nestedValue = url.searchParams.get('url')
      if (nestedValue) {
        const nested = new URL(nestedValue)
        if (scaleWmsUrl(nested, maximumPixels)) {
          url.searchParams.set('url', nested.toString())
          return url.toString()
        }
      }
    }
  } catch {
    // Keep the original source when it is not a fully qualified URL.
  }
  return value
}
