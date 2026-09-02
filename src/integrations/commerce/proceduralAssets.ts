import type { AssetKind, AssetSpecification } from './productLab'

type Mesh = {
  positions: number[]
  normals: number[]
  texcoords: number[]
  indices: number[]
}

export type ProceduralPreset =
  | 'earth-guardian'
  | 'facet-rook'
  | 'crayon-knight'
  | 'classic-pawn'
  | 'led-board'
  | 'research-station'
  | 'texture-tile'

export interface ProceduralAssetBundle {
  status: 'LOCAL_PROCEDURAL_ASSET_READY'
  generator: 'ForgeMCP procedural exporter v1'
  specificationId: string
  assetContentGeneratedInMemory: true
  downloadReady: true
  filePersisted: false
  manufacturingReady: false
  renderSource: 'EXPORTED_GLTF_GEOMETRY'
  geometryFingerprint: string
  preview: {
    preset: ProceduralPreset
    label: string
    promptMatched: boolean
    primaryColor: string
    secondaryColor: string
    positions: number[]
    normals: number[]
    indices: number[]
  }
  model: {
    filename: string
    mimeType: 'model/gltf+json'
    content: string
  }
  texture: {
    filename: string
    mimeType: 'image/png'
    width: 128
    height: 128
    bytes: Uint8Array
  }
  metrics: {
    vertices: number
    triangles: number
    embeddedTexture: true
    selfContained: true
  }
  qa: {
    parseableGltfJson: boolean
    geometryPresent: boolean
    binaryLengthMatches: boolean
    indicesWithinVertexRange: boolean
    finitePositions: boolean
    bufferViewsAligned: boolean
    pngSignatureValid: boolean
    specificationLinked: boolean
    presetResolved: boolean
    geometryFingerprintLinked: boolean
    result: 'GENERATOR_CHECKS_PASS' | 'GENERATOR_CHECKS_FAIL'
  }
  truthBoundary: string
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

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function addSphere(mesh: Mesh, center: [number, number, number], radius: [number, number, number], latitudeSegments = 10, longitudeSegments = 16) {
  const base = mesh.positions.length / 3
  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const v = latitude / latitudeSegments
    const theta = v * Math.PI
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const u = longitude / longitudeSegments
      const phi = u * Math.PI * 2
      const nx = Math.sin(theta) * Math.cos(phi)
      const ny = Math.cos(theta)
      const nz = Math.sin(theta) * Math.sin(phi)
      const normalLength = Math.hypot(nx / radius[0], ny / radius[1], nz / radius[2]) || 1
      mesh.positions.push(center[0] + nx * radius[0], center[1] + ny * radius[1], center[2] + nz * radius[2])
      mesh.normals.push((nx / radius[0]) / normalLength, (ny / radius[1]) / normalLength, (nz / radius[2]) / normalLength)
      mesh.texcoords.push(u, 1 - v)
    }
  }
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const first = base + latitude * (longitudeSegments + 1) + longitude
      const second = first + longitudeSegments + 1
      mesh.indices.push(first, second, first + 1, second, second + 1, first + 1)
    }
  }
}

