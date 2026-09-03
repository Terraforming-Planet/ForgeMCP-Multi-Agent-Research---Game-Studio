import type { ProceduralAssetBundle, SemanticPart } from '../commerce/proceduralAssets'

export type TerraMaterialProfile = 'earth-guardian' | 'arctic' | 'sahara' | 'ocean' | 'earth-space' | 'sahara-excavator'

type MaterialStyle = {
  name: string
  texture: 'base' | 'earth' | 'steel' | 'ice' | 'water' | 'sand'
  color: [number, number, number, number]
  metallic: number
  roughness: number
  emissive?: [number, number, number]
  doubleSided?: boolean
  alphaMode?: 'BLEND'
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function bytesToBase64(bytes: Uint8Array) {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0
    output += BASE64[a >> 2]
    output += BASE64[((a & 3) << 4) | (b >> 4)]
    output += index + 1 < bytes.length ? BASE64[((b & 15) << 2) | (c >> 6)] : '='
    output += index + 2 < bytes.length ? BASE64[c & 63] : '='
  }
  return output
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function adler32(bytes: Uint8Array) {
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function u32(value: number) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255])
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type)
  return concat([u32(data.length), typeBytes, data, u32(crc32(concat([typeBytes, data])))])
}

function createRgbPng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) {
  const raw = new Uint8Array((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y)
      raw[offset++] = Math.max(0, Math.min(255, Math.round(r)))
      raw[offset++] = Math.max(0, Math.min(255, Math.round(g)))
      raw[offset++] = Math.max(0, Math.min(255, Math.round(b)))
    }
  }
  const length = raw.length
  const deflate = concat([
    new Uint8Array([0x78, 0x01, 0x01, length & 255, (length >>> 8) & 255, (~length) & 255, ((~length) >>> 8) & 255]),
    raw,
    u32(adler32(raw)),
  ])
  const ihdr = concat([u32(width), u32(height), new Uint8Array([8, 2, 0, 0, 0])])
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflate),
    pngChunk('IEND', new Uint8Array()),
  ])
}

function hashNoise(x: number, y: number, seed: number) {
  return ((Math.sin(x * 12.9898 + y * 78.233 + seed * 19.19) * 43758.5453) % 1 + 1) % 1
}

function earthTexture() {
  return createRgbPng(128, 128, (x, y) => {
    const u = x / 128
    const v = y / 128
    const latitude = Math.abs(v - 0.5) * 2
    const continental = Math.sin(u * 19 + Math.sin(v * 11) * 2.6)
      + Math.cos(v * 21 - u * 6.5)
      + Math.sin((u + v) * 13) * 0.45
    const land = continental > 0.35
    const cloudField = Math.sin(u * 37 + v * 17) + Math.cos(v * 29 - u * 11)
    const cloud = Math.abs(cloudField) < 0.18 || hashNoise(x, y, 2) > 0.965
    const ice = latitude > 0.84
    let base: [number, number, number]
    if (ice) base = [220, 245, 250]
    else if (land) {
      const dry = hashNoise(x, y, 3) > 0.62
      base = dry ? [145, 116, 62] : [54, 135, 72]
    } else {
      const depth = 0.75 + 0.2 * Math.sin(v * Math.PI)
      base = [18 * depth, 86 * depth, 168 * depth]
    }
    if (!cloud) return base
    return [
      base[0] * 0.32 + 240 * 0.68,
      base[1] * 0.32 + 248 * 0.68,
      base[2] * 0.32 + 255 * 0.68,
    ]
  })
}

function steelTexture() {
  return createRgbPng(128, 128, (x, y) => {
    const grain = hashNoise(x, y, 5)
    const brushed = 0.5 + 0.5 * Math.sin(y * 0.8 + Math.sin(x * 0.12) * 0.7)
    const value = 145 + grain * 34 + brushed * 24
    return [value * 0.95, value, value * 1.03]
  })
}

function iceTexture() {
  return createRgbPng(128, 128, (x, y) => {
    const u = x / 128
    const v = y / 128
    const crack = Math.abs(Math.sin(u * 31 + Math.sin(v * 12) * 4)) < 0.065
      || Math.abs(Math.cos(v * 28 - u * 9)) < 0.04
    const noise = hashNoise(x, y, 7)
    if (crack) return [145, 220, 235]
    const base = 220 + noise * 25
    return [base - 8, base + 8, 255]
  })
}

function waterTexture() {
  return createRgbPng(128, 128, (x, y) => {
    const u = x / 128
    const v = y / 128
    const wave = Math.sin(v * 54 + Math.sin(u * 17) * 2.8)
    const glint = Math.abs(wave) > 0.92 ? 55 : 0
    const depth = 0.55 + 0.45 * v
    return [12 + glint * 0.15, 86 * depth + glint * 0.45, 145 * depth + 38 + glint]
  })
}

