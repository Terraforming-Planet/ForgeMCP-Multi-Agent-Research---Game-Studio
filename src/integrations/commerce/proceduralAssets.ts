import type { AssetSpecification } from './productLab'

type Mesh = {
  positions: number[]
  normals: number[]
  texcoords: number[]
  indices: number[]
  semanticParts: SemanticPart[]
}

export type SemanticPart = {
  name: string
  role: string
  vertexStart: number
  vertexCount: number
  indexStart: number
  indexCount: number
}

export type ProceduralTexturePattern =
  | 'earth-contours-clouds'
  | 'facet-led-inlay'
  | 'crayon-spectrum'
  | 'classic-stone'
  | 'checker-led-grid'
  | 'classic-checker-stone'
  | 'cube-512-level-grid'
  | 'arctic-cryo-instruments'
  | 'sahara-strata-flow'
  | 'ocean-bathymetry-sonar'
  | 'earth-space-orbital-grid'
  | 'material-microgrid'

export type ProceduralPreset =
  | 'earth-guardian'
  | 'facet-king'
  | 'facet-queen'
  | 'facet-bishop'
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
  textureFingerprint: string
  semanticParts: SemanticPart[]
  preview: {
    preset: ProceduralPreset
    label: string
    promptMatched: boolean
    primaryColor: string
    secondaryColor: string
    positions: number[]
    normals: number[]
    texcoords: number[]
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
    fingerprint: string
    pattern: ProceduralTexturePattern
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
    textureFingerprintLinked: boolean
    semanticPartsPresent: boolean
    semanticPartRangesValid: boolean
    texturePatternResolved: boolean
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

function addSemanticPart(mesh: Mesh, name: string, role: string, build: () => void) {
  const vertexStart = mesh.positions.length / 3
  const indexStart = mesh.indices.length
  build()
  const part = {
    name,
    role,
    vertexStart,
    vertexCount: mesh.positions.length / 3 - vertexStart,
    indexStart,
    indexCount: mesh.indices.length - indexStart,
  }
  if (part.vertexCount > 0 && part.indexCount > 0) mesh.semanticParts.push(part)
}

function rotatePoint([x, y, z]: [number, number, number], [rx, ry, rz]: [number, number, number]): [number, number, number] {
  const cx = Math.cos(rx)
  const sx = Math.sin(rx)
  const cy = Math.cos(ry)
  const sy = Math.sin(ry)
  const cz = Math.cos(rz)
  const sz = Math.sin(rz)
  const x1 = x
  const y1 = y * cx - z * sx
  const z1 = y * sx + z * cx
  const x2 = x1 * cy + z1 * sy
  const y2 = y1
  const z2 = -x1 * sy + z1 * cy
  return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2]
}

function rotateNewGeometry(mesh: Mesh, vertexStart: number, center: [number, number, number], rotation: [number, number, number]) {
  for (let vertex = vertexStart; vertex < mesh.positions.length / 3; vertex += 1) {
    const positionIndex = vertex * 3
    const relative: [number, number, number] = [
      mesh.positions[positionIndex] - center[0],
      mesh.positions[positionIndex + 1] - center[1],
      mesh.positions[positionIndex + 2] - center[2],
    ]
    const position = rotatePoint(relative, rotation)
    const normal = rotatePoint([
      mesh.normals[positionIndex],
      mesh.normals[positionIndex + 1],
      mesh.normals[positionIndex + 2],
    ], rotation)
    mesh.positions[positionIndex] = center[0] + position[0]
    mesh.positions[positionIndex + 1] = center[1] + position[1]
    mesh.positions[positionIndex + 2] = center[2] + position[2]
    mesh.normals[positionIndex] = normal[0]
    mesh.normals[positionIndex + 1] = normal[1]
    mesh.normals[positionIndex + 2] = normal[2]
  }
}

function addOrientedBox(mesh: Mesh, center: [number, number, number], size: [number, number, number], rotation: [number, number, number]) {
  const start = mesh.positions.length / 3
  addBox(mesh, center, size)
  rotateNewGeometry(mesh, start, center, rotation)
}

function addOrientedCylinder(
  mesh: Mesh,
  center: [number, number, number],
  height: number,
  bottomRadius: number,
  topRadius: number,
  segments: number,
  rotation: [number, number, number],
) {
  const start = mesh.positions.length / 3
  addCylinder(mesh, center, height, bottomRadius, topRadius, segments)
  rotateNewGeometry(mesh, start, center, rotation)
}