function addBox(mesh: Mesh, center: [number, number, number], size: [number, number, number]) {
  const [cx, cy, cz] = center
  const [hx, hy, hz] = size.map(value => value / 2) as [number, number, number]
  const faces: Array<{ normal: [number, number, number]; corners: Array<[number, number, number]> }> = [
    { normal: [0, 0, 1], corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { normal: [0, 0, -1], corners: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { normal: [1, 0, 0], corners: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { normal: [-1, 0, 0], corners: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
    { normal: [0, 1, 0], corners: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { normal: [0, -1, 0], corners: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
  ]
  for (const face of faces) {
    const base = mesh.positions.length / 3
    face.corners.forEach(([x, y, z], index) => {
      mesh.positions.push(cx + x, cy + y, cz + z)
      mesh.normals.push(...face.normal)
      mesh.texcoords.push(index === 1 || index === 2 ? 1 : 0, index >= 2 ? 1 : 0)
    })
    mesh.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
}

function addCylinder(
  mesh: Mesh,
  center: [number, number, number],
  height: number,
  bottomRadius: number,
  topRadius = bottomRadius,
  segments = 18,
) {
  const [cx, cy, cz] = center
  const half = height / 2
  const sideBase = mesh.positions.length / 3
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments
    const angle = u * Math.PI * 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    mesh.positions.push(cx + cosine * bottomRadius, cy - half, cz + sine * bottomRadius)
    mesh.positions.push(cx + cosine * topRadius, cy + half, cz + sine * topRadius)
    mesh.normals.push(cosine, 0, sine, cosine, 0, sine)
    mesh.texcoords.push(u, 0, u, 1)
  }
  for (let index = 0; index < segments; index += 1) {
    const first = sideBase + index * 2
    mesh.indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
  }

  for (const [y, radius, normal, reverse] of [
    [cy - half, bottomRadius, -1, true],
    [cy + half, topRadius, 1, false],
  ] as Array<[number, number, number, boolean]>) {
    const base = mesh.positions.length / 3
    mesh.positions.push(cx, y, cz)
    mesh.normals.push(0, normal, 0)
    mesh.texcoords.push(0.5, 0.5)
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2
      mesh.positions.push(cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius)
      mesh.normals.push(0, normal, 0)
      mesh.texcoords.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5)
    }
    for (let index = 0; index < segments; index += 1) {
      if (reverse) mesh.indices.push(base, base + index + 2, base + index + 1)
      else mesh.indices.push(base, base + index + 1, base + index + 2)
    }
  }
}

const promptIncludes = (prompt: string, expressions: string[]) => expressions.some(value => prompt.includes(value))

export function selectProceduralPreset(specification: Pick<AssetSpecification, 'assetKind' | 'piecePreset' | 'prompt'>): { preset: ProceduralPreset; promptMatched: boolean } {
  const prompt = specification.prompt.toLocaleLowerCase('pl')
  if (specification.assetKind === 'board') return { preset: 'led-board', promptMatched: promptIncludes(prompt, ['szachownic', 'chessboard', 'plansz']) }
  if (specification.assetKind === 'station-shell') return { preset: 'research-station', promptMatched: promptIncludes(prompt, ['stacja badawc', 'research station', 'laboratori']) }
  if (specification.assetKind === 'texture-pack') return { preset: 'texture-tile', promptMatched: false }
  if (promptIncludes(prompt, ['ziemi', 'earth', 'planet'])) return { preset: 'earth-guardian', promptMatched: true }
  const rookMatched = promptIncludes(prompt, ['wież', 'rook', 'castle'])
  if (rookMatched || specification.piecePreset === 'czech-facet') return { preset: 'facet-rook', promptMatched: rookMatched }
  const knightMatched = promptIncludes(prompt, ['koń', 'kon ', 'knight', 'horse', 'crayon'])
  if (knightMatched || specification.piecePreset === 'lab-ledcolor') return { preset: 'crayon-knight', promptMatched: knightMatched }
  const pawnMatched = promptIncludes(prompt, ['pion', 'pawn'])
  if (pawnMatched || specification.piecePreset === 'classic') return { preset: 'classic-pawn', promptMatched: pawnMatched }
  return { preset: 'earth-guardian', promptMatched: false }
}

function createEarthGuardian(mesh: Mesh, scale: number) {
  addCylinder(mesh, [0, scale * 0.035, 0], scale * 0.07, scale * 0.38, scale * 0.34, 24)
  addSphere(mesh, [0, scale * 0.58, 0], [scale * 0.3, scale * 0.3, scale * 0.3], 14, 24)
  addSphere(mesh, [-scale * 0.34, scale * 0.55, 0], [scale * 0.09, scale * 0.22, scale * 0.08], 8, 12)
  addSphere(mesh, [scale * 0.34, scale * 0.55, 0], [scale * 0.09, scale * 0.22, scale * 0.08], 8, 12)
  addSphere(mesh, [-scale * 0.13, scale * 0.2, 0], [scale * 0.1, scale * 0.21, scale * 0.11], 8, 12)
  addSphere(mesh, [scale * 0.13, scale * 0.2, 0], [scale * 0.1, scale * 0.21, scale * 0.11], 8, 12)
}

function createFacetRook(mesh: Mesh, scale: number) {
  addCylinder(mesh, [0, scale * 0.06, 0], scale * 0.12, scale * 0.34, scale * 0.29, 12)
  addCylinder(mesh, [0, scale * 0.26, 0], scale * 0.28, scale * 0.25, scale * 0.17, 10)
  addCylinder(mesh, [0, scale * 0.54, 0], scale * 0.28, scale * 0.17, scale * 0.25, 10)
  addCylinder(mesh, [0, scale * 0.73, 0], scale * 0.11, scale * 0.3, scale * 0.3, 12)
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2
    addBox(mesh, [Math.cos(angle) * scale * 0.22, scale * 0.86, Math.sin(angle) * scale * 0.22], [scale * 0.16, scale * 0.18, scale * 0.16])
  }
}

function createCrayonKnight(mesh: Mesh, scale: number) {
  addCylinder(mesh, [0, scale * 0.06, 0], scale * 0.12, scale * 0.35, scale * 0.3, 18)
  addCylinder(mesh, [0, scale * 0.24, 0], scale * 0.25, scale * 0.24, scale * 0.17, 14)
  addSphere(mesh, [scale * 0.04, scale * 0.53, 0], [scale * 0.2, scale * 0.28, scale * 0.17], 9, 14)
  addSphere(mesh, [scale * 0.13, scale * 0.72, 0], [scale * 0.19, scale * 0.16, scale * 0.15], 8, 12)
  addBox(mesh, [scale * 0.28, scale * 0.69, 0], [scale * 0.2, scale * 0.12, scale * 0.16])
  addCylinder(mesh, [scale * 0.04, scale * 0.88, -scale * 0.08], scale * 0.28, scale * 0.045, 0, 10)
  addCylinder(mesh, [scale * 0.04, scale * 0.88, scale * 0.08], scale * 0.28, scale * 0.045, 0, 10)
}

function createClassicPawn(mesh: Mesh, scale: number) {
  addCylinder(mesh, [0, scale * 0.055, 0], scale * 0.11, scale * 0.34, scale * 0.29, 24)
  addCylinder(mesh, [0, scale * 0.24, 0], scale * 0.27, scale * 0.24, scale * 0.14, 20)
  addCylinder(mesh, [0, scale * 0.43, 0], scale * 0.1, scale * 0.2, scale * 0.18, 20)
  addSphere(mesh, [0, scale * 0.66, 0], [scale * 0.21, scale * 0.21, scale * 0.21], 12, 20)
}

function createResearchStation(mesh: Mesh, scale: number, stationId: AssetSpecification['stationId']) {
  if (stationId === 'arctic') {
    addCylinder(mesh, [0, scale * 0.05, 0], scale * 0.1, scale * 0.5, scale * 0.46, 24)
    addSphere(mesh, [0, scale * 0.28, 0], [scale * 0.4, scale * 0.3, scale * 0.4], 10, 20)
    for (const x of [-0.34, 0.34]) addCylinder(mesh, [x * scale, scale * 0.35, 0], scale * 0.6, scale * 0.035, scale * 0.02, 10)
    addBox(mesh, [0, scale * 0.72, 0], [scale * 0.54, scale * 0.035, scale * 0.18])
    return
  }
  if (stationId === 'sahara') {
    addBox(mesh, [0, scale * 0.06, 0], [scale, scale * 0.12, scale * 0.72])
    addSphere(mesh, [-scale * 0.2, scale * 0.31, 0], [scale * 0.3, scale * 0.28, scale * 0.3], 9, 18)
    addBox(mesh, [scale * 0.32, scale * 0.24, -scale * 0.25], [scale * 0.42, scale * 0.035, scale * 0.28])
    addBox(mesh, [scale * 0.32, scale * 0.24, scale * 0.25], [scale * 0.42, scale * 0.035, scale * 0.28])
    addCylinder(mesh, [-scale * 0.2, scale * 0.7, 0], scale * 0.48, scale * 0.035, scale * 0.018, 10)
    return
  }
  if (stationId === 'ocean') {
    addCylinder(mesh, [0, scale * 0.08, 0], scale * 0.16, scale * 0.48, scale * 0.42, 24)
    addCylinder(mesh, [0, scale * 0.38, 0], scale * 0.52, scale * 0.18, scale * 0.1, 16)
    addSphere(mesh, [0, scale * 0.67, 0], [scale * 0.22, scale * 0.19, scale * 0.22], 9, 16)
    for (let index = 0; index < 3; index += 1) {
      const angle = index / 3 * Math.PI * 2
      addSphere(mesh, [Math.cos(angle) * scale * 0.48, scale * 0.22, Math.sin(angle) * scale * 0.48], [scale * 0.13, scale * 0.1, scale * 0.13], 7, 12)
    }
    return
  }
  addBox(mesh, [0, scale * 0.06, 0], [scale, scale * 0.12, scale * 0.78])
  addSphere(mesh, [0, scale * 0.3, 0], [scale * 0.34, scale * 0.29, scale * 0.34], 11, 20)
  addCylinder(mesh, [0, scale * 0.68, 0], scale * 0.62, scale * 0.035, scale * 0.018, 12)
  addBox(mesh, [-scale * 0.34, scale * 0.76, 0], [scale * 0.5, scale * 0.035, scale * 0.22])
  addBox(mesh, [scale * 0.34, scale * 0.76, 0], [scale * 0.5, scale * 0.035, scale * 0.22])
}

function createMesh(specification: AssetSpecification): { mesh: Mesh; preset: ProceduralPreset; promptMatched: boolean; label: string } {
  const mesh: Mesh = { positions: [], normals: [], texcoords: [], indices: [] }
  const scale = specification.scaleMm / 1000
  const { preset, promptMatched } = selectProceduralPreset(specification)
  if (preset === 'earth-guardian') createEarthGuardian(mesh, scale)
  else if (preset === 'facet-rook') createFacetRook(mesh, scale)
  else if (preset === 'crayon-knight') createCrayonKnight(mesh, scale)
  else if (preset === 'classic-pawn') createClassicPawn(mesh, scale)
  else if (preset === 'led-board') {
    addBox(mesh, [0, scale * 0.035, 0], [scale, scale * 0.07, scale])
    addBox(mesh, [0, scale * 0.075, 0], [scale * 0.88, scale * 0.02, scale * 0.88])
  } else if (preset === 'research-station') {
    createResearchStation(mesh, scale, specification.stationId)
  } else {
    addBox(mesh, [0, scale * 0.01, 0], [scale, scale * 0.02, scale])
  }
  const labels: Record<ProceduralPreset, string> = {
    'earth-guardian': 'Earth Guardian character',
    'facet-rook': 'ForgeMCP faceted rook',
    'crayon-knight': 'Crayon orbital knight',
    'classic-pawn': 'Classic low-poly pawn',
    'led-board': 'LED chessboard tile',
    'research-station': 'Research-station shell',
    'texture-tile': 'Procedural texture tile',
  }
  return { mesh, preset, promptMatched, label: labels[preset] }
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

function createTexturePng(primaryHex: string, secondaryHex: string, kind: AssetKind) {
  const width = 128
  const height = 128
  const primary = hexToRgb(primaryHex)
  const secondary = hexToRgb(secondaryHex)
  const raw = new Uint8Array((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0
    offset += 1
    for (let x = 0; x < width; x += 1) {
      const checker = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) === 0
      const wave = Math.sin(x * 0.17) + Math.cos(y * 0.13) + Math.sin((x + y) * 0.07)
      const useSecondary = kind === 'board' ? checker : kind === 'figurine' ? wave > 1.05 : ((x * 3 + y * 5) % 31) < 5
      const source = useSecondary ? secondary : primary
      const glow = ((x + y) % 32 === 0 || x % 32 === 0 || y % 32 === 0) ? 1.16 : 0.86 + 0.14 * ((x + y) / (width + height))
      raw[offset] = Math.min(255, Math.round(source[0] * glow))
      raw[offset + 1] = Math.min(255, Math.round(source[1] * glow))
      raw[offset + 2] = Math.min(255, Math.round(source[2] * glow))
      offset += 3
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

function typedBytes(values: number[], kind: 'float32' | 'uint32') {
  const typed = kind === 'float32' ? new Float32Array(values) : new Uint32Array(values)
  return new Uint8Array(typed.buffer)
}

function vectorBounds(values: number[]) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis])
      max[axis] = Math.max(max[axis], values[index + axis])
    }
  }
  return { min, max }
}

function geometryFingerprint(mesh: Mesh) {
  let hash = 2166136261
  for (const value of [...mesh.positions, ...mesh.indices]) {
    const text = Number.isInteger(value) ? `${value};` : `${value.toFixed(7)};`
    for (const character of text) {
      hash ^= character.charCodeAt(0)
      hash = Math.imul(hash, 16777619)
    }
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function generateProceduralAssetBundle(specification: AssetSpecification): ProceduralAssetBundle {
  const generated = createMesh(specification)
  const { mesh } = generated
  const positions = typedBytes(mesh.positions, 'float32')
  const normals = typedBytes(mesh.normals, 'float32')
  const texcoords = typedBytes(mesh.texcoords, 'float32')
  const indices = typedBytes(mesh.indices, 'uint32')
  const binary = concat([positions, normals, texcoords, indices])
  const fingerprint = geometryFingerprint(mesh)
  const texture = createTexturePng(specification.primaryColor, specification.secondaryColor, specification.assetKind)
  const bounds = vectorBounds(mesh.positions)
  const gltf = {
    asset: { version: '2.0', generator: 'ForgeMCP procedural exporter v1' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: `${specification.stationName} ${specification.assetKind}` }],
    meshes: [{ name: specification.id, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: `${specification.stationId}-material`, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0.12, roughnessFactor: 0.62 }, emissiveFactor: hexToRgb(specification.secondaryColor).map(value => Number(((value / 255) * specification.ledIntensity / 500).toFixed(4))) }],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [{ uri: `data:image/png;base64,${bytesToBase64(texture)}`, mimeType: 'image/png', name: `${specification.id}-texture` }],
    buffers: [{ uri: `data:application/octet-stream;base64,${bytesToBase64(binary)}`, byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length, byteLength: normals.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length, byteLength: texcoords.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length + texcoords.length, byteLength: indices.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: mesh.positions.length / 3, type: 'VEC3', min: bounds.min, max: bounds.max },
      { bufferView: 1, componentType: 5126, count: mesh.normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: mesh.texcoords.length / 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: mesh.indices.length, type: 'SCALAR' },
    ],
    extras: {
      specificationId: specification.id,
      sourcePrompt: specification.prompt,
      status: 'LOCAL_PROCEDURAL_PROTOTYPE',
      manufacturingReady: false,
      units: 'metres',
      sourceScaleMm: specification.scaleMm,
      proceduralPreset: generated.preset,
      geometryFingerprint: fingerprint,
      renderSource: 'EXPORTED_GLTF_GEOMETRY',
    },
  }
  const content = JSON.stringify(gltf, null, 2)
  JSON.parse(content)
  const vertexCount = mesh.positions.length / 3
  const pngSignatureValid = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => texture[index] === byte)
  const generatorChecks = {
    parseableGltfJson: true,
    geometryPresent: mesh.positions.length > 0,
    binaryLengthMatches: binary.length === positions.length + normals.length + texcoords.length + indices.length,
    indicesWithinVertexRange: mesh.indices.every(index => index >= 0 && index < vertexCount),
    finitePositions: mesh.positions.every(Number.isFinite),
    bufferViewsAligned: [0, positions.length, positions.length + normals.length, positions.length + normals.length + texcoords.length].every(offset => offset % 4 === 0),
    pngSignatureValid,
    specificationLinked: gltf.extras.specificationId === specification.id,
    presetResolved: gltf.extras.proceduralPreset === generated.preset,
    geometryFingerprintLinked: gltf.extras.geometryFingerprint === fingerprint,
  }
  return {
    status: 'LOCAL_PROCEDURAL_ASSET_READY',
    generator: 'ForgeMCP procedural exporter v1',
    specificationId: specification.id,
    assetContentGeneratedInMemory: true,
    downloadReady: true,
    filePersisted: false,
    manufacturingReady: false,
    renderSource: 'EXPORTED_GLTF_GEOMETRY',
    geometryFingerprint: fingerprint,
    preview: {
      preset: generated.preset,
      label: generated.label,
      promptMatched: generated.promptMatched,
      primaryColor: specification.primaryColor,
      secondaryColor: specification.secondaryColor,
      positions: mesh.positions,
      normals: mesh.normals,
      indices: mesh.indices,
    },
    model: { filename: `${specification.id}.gltf`, mimeType: 'model/gltf+json', content },
    texture: { filename: `${specification.id}-texture.png`, mimeType: 'image/png', width: 128, height: 128, bytes: texture },
    metrics: { vertices: vertexCount, triangles: mesh.indices.length / 3, embeddedTexture: true, selfContained: true },
    qa: { ...generatorChecks, result: Object.values(generatorChecks).every(Boolean) ? 'GENERATOR_CHECKS_PASS' : 'GENERATOR_CHECKS_FAIL' },
    truthBoundary: 'Real procedural glTF model data and PNG texture bytes were generated in browser memory and are ready for explicit download. The prompt interpreter selects only the supported deterministic presets; other prompt details remain instructions for the Codex brief. The generator checks are not Khronos conformance validation, printability proof, certified device or manufactured product.',
  }
}

export function proceduralAssetManifest(bundle: ProceduralAssetBundle) {
  return {
    status: bundle.status,
    generator: bundle.generator,
    specificationId: bundle.specificationId,
    assetContentGeneratedInMemory: bundle.assetContentGeneratedInMemory,
    downloadReady: bundle.downloadReady,
    filePersisted: bundle.filePersisted,
    manufacturingReady: bundle.manufacturingReady,
    renderSource: bundle.renderSource,
    geometryFingerprint: bundle.geometryFingerprint,
    preview: {
      preset: bundle.preview.preset,
      label: bundle.preview.label,
      promptMatched: bundle.preview.promptMatched,
    },
    files: [
      { filename: bundle.model.filename, mimeType: bundle.model.mimeType },
      { filename: bundle.texture.filename, mimeType: bundle.texture.mimeType, width: bundle.texture.width, height: bundle.texture.height },
    ],
    metrics: bundle.metrics,
    qa: bundle.qa,
    truthBoundary: bundle.truthBoundary,
  }
}
