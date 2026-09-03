import type { AssetConfiguration } from '../commerce/productLab'

export type OwnerPieceRole = 'king' | 'queen' | 'bishop' | 'rook' | 'knight' | 'pawn' | 'board' | 'unknown'
export type OwnerModelFormat = 'gltf' | 'glb' | 'obj' | 'fbx' | 'blend' | 'unknown'
export type OwnerTextureRole = 'baseColor' | 'normal' | 'orm' | 'roughness' | 'metallic' | 'ao' | 'emissive' | 'unknown'

export type OwnerAssetInput = {
  name: string
  mimeType: string
  bytes: Uint8Array
}

export type OwnerModelReference = {
  name: string
  sha256: string
  format: OwnerModelFormat
  inferredRole: OwnerPieceRole
  bytes: number
  vertices: number | null
  triangles: number | null
  bounds: {
    min: [number, number, number] | null
    max: [number, number, number] | null
    width: number | null
    height: number | null
    depth: number | null
  }
  pbrSignals: {
    baseColor: boolean
    normal: boolean
    orm: boolean
    emissive: boolean
  }
  parseStatus: 'PARSED' | 'INVENTORIED_ONLY' | 'UNSUPPORTED'
}

export type OwnerTextureReference = {
  name: string
  sha256: string
  mimeType: string
  bytes: number
  role: OwnerTextureRole
  inferredPieceRole: OwnerPieceRole
  browserEmbeddable: boolean
}

export type OwnerReferenceProfile = {
  schema: 'forgemcp.owner-reference-profile.v1'
  status: 'OWNER_REFERENCE_READY' | 'OWNER_REFERENCE_PARTIAL' | 'NO_SUPPORTED_REFERENCE'
  manifestSha256: string
  models: OwnerModelReference[]
  textures: OwnerTextureReference[]
  calibration: {
    bestModelName: string | null
    suggestedScaleMm: number
    referenceAspect: number | null
    sourceVertices: number | null
    sourceTriangles: number | null
    targetTriangleFloor: number
    detailTier: 'standard' | 'high' | 'very-high'
    pbrCoverage: number
    embeddedTextureRoles: OwnerTextureRole[]
    note: string
  }
  truthBoundary: string
}

type GltfLike = {
  accessors?: Array<{ count?: number; min?: number[]; max?: number[] }>
  meshes?: Array<{ primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number; material?: number }> }>
  materials?: Array<{
    pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }
    normalTexture?: unknown
    occlusionTexture?: unknown
    emissiveTexture?: unknown
  }>
}

function extension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function modelFormat(name: string): OwnerModelFormat {
  const ext = extension(name)
  if (ext === 'gltf') return 'gltf'
  if (ext === 'glb') return 'glb'
  if (ext === 'obj') return 'obj'
  if (ext === 'fbx') return 'fbx'
  if (ext === 'blend') return 'blend'
  return 'unknown'
}

function inferPieceRole(name: string): OwnerPieceRole {
  const value = name.toLowerCase()
  if (/king|krol|kr[oó]l/.test(value)) return 'king'
  if (/queen|hetman|krolow|kr[oó]low/.test(value)) return 'queen'
  if (/bishop|goniec/.test(value)) return 'bishop'
  if (/rook|wieza|wie[zż]/.test(value)) return 'rook'
  if (/knight|horse|kon|ko[nń]/.test(value)) return 'knight'
  if (/pawn|pion/.test(value)) return 'pawn'
  if (/board|plansz|chessboard/.test(value)) return 'board'
  return 'unknown'
}

export function inferOwnerTextureRole(name: string): OwnerTextureRole {
  const value = name.toLowerCase()
  if (/normal|_n\.|-n\.|nrm/.test(value)) return 'normal'
  if (/orm|occlusionroughnessmetallic|arm/.test(value)) return 'orm'
  if (/rough/.test(value)) return 'roughness'
  if (/metal/.test(value)) return 'metallic'
  if (/(^|[_-])ao([_.-]|$)|occlusion/.test(value)) return 'ao'
  if (/emiss|glow|led/.test(value)) return 'emissive'
  if (/basecolor|albedo|diffuse|diff|color|colour/.test(value)) return 'baseColor'
  return 'unknown'
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes))
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('')
}