function addTorus(
  mesh: Mesh,
  center: [number, number, number],
  majorRadius: number,
  tubeRadius: number,
  majorSegments = 32,
  tubeSegments = 8,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const base = mesh.positions.length / 3
  for (let major = 0; major <= majorSegments; major += 1) {
    const u = major / majorSegments
    const majorAngle = u * Math.PI * 2
    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const v = tube / tubeSegments
      const tubeAngle = v * Math.PI * 2
      const ring = majorRadius + tubeRadius * Math.cos(tubeAngle)
      const local: [number, number, number] = [
        ring * Math.cos(majorAngle),
        tubeRadius * Math.sin(tubeAngle),
        ring * Math.sin(majorAngle),
      ]
      const localNormal: [number, number, number] = [
        Math.cos(tubeAngle) * Math.cos(majorAngle),
        Math.sin(tubeAngle),
        Math.cos(tubeAngle) * Math.sin(majorAngle),
      ]
      const position = rotatePoint(local, rotation)
      const normal = rotatePoint(localNormal, rotation)
      mesh.positions.push(center[0] + position[0], center[1] + position[1], center[2] + position[2])
      mesh.normals.push(...normal)
      mesh.texcoords.push(u, v)
    }
  }
  for (let major = 0; major < majorSegments; major += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const first = base + major * (tubeSegments + 1) + tube
      const second = first + tubeSegments + 1
      mesh.indices.push(first, second, first + 1, second, second + 1, first + 1)
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
  const queenMatched = promptIncludes(prompt, ['królow', 'krolow', 'hetman', 'queen'])
  if (queenMatched) return { preset: 'facet-queen', promptMatched: true }
  const kingMatched = promptIncludes(prompt, ['król', 'krol', 'king'])
  if (kingMatched) return { preset: 'facet-king', promptMatched: true }
  const bishopMatched = promptIncludes(prompt, ['goniec', 'bishop'])
  if (bishopMatched) return { preset: 'facet-bishop', promptMatched: true }
  const rookMatched = promptIncludes(prompt, ['wież', 'rook', 'castle'])
  if (rookMatched || specification.piecePreset === 'czech-facet') return { preset: 'facet-rook', promptMatched: rookMatched }
  const knightMatched = promptIncludes(prompt, ['koń', 'kon ', 'knight', 'horse', 'crayon'])
  if (knightMatched || specification.piecePreset === 'lab-ledcolor') return { preset: 'crayon-knight', promptMatched: knightMatched }
  const pawnMatched = promptIncludes(prompt, ['pion', 'pawn'])
  if (pawnMatched || specification.piecePreset === 'classic') return { preset: 'classic-pawn', promptMatched: pawnMatched }
  return { preset: 'earth-guardian', promptMatched: false }
}

function createEarthGuardian(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'display-base', 'stable-board-clearance-and-led-plinth', () => {
    addCylinder(mesh, [0, scale * 0.045, 0], scale * 0.09, scale * 0.38, scale * 0.34, 36)
    addTorus(mesh, [0, scale * 0.1, 0], scale * 0.3, scale * 0.025, 36, 8)
  })
  addSemanticPart(mesh, 'earth-character-body', 'stylized-earth-character-not-a-satellite-product', () => {
    addSphere(mesh, [0, scale * 0.59, 0], [scale * 0.31, scale * 0.31, scale * 0.31], 20, 32)
    addSphere(mesh, [-scale * 0.09, scale * 0.67, scale * 0.286], [scale * 0.075, scale * 0.09, scale * 0.035], 10, 14)
    addSphere(mesh, [scale * 0.09, scale * 0.67, scale * 0.286], [scale * 0.075, scale * 0.09, scale * 0.035], 10, 14)
    addSphere(mesh, [-scale * 0.09, scale * 0.67, scale * 0.322], [scale * 0.027, scale * 0.038, scale * 0.018], 8, 12)
    addSphere(mesh, [scale * 0.09, scale * 0.67, scale * 0.322], [scale * 0.027, scale * 0.038, scale * 0.018], 8, 12)
  })
  addSemanticPart(mesh, 'raised-continent-relief', 'decorative-continent-relief-not-geospatial-evidence', () => {
    addSphere(mesh, [-scale * 0.12, scale * 0.61, scale * 0.292], [scale * 0.105, scale * 0.145, scale * 0.026], 9, 14)
    addSphere(mesh, [scale * 0.16, scale * 0.52, scale * 0.275], [scale * 0.095, scale * 0.105, scale * 0.022], 9, 14)
    addSphere(mesh, [scale * 0.19, scale * 0.71, scale * 0.23], [scale * 0.065, scale * 0.055, scale * 0.02], 8, 12)
  })
  addSemanticPart(mesh, 'arms-and-hands', 'character-silhouette', () => {
    addOrientedCylinder(mesh, [-scale * 0.33, scale * 0.55, 0], scale * 0.3, scale * 0.065, scale * 0.075, 16, [0, 0, -0.52])
    addOrientedCylinder(mesh, [scale * 0.33, scale * 0.55, 0], scale * 0.3, scale * 0.065, scale * 0.075, 16, [0, 0, 0.52])
    addSphere(mesh, [-scale * 0.43, scale * 0.44, 0], [scale * 0.085, scale * 0.075, scale * 0.075], 10, 16)
    addSphere(mesh, [scale * 0.43, scale * 0.44, 0], [scale * 0.085, scale * 0.075, scale * 0.075], 10, 16)
  })
  addSemanticPart(mesh, 'legs-and-boots', 'character-board-contact', () => {
    for (const x of [-0.13, 0.13]) {
      addCylinder(mesh, [scale * x, scale * 0.25, 0], scale * 0.26, scale * 0.075, scale * 0.085, 18)
      addSphere(mesh, [scale * x, scale * 0.14, scale * 0.055], [scale * 0.13, scale * 0.07, scale * 0.16], 10, 18)
    }
  })
  addSemanticPart(mesh, 'cloud-crown', 'decorative-cloud-relief', () => {
    for (const [x, y, z, r] of [[-0.13, 0.88, 0.03, 0.075], [-0.04, 0.91, 0.02, 0.09], [0.06, 0.9, 0.01, 0.08], [0.14, 0.87, 0.02, 0.065]] as const) {
      addSphere(mesh, [scale * x, scale * y, scale * z], [scale * r, scale * r * 0.72, scale * r], 8, 14)
    }
  })
}

function createChessBase(mesh: Mesh, scale: number) {
  addCylinder(mesh, [0, scale * 0.055, 0], scale * 0.11, scale * 0.34, scale * 0.3, 32)
  addTorus(mesh, [0, scale * 0.12, 0], scale * 0.27, scale * 0.03, 32, 8)
  addCylinder(mesh, [0, scale * 0.23, 0], scale * 0.22, scale * 0.25, scale * 0.17, 24)
}