function sandTexture() {
  return createRgbPng(128, 128, (x, y) => {
    const u = x / 128
    const v = y / 128
    const strata = Math.sin(v * 63 + Math.sin(u * 14) * 5) > 0.55
    const noise = hashNoise(x, y, 11)
    return strata
      ? [176 + noise * 18, 118 + noise * 16, 57 + noise * 12]
      : [205 + noise * 22, 157 + noise * 18, 86 + noise * 14]
  })
}

function fingerprint(bytes: Uint8Array) {
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function styleForPart(profile: TerraMaterialProfile, part: SemanticPart): MaterialStyle {
  const key = `${part.name} ${part.role}`.toLowerCase()

  if (profile === 'earth-guardian') {
    if (key.includes('continent')) return { name: 'guardian-land-relief', texture: 'earth', color: [0.72, 1, 0.72, 1], metallic: 0.02, roughness: 0.62 }
    if (key.includes('cloud')) return { name: 'guardian-clouds', texture: 'ice', color: [1, 1, 1, 1], metallic: 0, roughness: 0.74 }
    if (key.includes('display-base')) return { name: 'guardian-display-steel', texture: 'steel', color: [0.18, 0.24, 0.3, 1], metallic: 0.78, roughness: 0.32, emissive: [0.02, 0.12, 0.16] }
    if (key.includes('legs') || key.includes('boots')) return { name: 'guardian-boots', texture: 'steel', color: [0.14, 0.18, 0.22, 1], metallic: 0.3, roughness: 0.55 }
    if (key.includes('arms') || key.includes('hands')) return { name: 'guardian-gloves', texture: 'ice', color: [0.92, 0.98, 1, 1], metallic: 0, roughness: 0.58 }
    return { name: 'guardian-earth-body', texture: 'earth', color: [1, 1, 1, 1], metallic: 0.01, roughness: 0.56 }
  }

  if (profile === 'arctic') {
    if (key.includes('ice-reference') || key.includes('ice') || key.includes('freeboard')) return { name: 'arctic-ice', texture: 'ice', color: [0.92, 1, 1, 1], metallic: 0.02, roughness: 0.78 }
    return { name: 'arctic-brushed-steel', texture: 'steel', color: [0.74, 0.82, 0.88, 1], metallic: 0.86, roughness: 0.3, emissive: key.includes('instrument') || key.includes('gnss') ? [0.01, 0.12, 0.16] : [0, 0, 0] }
  }

  if (profile === 'ocean') {
    if (key.includes('surface-water') || key.includes('water-surface')) return { name: 'ocean-water', texture: 'water', color: [0.82, 0.98, 1, 0.74], metallic: 0, roughness: 0.18, doubleSided: true, alphaMode: 'BLEND' }
    if (key.includes('bathymetry') || key.includes('seabed') || key.includes('trench')) return { name: 'ocean-bathymetry', texture: 'water', color: [0.34, 0.56, 0.72, 1], metallic: 0.02, roughness: 0.82 }
    if (key.includes('synthetic-boundary')) return { name: 'ocean-synthetic-marker', texture: 'base', color: [1, 0.48, 0.18, 1], metallic: 0.08, roughness: 0.48, emissive: [0.08, 0.02, 0] }
    return { name: 'ocean-marine-steel', texture: 'steel', color: [0.58, 0.7, 0.76, 1], metallic: 0.9, roughness: 0.26, emissive: key.includes('auv') || key.includes('buoy') ? [0.01, 0.1, 0.1] : [0, 0, 0] }
  }

  if (profile === 'sahara-excavator') {
    if (key.includes('crawler') || key.includes('bucket')) return { name: 'excavator-weathered-steel', texture: 'steel', color: [0.28, 0.3, 0.3, 1], metallic: 0.82, roughness: 0.5 }
    if (key.includes('operator-cab')) return { name: 'excavator-smoked-glass', texture: 'steel', color: [0.18, 0.28, 0.34, 0.66], metallic: 0.15, roughness: 0.16, doubleSided: true, alphaMode: 'BLEND' }
    return { name: 'excavator-construction-yellow', texture: 'sand', color: [1, 0.74, 0.12, 1], metallic: 0.22, roughness: 0.58 }
  }

  if (profile === 'sahara') {
    if (key.includes('terrain') || key.includes('paleochannel') || key.includes('flow')) return { name: 'sahara-terrain', texture: 'sand', color: [0.92, 0.8, 0.6, 1], metallic: 0.01, roughness: 0.88 }
    if (key.includes('solar')) return { name: 'sahara-solar-dark-metal', texture: 'steel', color: [0.16, 0.22, 0.28, 1], metallic: 0.62, roughness: 0.34 }
    if (key.includes('mast') || key.includes('field-reference')) return { name: 'sahara-field-steel', texture: 'steel', color: [0.6, 0.55, 0.48, 1], metallic: 0.82, roughness: 0.32 }
    return { name: 'sahara-copper-lab', texture: 'sand', color: [0.72, 0.46, 0.22, 1], metallic: 0.38, roughness: 0.56 }
  }

  if (key.includes('earth-jpl-reference') || key.includes('earth-body')) return { name: 'earth-space-earth', texture: 'earth', color: [1, 1, 1, 1], metallic: 0.01, roughness: 0.58 }
  if (key.includes('grid') || key.includes('lattice')) return { name: 'earth-space-analysis-grid', texture: 'steel', color: [0.26, 0.22, 0.42, 1], metallic: 0.62, roughness: 0.34, emissive: [0.08, 0.03, 0.15] }
  if (key.includes('ring') || key.includes('observation')) return { name: 'earth-space-data-alloy', texture: 'steel', color: [0.36, 0.54, 0.7, 1], metallic: 0.78, roughness: 0.26, emissive: [0.04, 0.12, 0.18] }
  return { name: 'earth-space-obsidian-alloy', texture: 'steel', color: [0.1, 0.12, 0.18, 1], metallic: 0.82, roughness: 0.32 }
}

function textureBytes(profile: TerraMaterialProfile) {
  const result: Record<'earth' | 'steel' | 'ice' | 'water' | 'sand', Uint8Array> = {
    earth: earthTexture(),
    steel: steelTexture(),
    ice: iceTexture(),
    water: waterTexture(),
    sand: sandTexture(),
  }
  if (profile === 'earth-guardian' || profile === 'earth-space') return result
  return result
}

export function repairTerraMaterials(bundle: ProceduralAssetBundle, profile: TerraMaterialProfile): ProceduralAssetBundle {
  if (!bundle.semanticParts.length) return bundle

  const gltf = JSON.parse(bundle.model.content) as any
  const generated = textureBytes(profile)
  const imageDefs = [
    { key: 'base' as const, name: 'base-procedural', bytes: bundle.texture.bytes },
    { key: 'earth' as const, name: 'terra-earth-surface', bytes: generated.earth },
    { key: 'steel' as const, name: 'terra-brushed-steel', bytes: generated.steel },
    { key: 'ice' as const, name: 'terra-ice-surface', bytes: generated.ice },
    { key: 'water' as const, name: 'terra-water-surface', bytes: generated.water },
    { key: 'sand' as const, name: 'terra-sand-surface', bytes: generated.sand },
  ]
  const textureIndex = Object.fromEntries(imageDefs.map((item, index) => [item.key, index])) as Record<MaterialStyle['texture'], number>

  gltf.images = imageDefs.map(item => ({
    uri: `data:image/png;base64,${bytesToBase64(item.bytes)}`,
    mimeType: 'image/png',
    name: item.name,
    extras: { fingerprint: fingerprint(item.bytes), generatedVisualMaterial: item.key !== 'base' },
  }))
  gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]
  gltf.textures = imageDefs.map((_, source) => ({ sampler: 0, source }))

  const indexBufferView = 3
  const baseAccessorCount = 4
  const partAccessors = bundle.semanticParts.map((part, index) => ({
    accessorIndex: baseAccessorCount + index,
    accessor: {
      bufferView: indexBufferView,
      byteOffset: part.indexStart * 4,
      componentType: 5125,
      count: part.indexCount,
      type: 'SCALAR',
    },
  }))
  gltf.accessors = [...gltf.accessors.slice(0, baseAccessorCount), ...partAccessors.map(item => item.accessor)]

  const styles = bundle.semanticParts.map(part => styleForPart(profile, part))
  gltf.materials = styles.map(style => ({
    name: style.name,
    pbrMetallicRoughness: {
      baseColorTexture: { index: textureIndex[style.texture] },
      baseColorFactor: style.color,
      metallicFactor: style.metallic,
      roughnessFactor: style.roughness,
    },
    emissiveFactor: style.emissive ?? [0, 0, 0],
    doubleSided: style.doubleSided ?? false,
    ...(style.alphaMode ? { alphaMode: style.alphaMode } : {}),
  }))

  gltf.meshes[0].primitives = bundle.semanticParts.map((part, index) => ({
    attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
    indices: partAccessors[index].accessorIndex,
    material: index,
    extras: { semanticPart: part.name, semanticRole: part.role },
  }))
  gltf.extras = {
    ...(gltf.extras ?? {}),
    terraMaterialRepair: profile,
    materialTextures: Object.fromEntries(imageDefs.map(item => [item.key, fingerprint(item.bytes)])),
    truthBoundary: 'These PBR textures are generated visualization materials. Earth-like texture pixels are not satellite evidence and must never be used as scientific input.',
  }

  return {
    ...bundle,
    model: {
      ...bundle.model,
      filename: bundle.model.filename.replace(/\.gltf$/i, `-${profile}-materials.gltf`),
      content: JSON.stringify(gltf, null, 2),
    },
    truthBoundary: `${bundle.truthBoundary} Material repair adds generated PBR visualization textures for semantic model parts. The generated Earth/water/ice/sand/steel pixels are visual materials only and are never satellite evidence.`,
  }
}