function uint32LE(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.byteLength) return 0
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
}

function parseGlb(bytes: Uint8Array): GltfLike | null {
  if (bytes.byteLength < 20 || uint32LE(bytes, 0) !== 0x46546c67) return null
  const jsonLength = uint32LE(bytes, 12)
  const jsonType = uint32LE(bytes, 16)
  if (jsonType !== 0x4e4f534a || jsonLength <= 0 || 20 + jsonLength > bytes.byteLength) return null
  try {
    const jsonBytes = bytes.slice(20, 20 + jsonLength)
    return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\u0000+$/g, '').trim()) as GltfLike
  } catch {
    return null
  }
}

function parseGltf(bytes: Uint8Array): GltfLike | null {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as GltfLike
  } catch {
    return null
  }
}

function tuple3(value: number[] | undefined): [number, number, number] | null {
  return value?.length === 3 && value.every(Number.isFinite) ? [value[0], value[1], value[2]] : null
}

function inspectGltf(gltf: GltfLike) {
  const primitive = gltf.meshes?.flatMap(mesh => mesh.primitives ?? [])[0]
  const positionAccessor = primitive?.attributes?.POSITION
  const indexAccessor = primitive?.indices
  const position = typeof positionAccessor === 'number' ? gltf.accessors?.[positionAccessor] : undefined
  const indices = typeof indexAccessor === 'number' ? gltf.accessors?.[indexAccessor] : undefined
  const min = tuple3(position?.min)
  const max = tuple3(position?.max)
  const dimensions = min && max ? {
    width: Math.max(0, max[0] - min[0]),
    height: Math.max(0, max[1] - min[1]),
    depth: Math.max(0, max[2] - min[2]),
  } : { width: null, height: null, depth: null }
  const materialIndex = primitive?.material ?? 0
  const material = gltf.materials?.[materialIndex]
  return {
    vertices: typeof position?.count === 'number' ? position.count : null,
    triangles: typeof indices?.count === 'number' ? Math.floor(indices.count / 3) : null,
    min,
    max,
    dimensions,
    pbrSignals: {
      baseColor: Boolean(material?.pbrMetallicRoughness?.baseColorTexture),
      normal: Boolean(material?.normalTexture),
      orm: Boolean(material?.pbrMetallicRoughness?.metallicRoughnessTexture || material?.occlusionTexture),
      emissive: Boolean(material?.emissiveTexture),
    },
  }
}

function inspectObj(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes)
  const vertices: Array<[number, number, number]> = []
  let triangles = 0
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const values = line.trim().split(/\s+/).slice(1, 4).map(Number)
      if (values.length === 3 && values.every(Number.isFinite)) vertices.push([values[0], values[1], values[2]])
    } else if (line.startsWith('f ')) {
      const count = line.trim().split(/\s+/).length - 1
      if (count >= 3) triangles += count - 2
    }
  }
  if (!vertices.length) return null
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  vertices.forEach(vertex => vertex.forEach((value, axis) => {
    min[axis] = Math.min(min[axis], value)
    max[axis] = Math.max(max[axis], value)
  }))
  return {
    vertices: vertices.length,
    triangles,
    min,
    max,
    dimensions: { width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] },
    pbrSignals: { baseColor: false, normal: false, orm: false, emissive: false },
  }
}