function createFacetRook(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'rook-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'rook-faceted-tower', 'recognizable-rook-silhouette', () => {
    addCylinder(mesh, [0, scale * 0.47, 0], scale * 0.34, scale * 0.17, scale * 0.23, 16)
    addTorus(mesh, [0, scale * 0.66, 0], scale * 0.24, scale * 0.035, 28, 8)
    addCylinder(mesh, [0, scale * 0.72, 0], scale * 0.12, scale * 0.29, scale * 0.29, 16)
  })
  addSemanticPart(mesh, 'rook-crenellations', 'eight-castle-battlements', () => {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2
      addOrientedBox(mesh, [Math.cos(angle) * scale * 0.225, scale * 0.84, Math.sin(angle) * scale * 0.225], [scale * 0.13, scale * 0.2, scale * 0.13], [0, -angle, 0])
    }
  })
}

function createFacetKing(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'king-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'king-body', 'recognizable-king-silhouette', () => {
    addCylinder(mesh, [0, scale * 0.5, 0], scale * 0.42, scale * 0.17, scale * 0.12, 20)
    addTorus(mesh, [0, scale * 0.7, 0], scale * 0.17, scale * 0.032, 28, 8)
    addSphere(mesh, [0, scale * 0.77, 0], [scale * 0.14, scale * 0.14, scale * 0.14], 12, 20)
  })
  addSemanticPart(mesh, 'king-cross', 'king-identity-cross-finial', () => {
    addBox(mesh, [0, scale * 0.93, 0], [scale * 0.055, scale * 0.25, scale * 0.07])
    addBox(mesh, [0, scale * 0.96, 0], [scale * 0.19, scale * 0.055, scale * 0.07])
  })
}

function createFacetQueen(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'queen-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'queen-body', 'recognizable-queen-silhouette', () => {
    addCylinder(mesh, [0, scale * 0.5, 0], scale * 0.42, scale * 0.17, scale * 0.105, 20)
    addTorus(mesh, [0, scale * 0.71, 0], scale * 0.18, scale * 0.032, 28, 8)
  })
  addSemanticPart(mesh, 'queen-crown', 'eight-point-queen-crown', () => {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2
      addCylinder(mesh, [Math.cos(angle) * scale * 0.13, scale * 0.82, Math.sin(angle) * scale * 0.13], scale * 0.2, scale * 0.045, scale * 0.012, 10)
      addSphere(mesh, [Math.cos(angle) * scale * 0.13, scale * 0.925, Math.sin(angle) * scale * 0.13], [scale * 0.027, scale * 0.027, scale * 0.027], 7, 10)
    }
    addSphere(mesh, [0, scale * 0.84, 0], [scale * 0.095, scale * 0.095, scale * 0.095], 10, 16)
  })
}

function createFacetBishop(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'bishop-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'bishop-body', 'recognizable-bishop-silhouette', () => {
    addCylinder(mesh, [0, scale * 0.49, 0], scale * 0.4, scale * 0.17, scale * 0.105, 20)
    addTorus(mesh, [0, scale * 0.69, 0], scale * 0.155, scale * 0.03, 26, 8)
    addSphere(mesh, [0, scale * 0.79, 0], [scale * 0.145, scale * 0.18, scale * 0.145], 14, 22)
  })
  addSemanticPart(mesh, 'bishop-mitre', 'diagonal-mitre-marker', () => {
    addOrientedBox(mesh, [0, scale * 0.82, scale * 0.13], [scale * 0.045, scale * 0.2, scale * 0.035], [0, 0, -0.62])
    addSphere(mesh, [0, scale * 0.965, 0], [scale * 0.035, scale * 0.045, scale * 0.035], 8, 12)
  })
}

function createCrayonKnight(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'knight-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'knight-neck-head', 'centered-classic-horse-profile', () => {
    addOrientedCylinder(mesh, [scale * 0.015, scale * 0.5, 0], scale * 0.42, scale * 0.16, scale * 0.105, 18, [0, 0, -0.3])
    addSphere(mesh, [scale * 0.12, scale * 0.7, 0], [scale * 0.19, scale * 0.16, scale * 0.15], 12, 20)
    addOrientedBox(mesh, [scale * 0.27, scale * 0.68, 0], [scale * 0.24, scale * 0.13, scale * 0.16], [0, 0, -0.12])
    addSphere(mesh, [scale * 0.29, scale * 0.72, scale * 0.075], [scale * 0.025, scale * 0.025, scale * 0.018], 7, 10)
  })
  addSemanticPart(mesh, 'knight-ears', 'horse-head-identity', () => {
    addCylinder(mesh, [scale * 0.04, scale * 0.86, -scale * 0.075], scale * 0.24, scale * 0.05, scale * 0.008, 12)
    addCylinder(mesh, [scale * 0.04, scale * 0.86, scale * 0.075], scale * 0.24, scale * 0.05, scale * 0.008, 12)
  })
  addSemanticPart(mesh, 'crayon-mane', 'multicolour-crayon-mane-texture-zone', () => {
    for (let index = 0; index < 6; index += 1) {
      addOrientedCylinder(mesh, [-scale * (0.03 + index * 0.025), scale * (0.71 - index * 0.055), 0], scale * 0.18, scale * 0.033, scale * 0.004, 10, [Math.PI / 2, 0, -0.16])
    }
  })
}

function createClassicPawn(mesh: Mesh, scale: number) {
  addSemanticPart(mesh, 'pawn-base', 'chess-board-contact', () => createChessBase(mesh, scale))
  addSemanticPart(mesh, 'pawn-body', 'classic-staunton-pawn-silhouette', () => {
    addCylinder(mesh, [0, scale * 0.46, 0], scale * 0.34, scale * 0.16, scale * 0.1, 24)
    addTorus(mesh, [0, scale * 0.62, 0], scale * 0.15, scale * 0.03, 28, 8)
    addSphere(mesh, [0, scale * 0.74, 0], [scale * 0.18, scale * 0.18, scale * 0.18], 16, 26)
  })
}

