export type ImageryDisplayPreset = 'natural' | 'water' | 'vegetation' | 'terrain' | 'custom'

export type ImageryDisplaySettings = {
  preset: ImageryDisplayPreset
  brightness: number
  contrast: number
  saturation: number
  hue: number
}

export const DEFAULT_IMAGERY_DISPLAY: ImageryDisplaySettings = {
  preset: 'natural',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
}

export const IMAGERY_DISPLAY_PRESETS: Record<Exclude<ImageryDisplayPreset, 'custom'>, ImageryDisplaySettings> = {
  natural: DEFAULT_IMAGERY_DISPLAY,
  water: { preset: 'water', brightness: 92, contrast: 155, saturation: 135, hue: -8 },
  vegetation: { preset: 'vegetation', brightness: 94, contrast: 145, saturation: 180, hue: -4 },
  terrain: { preset: 'terrain', brightness: 96, contrast: 165, saturation: 55, hue: 0 },
}

const within = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

export function normalizeImageryDisplay(value: unknown): ImageryDisplaySettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_IMAGERY_DISPLAY
  const candidate = value as Partial<ImageryDisplaySettings>
  const preset = ['natural', 'water', 'vegetation', 'terrain', 'custom'].includes(String(candidate.preset))
    ? candidate.preset as ImageryDisplayPreset
    : 'custom'
  return {
    preset,
    brightness: within(candidate.brightness, 50, 160, 100),
    contrast: within(candidate.contrast, 50, 220, 100),
    saturation: within(candidate.saturation, 0, 220, 100),
    hue: within(candidate.hue, -30, 30, 0),
  }
}

export function imageryDisplayFilter(settings: ImageryDisplaySettings) {
  return `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) hue-rotate(${settings.hue}deg)`
}

export type PreviewImage = {
  date: string
  source: string
  url: string
  evidence_role?: string | null
  nominal_resolution_m?: number | null
  cloud_cover?: number | null
  patrol_tile_id?: string | null
  tile_center_latitude?: number | null
  tile_center_longitude?: number | null
  tile_frame_width_km?: number | null
}

export function selectModelPreviewImages(images: PreviewImage[], inspectedCount: number) {
  const count = Math.min(images.length, Math.max(0, Math.trunc(inspectedCount)))
  if (!count) return []
  if (images.length <= count) return [...images]
  const selected: PreviewImage[] = []
  const seen = new Set<string>()
  for (let index = 0; index < count; index += 1) {
    const position = Math.round((index * (images.length - 1)) / Math.max(1, count - 1))
    const image = images[position]
    const key = `${image.date}|${image.url}`
    if (!seen.has(key)) {
      seen.add(key)
      selected.push(image)
    }
  }
  return selected
}