async function inspectModel(input: OwnerAssetInput): Promise<OwnerModelReference> {
  const format = modelFormat(input.name)
  let parsed: ReturnType<typeof inspectGltf> | ReturnType<typeof inspectObj> | null = null
  if (format === 'gltf') {
    const gltf = parseGltf(input.bytes)
    parsed = gltf ? inspectGltf(gltf) : null
  } else if (format === 'glb') {
    const gltf = parseGlb(input.bytes)
    parsed = gltf ? inspectGltf(gltf) : null
  } else if (format === 'obj') {
    parsed = inspectObj(input.bytes)
  }
  return {
    name: input.name,
    sha256: await sha256Hex(input.bytes),
    format,
    inferredRole: inferPieceRole(input.name),
    bytes: input.bytes.byteLength,
    vertices: parsed?.vertices ?? null,
    triangles: parsed?.triangles ?? null,
    bounds: {
      min: parsed?.min ?? null,
      max: parsed?.max ?? null,
      width: parsed?.dimensions.width ?? null,
      height: parsed?.dimensions.height ?? null,
      depth: parsed?.dimensions.depth ?? null,
    },
    pbrSignals: parsed?.pbrSignals ?? { baseColor: false, normal: false, orm: false, emissive: false },
    parseStatus: parsed ? 'PARSED' : ['fbx', 'blend'].includes(format) ? 'INVENTORIED_ONLY' : 'UNSUPPORTED',
  }
}

function isTexture(input: OwnerAssetInput) {
  const ext = extension(input.name)
  return ['png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp'].includes(ext) || input.mimeType.startsWith('image/')
}

function isModel(input: OwnerAssetInput) {
  return modelFormat(input.name) !== 'unknown'
}

function plausibleHeightMm(height: number | null) {
  if (!height || !Number.isFinite(height) || height <= 0) return null
  if (height >= 0.02 && height <= 1.5) return height * 1000
  if (height >= 20 && height <= 500) return height
  return null
}

function roleHeightFactor(role: OwnerPieceRole) {
  if (role === 'king') return 1.07
  if (role === 'queen') return 1.0
  if (role === 'bishop') return 0.98
  if (role === 'rook') return 0.9
  if (role === 'knight') return 1.02
  if (role === 'pawn') return 0.88
  return 1
}

export function chooseOwnerReferenceModel(profile: OwnerReferenceProfile, role: OwnerPieceRole) {
  return profile.models.find(model => model.inferredRole === role && model.parseStatus === 'PARSED')
    ?? profile.models.find(model => model.parseStatus === 'PARSED')
    ?? profile.models[0]
    ?? null
}

export function ownerTexturesForRole(profile: OwnerReferenceProfile, role: OwnerPieceRole) {
  const roleMatches = profile.textures.filter(texture => texture.inferredPieceRole === role)
  return roleMatches.length ? roleMatches : profile.textures.filter(texture => texture.inferredPieceRole === 'unknown')
}