function createResearchStation(mesh: Mesh, scale: number, stationId: AssetSpecification['stationId']) {
  if (stationId === 'arctic') {
    addSemanticPart(mesh, 'ice-reference-platform', 'current-software-sea-ice-and-freeboard-scenario', () => {
      addCylinder(mesh, [0, scale * 0.04, 0], scale * 0.1, scale * 0.5, scale * 0.47, 18)
      for (const [x, z, r] of [[-0.35, -0.25, 0.09], [0.35, -0.2, 0.07], [-0.28, 0.28, 0.065], [0.31, 0.26, 0.085]] as const) {
        addCylinder(mesh, [scale * x, scale * 0.105, scale * z], scale * 0.035, scale * r, scale * r * 0.86, 10)
      }
    })
    addSemanticPart(mesh, 'surface-observation-lab', 'proposed-field-meteorology-radiometry-and-camera-module', () => {
      addCylinder(mesh, [0, scale * 0.16, 0], scale * 0.12, scale * 0.29, scale * 0.27, 24)
      addSphere(mesh, [0, scale * 0.25, 0], [scale * 0.25, scale * 0.18, scale * 0.24], 14, 24)
      addTorus(mesh, [0, scale * 0.18, 0], scale * 0.255, scale * 0.018, 30, 8)
    })
    addSemanticPart(mesh, 'gnss-lidar-array', 'proposed-field-gnss-lidar-radar-and-weather-instruments', () => {
      for (const [x, z] of [[-0.34, -0.22], [0.34, -0.22], [-0.34, 0.22], [0.34, 0.22]] as const) {
        addCylinder(mesh, [scale * x, scale * 0.31, scale * z], scale * 0.42, scale * 0.022, scale * 0.016, 12)
        addSphere(mesh, [scale * x, scale * 0.535, scale * z], [scale * 0.04, scale * 0.025, scale * 0.04], 8, 12)
      }
      addCylinder(mesh, [0, scale * 0.48, 0], scale * 0.5, scale * 0.025, scale * 0.018, 14)
      addOrientedBox(mesh, [0, scale * 0.7, 0], [scale * 0.48, scale * 0.035, scale * 0.12], [0.05, 0.2, 0])
      addSphere(mesh, [0, scale * 0.76, 0], [scale * 0.055, scale * 0.055, scale * 0.055], 8, 12)
    })
    addSemanticPart(mesh, 'under-ice-sensor-string', 'proposed-field-ctd-adcp-and-upward-looking-sonar', () => {
      addCylinder(mesh, [0, -scale * 0.18, 0], scale * 0.42, scale * 0.018, scale * 0.018, 10)
      addCylinder(mesh, [0, -scale * 0.32, 0], scale * 0.16, scale * 0.065, scale * 0.05, 14)
      addSphere(mesh, [0, -scale * 0.43, 0], [scale * 0.085, scale * 0.055, scale * 0.085], 9, 14)
    })
    return
  }
  if (stationId === 'sahara') {
    addSemanticPart(mesh, 'dem-terrain-diorama', 'current-software-copernicus-dem-and-hypothetical-terrain-sandbox', () => {
      addBox(mesh, [0, scale * 0.03, 0], [scale, scale * 0.07, scale * 0.76])
      addCylinder(mesh, [-scale * 0.1, scale * 0.15, -scale * 0.05], scale * 0.22, scale * 0.2, scale * 0.08, 4)
      addTorus(mesh, [scale * 0.28, scale * 0.075, scale * 0.12], scale * 0.13, scale * 0.022, 22, 7)
    })
    addSemanticPart(mesh, 'source-dome-lab', 'visual-anchor-derived-from-source-threejs-research-station', () => {
      addCylinder(mesh, [-scale * 0.28, scale * 0.14, scale * 0.17], scale * 0.17, scale * 0.19, scale * 0.17, 20)
      addSphere(mesh, [-scale * 0.28, scale * 0.28, scale * 0.17], [scale * 0.17, scale * 0.13, scale * 0.17], 12, 22)
    })
    addSemanticPart(mesh, 'solar-radiometry-array', 'proposed-field-power-and-radiometry-module', () => {
      addCylinder(mesh, [scale * 0.19, scale * 0.25, -scale * 0.2], scale * 0.34, scale * 0.018, scale * 0.014, 10)
      addOrientedBox(mesh, [scale * 0.31, scale * 0.36, -scale * 0.2], [scale * 0.48, scale * 0.035, scale * 0.22], [0.18, 0, -0.08])
      addOrientedBox(mesh, [scale * 0.31, scale * 0.34, scale * 0.17], [scale * 0.48, scale * 0.035, scale * 0.22], [-0.12, 0, -0.08])
    })
    addSemanticPart(mesh, 'd8-paleochannel-overlay', 'current-software-priority-flood-d8-flow-and-paleochannel-screening', () => {
      for (let index = 0; index < 12; index += 1) {
        const x = -0.44 + index * 0.08
        const z = Math.sin(index * 0.8) * 0.12 - 0.08
        addSphere(mesh, [scale * x, scale * 0.075, scale * z], [scale * 0.025, scale * 0.012, scale * 0.025], 6, 9)
      }
    })
    addSemanticPart(mesh, 'field-reference-mast', 'proposed-field-gnss-weather-and-ground-verification-anchor', () => {
      addCylinder(mesh, [-scale * 0.31, scale * 0.55, scale * 0.17], scale * 0.54, scale * 0.022, scale * 0.014, 12)
      addSphere(mesh, [-scale * 0.31, scale * 0.83, scale * 0.17], [scale * 0.045, scale * 0.028, scale * 0.045], 8, 12)
    })
    return
  }
  if (stationId === 'ocean') {
    addSemanticPart(mesh, 'bathymetry-cutaway', 'current-software-procedural-trench-seamount-and-bathymetry-sandbox', () => {
      addBox(mesh, [0, 0, 0], [scale, scale * 0.1, scale * 0.78])
      addCylinder(mesh, [-scale * 0.25, scale * 0.15, scale * 0.08], scale * 0.28, scale * 0.2, scale * 0.055, 10)
      addCylinder(mesh, [scale * 0.12, scale * 0.11, -scale * 0.18], scale * 0.2, scale * 0.14, scale * 0.035, 9)
      addTorus(mesh, [scale * 0.28, scale * 0.065, scale * 0.12], scale * 0.14, scale * 0.025, 26, 7)
    })
    addSemanticPart(mesh, 'surface-water-reference', 'visual-water-surface-not-a-measured-ocean-state', () => {
      addBox(mesh, [0, scale * 0.43, 0], [scale * 0.98, scale * 0.018, scale * 0.76])
    })
    addSemanticPart(mesh, 'survey-buoy', 'proposed-field-gnss-weather-and-communications-node', () => {
      addTorus(mesh, [-scale * 0.28, scale * 0.49, -scale * 0.08], scale * 0.11, scale * 0.045, 28, 9)
      addSphere(mesh, [-scale * 0.28, scale * 0.52, -scale * 0.08], [scale * 0.1, scale * 0.08, scale * 0.1], 10, 18)
      addCylinder(mesh, [-scale * 0.28, scale * 0.68, -scale * 0.08], scale * 0.3, scale * 0.018, scale * 0.01, 10)
      addSphere(mesh, [-scale * 0.28, scale * 0.84, -scale * 0.08], [scale * 0.04, scale * 0.025, scale * 0.04], 8, 12)
    })
    addSemanticPart(mesh, 'auv-multibeam-node', 'proposed-field-auv-multibeam-sonar-and-ctd-route', () => {
      addOrientedCylinder(mesh, [scale * 0.18, scale * 0.25, scale * 0.03], scale * 0.42, scale * 0.08, scale * 0.055, 18, [0, 0, Math.PI / 2])
      addSphere(mesh, [scale * 0.39, scale * 0.25, scale * 0.03], [scale * 0.065, scale * 0.075, scale * 0.075], 9, 14)
      addOrientedBox(mesh, [scale * 0.1, scale * 0.25, scale * 0.03], [scale * 0.2, scale * 0.025, scale * 0.26], [0, 0, 0])
      addOrientedBox(mesh, [-scale * 0.02, scale * 0.33, scale * 0.03], [scale * 0.16, scale * 0.14, scale * 0.025], [0, 0, 0])
      for (const offset of [-0.08, 0, 0.08]) addOrientedBox(mesh, [scale * 0.19, scale * 0.12, scale * offset], [scale * 0.018, scale * 0.22, scale * 0.035], [0, 0, offset * 2.4])
    })
    addSemanticPart(mesh, 'synthetic-boundary-markers', 'current-software-synthetic-demo-markers-not-observations', () => {
      for (let index = 0; index < 7; index += 1) {
        addSphere(mesh, [scale * (-0.42 + index * 0.14), scale * 0.09, scale * (0.23 - index * 0.045)], [scale * 0.025, scale * 0.025, scale * 0.025], 7, 10)
      }
    })
    return
  }
  addSemanticPart(mesh, 'orbital-data-plinth', 'visualization-base-not-a-physical-orbital-station', () => {
    addCylinder(mesh, [0, scale * 0.035, 0], scale * 0.07, scale * 0.48, scale * 0.44, 32)
    addTorus(mesh, [0, scale * 0.09, 0], scale * 0.38, scale * 0.025, 36, 8)
  })
  addSemanticPart(mesh, 'earth-jpl-reference', 'current-software-earth-body-from-timestamped-jpl-vector-scene', () => {
    addSphere(mesh, [0, scale * 0.43, 0], [scale * 0.23, scale * 0.23, scale * 0.23], 18, 30)
    addTorus(mesh, [0, scale * 0.43, 0], scale * 0.255, scale * 0.012, 36, 7, [Math.PI / 2, 0, 0.24])
  })
  addSemanticPart(mesh, 'orbital-context-rings', 'current-software-compressed-orbit-visualization-not-trajectory-proof', () => {
    addTorus(mesh, [0, scale * 0.43, 0], scale * 0.35, scale * 0.012, 42, 7, [0.35, 0.15, 0.1])
    addTorus(mesh, [0, scale * 0.43, 0], scale * 0.42, scale * 0.01, 42, 7, [Math.PI / 2, 0.45, 0])
  })
  addSemanticPart(mesh, 'analysis-grid-512', 'deterministic-eight-by-eight-by-eight-address-space-not-physical-sensors', () => {
    const half = scale * 0.46
    const centerY = scale * 0.43
    const thickness = scale * 0.006
    for (let index = 0; index <= 8; index += 1) {
      const offset = -half + (index / 8) * half * 2
      addBox(mesh, [offset, centerY - half, 0], [thickness, thickness, half * 2])
      addBox(mesh, [offset, centerY + half, 0], [thickness, thickness, half * 2])
      addBox(mesh, [0, centerY - half, offset], [half * 2, thickness, thickness])
      addBox(mesh, [0, centerY + half, offset], [half * 2, thickness, thickness])
    }
    for (let index = 0; index <= 8; index += 1) {
      const offset = centerY - half + (index / 8) * half * 2
      for (const x of [-half, half]) addBox(mesh, [x, offset, 0], [thickness, thickness, half * 2])
      for (const z of [-half, half]) addBox(mesh, [0, offset, z], [half * 2, thickness, thickness])
    }
  })
  addSemanticPart(mesh, 'observation-vector-node', 'jpl-soho-source-linked-observation-marker', () => {
    addCylinder(mesh, [scale * 0.3, scale * 0.69, scale * 0.2], scale * 0.28, scale * 0.018, scale * 0.012, 10)
    addOrientedBox(mesh, [scale * 0.3, scale * 0.84, scale * 0.2], [scale * 0.24, scale * 0.025, scale * 0.1], [0.1, -0.35, 0])
  })
}

function createMesh(specification: AssetSpecification): { mesh: Mesh; preset: ProceduralPreset; promptMatched: boolean; label: string } {
  const mesh: Mesh = { positions: [], normals: [], texcoords: [], indices: [], semanticParts: [] }
  const scale = specification.scaleMm / 1000
  const { preset, promptMatched } = selectProceduralPreset(specification)
  if (preset === 'earth-guardian') createEarthGuardian(mesh, scale)
  else if (preset === 'facet-king') createFacetKing(mesh, scale)
  else if (preset === 'facet-queen') createFacetQueen(mesh, scale)
  else if (preset === 'facet-bishop') createFacetBishop(mesh, scale)
  else if (preset === 'facet-rook') createFacetRook(mesh, scale)
  else if (preset === 'crayon-knight') createCrayonKnight(mesh, scale)
  else if (preset === 'classic-pawn') createClassicPawn(mesh, scale)
  else if (preset === 'led-board') {
    if (specification.boardPreset === 'cube-512') {
      addSemanticPart(mesh, 'cube-512-support-frame', 'eight-level-board-support-and-level-registration', () => {
        addBox(mesh, [0, scale * 0.025, 0], [scale, scale * 0.05, scale])
        for (const x of [-0.47, 0.47]) for (const z of [-0.47, 0.47]) {
          addBox(mesh, [scale * x, scale * 0.45, scale * z], [scale * 0.022, scale * 0.86, scale * 0.022])
        }
      })
      addSemanticPart(mesh, 'cube-512-levels', 'eight-by-eight-by-eight-visual-address-space', () => {
        for (let level = 0; level < 8; level += 1) {
          const y = scale * (0.085 + level * 0.105)
          for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
            addBox(mesh, [scale * (-0.385 + column * 0.11), y, scale * (-0.385 + row * 0.11)], [scale * 0.104, scale * 0.012, scale * 0.104])
          }
        }
      })
    } else {
      addSemanticPart(mesh, 'board-plinth', specification.boardPreset === 'classic-mono' ? 'classic-tournament-board-base' : 'lab-ledcolor-board-base', () => {
        addBox(mesh, [0, scale * 0.035, 0], [scale, scale * 0.07, scale])
        if (specification.boardPreset === 'lab-ledcolor') {
          for (const [x, z, sx, sz] of [[0, -0.46, 0.9, 0.025], [0, 0.46, 0.9, 0.025], [-0.46, 0, 0.025, 0.9], [0.46, 0, 0.025, 0.9]] as const) {
            addBox(mesh, [scale * x, scale * 0.082, scale * z], [scale * sx, scale * 0.025, scale * sz])
          }
        }
      })
      addSemanticPart(mesh, 'board-squares', 'eight-by-eight-playable-grid', () => {
        for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
          addBox(mesh, [scale * (-0.385 + column * 0.11), scale * 0.085, scale * (-0.385 + row * 0.11)], [scale * 0.106, scale * 0.022, scale * 0.106])
        }
      })
    }
  } else if (preset === 'research-station') {
    createResearchStation(mesh, scale, specification.stationId)
  } else {
    addSemanticPart(mesh, 'texture-swatch', 'procedural-material-preview', () => addBox(mesh, [0, scale * 0.01, 0], [scale, scale * 0.02, scale]))
  }
  const labels: Record<ProceduralPreset, string> = {
    'earth-guardian': 'Earth Guardian character',
    'facet-king': 'ForgeMCP faceted king',
    'facet-queen': 'ForgeMCP faceted queen',
    'facet-bishop': 'ForgeMCP faceted bishop',
    'facet-rook': 'ForgeMCP faceted rook',
    'crayon-knight': 'Crayon orbital knight',
    'classic-pawn': 'Classic low-poly pawn',
    'led-board': specification.boardPreset === 'cube-512'
      ? 'Cube Chess 512 eight-level board'
      : specification.boardPreset === 'classic-mono'
        ? 'Classic black-and-white board'
        : 'Lab LEDColor chessboard',
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

function texturePatternFor(specification: Pick<AssetSpecification, 'assetKind' | 'stationId' | 'boardPreset'>, preset: ProceduralPreset): ProceduralTexturePattern {
  if (specification.assetKind === 'station-shell') {
    if (specification.stationId === 'arctic') return 'arctic-cryo-instruments'
    if (specification.stationId === 'sahara') return 'sahara-strata-flow'
    if (specification.stationId === 'ocean') return 'ocean-bathymetry-sonar'
    return 'earth-space-orbital-grid'
  }
  if (preset === 'earth-guardian') return 'earth-contours-clouds'
  if (preset === 'crayon-knight') return 'crayon-spectrum'
  if (preset === 'classic-pawn') return 'classic-stone'
  if (preset === 'led-board') {
    if (specification.boardPreset === 'cube-512') return 'cube-512-level-grid'
    if (specification.boardPreset === 'classic-mono') return 'classic-checker-stone'
    return 'checker-led-grid'
  }
  if (['facet-king', 'facet-queen', 'facet-bishop', 'facet-rook'].includes(preset)) return 'facet-led-inlay'
  return 'material-microgrid'
}

function presetTextureVariant(preset: ProceduralPreset) {
  const variants: Record<ProceduralPreset, number> = {
    'earth-guardian': 1,
    'facet-king': 2,
    'facet-queen': 3,
    'facet-bishop': 4,
    'facet-rook': 5,
    'crayon-knight': 6,
    'classic-pawn': 7,
    'led-board': 8,
    'research-station': 9,
    'texture-tile': 10,
  }
  return variants[preset]
}

function mixRgb(a: [number, number, number], b: [number, number, number], amount: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, amount))
  return a.map((value, index) => value * (1 - clamped) + b[index] * clamped) as [number, number, number]
}