export async function buildOwnerReferenceProfile(inputs: OwnerAssetInput[]): Promise<OwnerReferenceProfile> {
  const modelInputs = inputs.filter(isModel)
  const textureInputs = inputs.filter(isTexture)
  const models = await Promise.all(modelInputs.map(inspectModel))
  const textures: OwnerTextureReference[] = await Promise.all(textureInputs.map(async input => ({
    name: input.name,
    sha256: await sha256Hex(input.bytes),
    mimeType: input.mimeType || (extension(input.name) === 'png' ? 'image/png' : 'application/octet-stream'),
    bytes: input.bytes.byteLength,
    role: inferOwnerTextureRole(input.name),
    inferredPieceRole: inferPieceRole(input.name),
    browserEmbeddable: ['png', 'jpg', 'jpeg', 'webp'].includes(extension(input.name)),
  })))

  const best = models.find(model => model.parseStatus === 'PARSED' && model.inferredRole !== 'board')
    ?? models.find(model => model.parseStatus === 'PARSED')
    ?? models[0]
    ?? null
  const sourceTriangles = best?.triangles ?? null
  const sourceVertices = best?.vertices ?? null
  const heightMm = plausibleHeightMm(best?.bounds.height ?? null)
  const width = best?.bounds.width ?? null
  const height = best?.bounds.height ?? null
  const referenceAspect = width && height ? Number((height / width).toFixed(3)) : null
  const embeddedTextureRoles = Array.from(new Set(textures.map(texture => texture.role).filter(role => role !== 'unknown')))
  const pbrSignals = best?.pbrSignals
  const pbrCoverage = [
    pbrSignals?.baseColor || embeddedTextureRoles.includes('baseColor'),
    pbrSignals?.normal || embeddedTextureRoles.includes('normal'),
    pbrSignals?.orm || embeddedTextureRoles.includes('orm') || (embeddedTextureRoles.includes('roughness') && embeddedTextureRoles.includes('metallic')),
    pbrSignals?.emissive || embeddedTextureRoles.includes('emissive'),
  ].filter(Boolean).length
  const detailTier: OwnerReferenceProfile['calibration']['detailTier'] = (sourceTriangles ?? 0) >= 18000 ? 'very-high' : (sourceTriangles ?? 0) >= 6000 ? 'high' : 'standard'
  const targetTriangleFloor = Math.min(30000, Math.max(4000, sourceTriangles ? Math.round(sourceTriangles * 0.75) : 8000))
  const manifestSeed = new TextEncoder().encode([...models.map(model => model.sha256), ...textures.map(texture => texture.sha256)].sort().join('|'))
  const manifestSha256 = await sha256Hex(manifestSeed)
  const status: OwnerReferenceProfile['status'] = models.some(model => model.parseStatus === 'PARSED')
    ? 'OWNER_REFERENCE_READY'
    : models.length || textures.length
      ? 'OWNER_REFERENCE_PARTIAL'
      : 'NO_SUPPORTED_REFERENCE'

  return {
    schema: 'forgemcp.owner-reference-profile.v1',
    status,
    manifestSha256,
    models,
    textures,
    calibration: {
      bestModelName: best?.name ?? null,
      suggestedScaleMm: Math.max(20, Math.min(500, Math.round(heightMm ?? 110))),
      referenceAspect,
      sourceVertices,
      sourceTriangles,
      targetTriangleFloor,
      detailTier,
      pbrCoverage,
      embeddedTextureRoles,
      note: best
        ? 'Generator can calibrate target scale and detail expectations from this owner model. PBR maps are reused only when the local file is browser-embeddable and explicitly selected in the current session.'
        : 'No parseable owner model was found; texture inventory can still guide PBR completeness but geometry stays on the deterministic Premium V2 fallback.',
    },
    truthBoundary: 'Files are analysed locally in browser memory. Nothing in this profile proves redistribution rights, production readiness or that a SwissTransfer archive was fetched by ForgeMCP. The profile becomes authoritative only for the files explicitly selected by the owner in this session.',
  }
}

export function calibrateOwnerReferenceConfiguration(
  input: AssetConfiguration,
  profile: OwnerReferenceProfile,
  role: OwnerPieceRole,
): AssetConfiguration {
  const reference = chooseOwnerReferenceModel(profile, role)
  const referenceHeightMm = plausibleHeightMm(reference?.bounds.height ?? null)
  const scaleMm = referenceHeightMm
    ? Math.round(referenceHeightMm / roleHeightFactor(role))
    : input.scaleMm
  const detail = profile.calibration.detailTier
  const pbr = profile.calibration.embeddedTextureRoles.join(', ') || 'no external map detected'
  return {
    ...input,
    scaleMm: Math.max(20, Math.min(500, scaleMm)),
    material: `${input.material} · owner-reference ${profile.manifestSha256.slice(0, 12)} · detail ${detail}`,
    texture: `${input.texture} · owner maps: ${pbr}`,
    prompt: `${input.prompt}\n\nOWNER REFERENCE CALIBRATION: use reference ${reference?.name ?? 'none'} only as owner-authorized proportion/detail/PBR guidance. Target triangle floor ${profile.calibration.targetTriangleFloor.toLocaleString('en-US')} with hard runtime cap 30,000 triangles. Preserve legal one-cell footprint, normalized pivot/base and recognizable ${role} silhouette. Do not claim the reference file was generated during the challenge.`,
  }
}