function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const sector = ((hue % 1) + 1) % 1 * 6
  const chroma = value * saturation
  const x = chroma * (1 - Math.abs((sector % 2) - 1))
  const match = value - chroma
  const [r, g, b] = sector < 1 ? [chroma, x, 0]
    : sector < 2 ? [x, chroma, 0]
      : sector < 3 ? [0, chroma, x]
        : sector < 4 ? [0, x, chroma]
          : sector < 5 ? [x, 0, chroma]
            : [chroma, 0, x]
  return [(r + match) * 255, (g + match) * 255, (b + match) * 255]
}

function patternPixel(
  pattern: ProceduralTexturePattern,
  x: number,
  y: number,
  width: number,
  height: number,
  primary: [number, number, number],
  secondary: [number, number, number],
  variant: number,
): [number, number, number] {
  const u = x / width
  const v = y / height
  const noise = ((Math.sin(x * 12.9898 + y * 78.233 + variant * 17.171) * 43758.5453) % 1 + 1) % 1
  if (pattern === 'checker-led-grid') {
    const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2
    const grid = x % 16 < 2 || y % 16 < 2
    return mixRgb(checker ? primary : secondary, [220, 248, 255], grid ? 0.48 : 0.04 + noise * 0.06)
  }
  if (pattern === 'classic-checker-stone') {
    const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2
    const base = checker ? [22, 28, 38] as [number, number, number] : [222, 226, 224] as [number, number, number]
    const vein = Math.abs(Math.sin((u + v * 0.42) * 35 + Math.sin(v * 13))) > 0.94
    return mixRgb(base, checker ? secondary : primary, vein ? 0.22 : noise * 0.055)
  }
  if (pattern === 'cube-512-level-grid') {
    const level = Math.floor(v * 8)
    const checker = (Math.floor(x / 16) + Math.floor(y / 16) + level) % 2
    const levelColour = hsvToRgb((level / 8 + variant * 0.035) % 1, 0.72, 0.96)
    const grid = x % 16 < 2 || y % 16 < 2
    return mixRgb(checker ? primary : secondary, levelColour, grid ? 0.82 : 0.18 + noise * 0.08)
  }
  if (pattern === 'earth-contours-clouds') {
    const land = Math.sin(u * 17 + Math.sin(v * 11) * 2.4) + Math.cos(v * 19 - u * 5) > 0.35
    const cloud = Math.abs(Math.sin(u * 29 + v * 17) + Math.cos(v * 21 - u * 9)) < 0.22
    const base = land ? secondary : primary
    return mixRgb(base, [238, 250, 255], cloud ? 0.78 : 0.04 + noise * 0.08)
  }
  if (pattern === 'crayon-spectrum') {
    const stripe = Math.floor(u * 12) / 12
    const rainbow = hsvToRgb(stripe + v * 0.08, 0.72, 0.96)
    const groove = x % 11 < 2
    return mixRgb(rainbow, groove ? primary : secondary, groove ? 0.42 : 0.08)
  }
  if (pattern === 'classic-stone') {
    const vein = Math.abs(Math.sin((u + v * 0.37) * 31 + Math.sin(v * 18) * 1.8)) > 0.92
    return mixRgb(primary, secondary, vein ? 0.5 : 0.08 + noise * 0.12)
  }
  if (pattern === 'facet-led-inlay') {
    const offset = variant * 3
    const facet = (Math.floor((x + y + offset) / 12) + Math.floor((x - y + width + offset) / 12)) % 2 === 0
    const inlay = (x + y + offset) % 24 < 2 || Math.abs(x - y + offset) % 29 < 2
    return mixRgb(facet ? primary : mixRgb(primary, secondary, 0.25), secondary, inlay ? 0.82 : noise * 0.08)
  }
  if (pattern === 'arctic-cryo-instruments') {
    const crack = Math.abs(Math.sin(u * 24 + Math.sin(v * 9) * 4)) < 0.08 || Math.abs(Math.cos(v * 27 - u * 8)) < 0.055
    const frost = noise > 0.88
    return mixRgb(primary, [232, 251, 255], crack ? 0.8 : frost ? 0.58 : 0.16 + v * 0.18)
  }
  if (pattern === 'sahara-strata-flow') {
    const strata = Math.sin(v * 58 + Math.sin(u * 15) * 5) > 0.48
    const flow = Math.abs(v - (0.52 + Math.sin(u * 16) * 0.12)) < 0.025
    return mixRgb(primary, secondary, flow ? 0.92 : strata ? 0.34 : 0.08 + noise * 0.08)
  }
  if (pattern === 'ocean-bathymetry-sonar') {
    const radius = Math.hypot(u - 0.35, v - 0.55)
    const contour = Math.abs(Math.sin((radius + Math.sin(u * 9) * 0.03) * 72)) > 0.91
    const swath = Math.abs((u - 0.72) - (v - 0.2) * 0.38) < 0.025 || Math.abs((u - 0.72) + (v - 0.2) * 0.38) < 0.025
    return mixRgb(primary, secondary, swath ? 0.9 : contour ? 0.48 : 0.08 + v * 0.16)
  }
  if (pattern === 'earth-space-orbital-grid') {
    const grid = x % 16 < 2 || y % 16 < 2
    const orbit = Math.abs(Math.hypot(u - 0.5, (v - 0.5) * 1.7) - 0.31) < 0.018
    const star = noise > 0.982
    return mixRgb(primary, star ? [255, 255, 255] : secondary, star ? 0.95 : orbit ? 0.82 : grid ? 0.42 : 0.06)
  }
  const microgrid = x % 8 < 1 || y % 8 < 1
  return mixRgb(primary, secondary, microgrid ? 0.46 : 0.08 + noise * 0.1)
}

function createTexturePng(
  primaryHex: string,
  secondaryHex: string,
  specification: Pick<AssetSpecification, 'assetKind' | 'stationId' | 'boardPreset'>,
  preset: ProceduralPreset,
) {
  const width = 128 as const
  const height = 128 as const
  const primary = hexToRgb(primaryHex)
  const secondary = hexToRgb(secondaryHex)
  const pattern = texturePatternFor(specification, preset)
  const variant = presetTextureVariant(preset)
  const raw = new Uint8Array((width * 3 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0
    offset += 1
    for (let x = 0; x < width; x += 1) {
      const colour = patternPixel(pattern, x, y, width, height, primary, secondary, variant)
      const glow = ((x + y) % 32 === 0) ? 1.08 : 0.88 + 0.12 * ((x + y) / (width + height))
      raw[offset] = Math.min(255, Math.round(colour[0] * glow))
      raw[offset + 1] = Math.min(255, Math.round(colour[1] * glow))
      raw[offset + 2] = Math.min(255, Math.round(colour[2] * glow))
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
  return { bytes: concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflate),
    pngChunk('IEND', new Uint8Array()),
  ]), width, height, pattern }
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

function bytesFingerprint(bytes: Uint8Array) {
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
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
  const generatedTexture = createTexturePng(
    specification.primaryColor,
    specification.secondaryColor,
    specification,
    generated.preset,
  )
  const texture = generatedTexture.bytes
  const textureFingerprint = bytesFingerprint(texture)
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
    images: [{
      uri: `data:image/png;base64,${bytesToBase64(texture)}`,
      mimeType: 'image/png',
      name: `${specification.id}-texture`,
      extras: { fingerprint: textureFingerprint, pattern: generatedTexture.pattern },
    }],
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
      textureFingerprint,
      texturePattern: generatedTexture.pattern,
      semanticParts: mesh.semanticParts,
      renderSource: 'EXPORTED_GLTF_GEOMETRY',
    },
  }
  const content = JSON.stringify(gltf, null, 2)
  JSON.parse(content)
  const vertexCount = mesh.positions.length / 3
  const pngSignatureValid = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => texture[index] === byte)
  const semanticPartRangesValid = mesh.semanticParts.every(part => {
    if (part.vertexStart < 0 || part.vertexCount <= 0 || part.vertexStart + part.vertexCount > vertexCount) return false
    if (part.indexStart < 0 || part.indexCount <= 0 || part.indexStart + part.indexCount > mesh.indices.length) return false
    return mesh.indices
      .slice(part.indexStart, part.indexStart + part.indexCount)
      .every(index => index >= part.vertexStart && index < part.vertexStart + part.vertexCount)
  })
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
    textureFingerprintLinked: gltf.extras.textureFingerprint === textureFingerprint
      && gltf.images[0].extras.fingerprint === textureFingerprint,
    semanticPartsPresent: mesh.semanticParts.length > 0,
    semanticPartRangesValid,
    texturePatternResolved: gltf.extras.texturePattern === generatedTexture.pattern
      && gltf.images[0].extras.pattern === generatedTexture.pattern,
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
    textureFingerprint,
    semanticParts: mesh.semanticParts,
    preview: {
      preset: generated.preset,
      label: generated.label,
      promptMatched: generated.promptMatched,
      primaryColor: specification.primaryColor,
      secondaryColor: specification.secondaryColor,
      positions: mesh.positions,
      normals: mesh.normals,
      texcoords: mesh.texcoords,
      indices: mesh.indices,
    },
    model: { filename: `${specification.id}.gltf`, mimeType: 'model/gltf+json', content },
    texture: {
      filename: `${specification.id}-texture.png`,
      mimeType: 'image/png',
      width: generatedTexture.width,
      height: generatedTexture.height,
      bytes: texture,
      fingerprint: textureFingerprint,
      pattern: generatedTexture.pattern,
    },
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
    textureFingerprint: bundle.textureFingerprint,
    semanticParts: bundle.semanticParts,
    preview: {
      preset: bundle.preview.preset,
      label: bundle.preview.label,
      promptMatched: bundle.preview.promptMatched,
    },
    files: [
      { filename: bundle.model.filename, mimeType: bundle.model.mimeType },
      {
        filename: bundle.texture.filename,
        mimeType: bundle.texture.mimeType,
        width: bundle.texture.width,
        height: bundle.texture.height,
        fingerprint: bundle.texture.fingerprint,
        pattern: bundle.texture.pattern,
      },
    ],
    metrics: bundle.metrics,
    qa: bundle.qa,
    truthBoundary: bundle.truthBoundary,
  }
}
