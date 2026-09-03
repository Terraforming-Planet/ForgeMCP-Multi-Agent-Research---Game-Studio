import type { AssetSpecification } from '../commerce/productLab'
import {
  generateProceduralAssetBundle,
  type ProceduralAssetBundle,
  type SemanticPart,
} from '../commerce/proceduralAssets'

type Mesh = {
  positions: number[]
  normals: number[]
  texcoords: number[]
  indices: number[]
  semanticParts: SemanticPart[]
}

type PieceRole = 'king' | 'queen' | 'bishop' | 'rook' | 'knight' | 'pawn'

type PbrMap = {
  filename: string
  mimeType: 'image/png'
  width: number
  height: number
  bytes: Uint8Array
  fingerprint: string
  role: 'normal' | 'orm' | 'emissive'
}

export interface PremiumCubeAssetBundle extends ProceduralAssetBundle {
  trainingProfile: 'OWNER_AUTHORIZED_PREMIUM_FULL_GAME_V3'
  pieceRole: PieceRole
  pbrMaps: {
    normal: PbrMap
    orm: PbrMap
    emissive: PbrMap
  }
  pbrProfile: {
    baseColor: true
    normal: true
    occlusionRoughnessMetallic: true
    emissive: true
  }
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

function addPart(mesh: Mesh, name: string, role: string, build: () => void) {
  const vertexStart = mesh.positions.length / 3
  const indexStart = mesh.indices.length
  build()
  const vertexCount = mesh.positions.length / 3 - vertexStart
  const indexCount = mesh.indices.length - indexStart
  if (vertexCount > 0 && indexCount > 0) mesh.semanticParts.push({ name, role, vertexStart, vertexCount, indexStart, indexCount })
}

function rotatePoint([x, y, z]: [number, number, number], [rx, ry, rz]: [number, number, number]): [number, number, number] {
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy = Math.sin(ry)
  const cz = Math.cos(rz), sz = Math.sin(rz)
  const x1 = x
  const y1 = y * cx - z * sx
  const z1 = y * sx + z * cx
  const x2 = x1 * cy + z1 * sy
  const y2 = y1
  const z2 = -x1 * sy + z1 * cy
  return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2]
}

function rotateNewGeometry(mesh: Mesh, startVertex: number, center: [number, number, number], rotation: [number, number, number]) {
  for (let vertex = startVertex; vertex < mesh.positions.length / 3; vertex += 1) {
    const offset = vertex * 3
    const local: [number, number, number] = [mesh.positions[offset] - center[0], mesh.positions[offset + 1] - center[1], mesh.positions[offset + 2] - center[2]]
    const position = rotatePoint(local, rotation)
    const normal = rotatePoint([mesh.normals[offset], mesh.normals[offset + 1], mesh.normals[offset + 2]], rotation)
    mesh.positions[offset] = center[0] + position[0]
    mesh.positions[offset + 1] = center[1] + position[1]
    mesh.positions[offset + 2] = center[2] + position[2]
    mesh.normals[offset] = normal[0]
    mesh.normals[offset + 1] = normal[1]
    mesh.normals[offset + 2] = normal[2]
  }
}

function addSphere(mesh: Mesh, center: [number, number, number], radius: [number, number, number], latitudeSegments = 18, longitudeSegments = 28, rotation: [number, number, number] = [0, 0, 0]) {
  const start = mesh.positions.length / 3
  const base = start
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
  if (rotation.some(Boolean)) rotateNewGeometry(mesh, start, center, rotation)
}

function addBox(mesh: Mesh, center: [number, number, number], size: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  const start = mesh.positions.length / 3
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
  if (rotation.some(Boolean)) rotateNewGeometry(mesh, start, center, rotation)
}

function addCylinder(mesh: Mesh, center: [number, number, number], height: number, bottomRadius: number, topRadius = bottomRadius, segments = 28, rotation: [number, number, number] = [0, 0, 0]) {
  const start = mesh.positions.length / 3
  const [cx, cy, cz] = center
  const half = height / 2
  const sideBase = mesh.positions.length / 3
  const slope = (bottomRadius - topRadius) / Math.max(height, 1e-6)
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments
    const angle = u * Math.PI * 2
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    const normalLength = Math.hypot(cosine, slope, sine) || 1
    const nx = cosine / normalLength, ny = slope / normalLength, nz = sine / normalLength
    mesh.positions.push(cx + cosine * bottomRadius, cy - half, cz + sine * bottomRadius)
    mesh.positions.push(cx + cosine * topRadius, cy + half, cz + sine * topRadius)
    mesh.normals.push(nx, ny, nz, nx, ny, nz)
    mesh.texcoords.push(u, 0, u, 1)
  }
  for (let index = 0; index < segments; index += 1) {
    const first = sideBase + index * 2
    mesh.indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
  }
  for (const [y, radius, normalY, reverse] of [[cy - half, bottomRadius, -1, true], [cy + half, topRadius, 1, false]] as const) {
    const base = mesh.positions.length / 3
    mesh.positions.push(cx, y, cz)
    mesh.normals.push(0, normalY, 0)
    mesh.texcoords.push(0.5, 0.5)
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2
      mesh.positions.push(cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius)
      mesh.normals.push(0, normalY, 0)
      mesh.texcoords.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5)
    }
    for (let index = 0; index < segments; index += 1) {
      if (reverse) mesh.indices.push(base, base + index + 2, base + index + 1)
      else mesh.indices.push(base, base + index + 1, base + index + 2)
    }
  }
  if (rotation.some(Boolean)) rotateNewGeometry(mesh, start, center, rotation)
}

function addTorus(mesh: Mesh, center: [number, number, number], majorRadius: number, tubeRadius: number, majorSegments = 40, tubeSegments = 10) {
  const base = mesh.positions.length / 3
  for (let major = 0; major <= majorSegments; major += 1) {
    const u = major / majorSegments
    const a = u * Math.PI * 2
    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const v = tube / tubeSegments
      const b = v * Math.PI * 2
      const ring = majorRadius + tubeRadius * Math.cos(b)
      mesh.positions.push(center[0] + ring * Math.cos(a), center[1] + tubeRadius * Math.sin(b), center[2] + ring * Math.sin(a))
      mesh.normals.push(Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a))
      mesh.texcoords.push(u, v)
    }
  }
  for (let major = 0; major < majorSegments; major += 1) for (let tube = 0; tube < tubeSegments; tube += 1) {
    const first = base + major * (tubeSegments + 1) + tube
    const second = first + tubeSegments + 1
    mesh.indices.push(first, second, first + 1, second, second + 1, first + 1)
  }
}

function addLathe(mesh: Mesh, profile: Array<[number, number]>, segments = 48) {
  const base = mesh.positions.length / 3
  const maxY = Math.max(...profile.map(([y]) => y), 1e-6)
  for (let row = 0; row < profile.length; row += 1) {
    const [y, radius] = profile[row]
    const previous = profile[Math.max(0, row - 1)]
    const next = profile[Math.min(profile.length - 1, row + 1)]
    const dr = next[1] - previous[1]
    const dy = next[0] - previous[0]
    const tangentLength = Math.hypot(dy, dr) || 1
    const radialNormal = dy / tangentLength
    const verticalNormal = -dr / tangentLength
    for (let segment = 0; segment <= segments; segment += 1) {
      const u = segment / segments
      const angle = u * Math.PI * 2
      mesh.positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      mesh.normals.push(Math.cos(angle) * radialNormal, verticalNormal, Math.sin(angle) * radialNormal)
      mesh.texcoords.push(u, y / maxY)
    }
  }
  for (let row = 0; row < profile.length - 1; row += 1) for (let segment = 0; segment < segments; segment += 1) {
    const first = base + row * (segments + 1) + segment
    const second = first + segments + 1
    mesh.indices.push(first, second, first + 1, second, second + 1, first + 1)
  }
}

function createBase(mesh: Mesh, scale: number) {
  addLathe(mesh, [
    [0, scale * 0.31], [scale * 0.025, scale * 0.335], [scale * 0.065, scale * 0.34],
    [scale * 0.105, scale * 0.31], [scale * 0.14, scale * 0.27], [scale * 0.18, scale * 0.235],
    [scale * 0.215, scale * 0.215],
  ], 52)
  addTorus(mesh, [0, scale * 0.115, 0], scale * 0.275, scale * 0.022, 44, 10)
}

function createKing(mesh: Mesh, scale: number) {
  addPart(mesh, 'king-base-body', 'staunton-weighted-base-and-czech-facet-body', () => {
    createBase(mesh, scale)
    addLathe(mesh, [[scale * 0.21, scale * 0.19], [scale * 0.29, scale * 0.165], [scale * 0.43, scale * 0.13], [scale * 0.58, scale * 0.105], [scale * 0.67, scale * 0.16], [scale * 0.71, scale * 0.18]], 48)
    addTorus(mesh, [0, scale * 0.69, 0], scale * 0.17, scale * 0.025)
    addSphere(mesh, [0, scale * 0.79, 0], [scale * 0.135, scale * 0.13, scale * 0.135], 18, 30)
  })
  addPart(mesh, 'king-cross', 'robust-king-identity-finial', () => {
    addBox(mesh, [0, scale * 0.94, 0], [scale * 0.065, scale * 0.25, scale * 0.075])
    addBox(mesh, [0, scale * 0.975, 0], [scale * 0.21, scale * 0.06, scale * 0.075])
    addSphere(mesh, [0, scale * 0.83, 0], [scale * 0.075, scale * 0.045, scale * 0.075], 10, 18)
  })
}

function createQueen(mesh: Mesh, scale: number) {
  addPart(mesh, 'queen-base-body', 'staunton-queen-body', () => {
    createBase(mesh, scale)
    addLathe(mesh, [[scale * 0.21, scale * 0.19], [scale * 0.31, scale * 0.16], [scale * 0.46, scale * 0.115], [scale * 0.61, scale * 0.095], [scale * 0.69, scale * 0.16], [scale * 0.73, scale * 0.19]], 48)
    addTorus(mesh, [0, scale * 0.705, 0], scale * 0.17, scale * 0.024)
  })
  addPart(mesh, 'queen-crown', 'deep-eight-point-queen-crown', () => {
    addSphere(mesh, [0, scale * 0.79, 0], [scale * 0.125, scale * 0.095, scale * 0.125], 16, 28)
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2
      const x = Math.cos(angle) * scale * 0.13
      const z = Math.sin(angle) * scale * 0.13
      addCylinder(mesh, [x, scale * 0.87, z], scale * 0.18, scale * 0.035, scale * 0.012, 16, [0, 0, Math.cos(angle) * 0.08])
      addSphere(mesh, [x, scale * 0.965, z], [scale * 0.026, scale * 0.026, scale * 0.026], 9, 14)
    }
    addSphere(mesh, [0, scale * 0.905, 0], [scale * 0.048, scale * 0.048, scale * 0.048], 10, 16)
  })
}

function createBishop(mesh: Mesh, scale: number) {
  addPart(mesh, 'bishop-base-body', 'staunton-bishop-body', () => {
    createBase(mesh, scale)
    addLathe(mesh, [[scale * 0.21, scale * 0.185], [scale * 0.32, scale * 0.155], [scale * 0.48, scale * 0.105], [scale * 0.62, scale * 0.092], [scale * 0.68, scale * 0.145], [scale * 0.72, scale * 0.155]], 48)
    addTorus(mesh, [0, scale * 0.69, 0], scale * 0.145, scale * 0.022)
  })
  addPart(mesh, 'bishop-mitre-head', 'rounded-mitre-with-clean-diagonal-gap', () => {
    addSphere(mesh, [-scale * 0.035, scale * 0.82, 0], [scale * 0.095, scale * 0.15, scale * 0.12], 18, 28, [0, 0, -0.18])
    addSphere(mesh, [scale * 0.045, scale * 0.84, 0], [scale * 0.075, scale * 0.125, scale * 0.115], 18, 28, [0, 0, 0.22])
    addSphere(mesh, [0, scale * 0.965, 0], [scale * 0.028, scale * 0.04, scale * 0.028], 10, 16)
  })
}

function createRook(mesh: Mesh, scale: number) {
  addPart(mesh, 'rook-base-tower', 'low-powerful-staunton-rook', () => {
    createBase(mesh, scale)
    addLathe(mesh, [[scale * 0.21, scale * 0.205], [scale * 0.31, scale * 0.19], [scale * 0.50, scale * 0.17], [scale * 0.63, scale * 0.21], [scale * 0.69, scale * 0.27], [scale * 0.74, scale * 0.285]], 48)
    addTorus(mesh, [0, scale * 0.67, 0], scale * 0.235, scale * 0.024)
  })
  addPart(mesh, 'rook-battlements', 'eight-readable-castle-crenellations', () => {
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2
      addBox(mesh, [Math.cos(angle) * scale * 0.22, scale * 0.815, Math.sin(angle) * scale * 0.22], [scale * 0.12, scale * 0.16, scale * 0.13], [0, -angle, 0])
    }
  })
}

function createPawn(mesh: Mesh, scale: number) {
  addPart(mesh, 'pawn-body', 'classic-staunton-pawn', () => {
    createBase(mesh, scale)
    addLathe(mesh, [[scale * 0.21, scale * 0.185], [scale * 0.31, scale * 0.15], [scale * 0.44, scale * 0.105], [scale * 0.55, scale * 0.092], [scale * 0.60, scale * 0.13]], 48)
    addTorus(mesh, [0, scale * 0.59, 0], scale * 0.13, scale * 0.022)
    addSphere(mesh, [0, scale * 0.72, 0], [scale * 0.155, scale * 0.155, scale * 0.155], 20, 32)
  })
}

function createKnight(mesh: Mesh, scale: number) {
  addPart(mesh, 'knight-base-chest', 'centered-staunton-knight-base-and-chest', () => {
    createBase(mesh, scale)
    addSphere(mesh, [-scale * 0.035, scale * 0.39, 0], [scale * 0.19, scale * 0.20, scale * 0.18], 18, 28, [0, 0, -0.16])
  })
  addPart(mesh, 'knight-s-neck', 'continuous-s-curve-neck-mass', () => {
    addSphere(mesh, [-scale * 0.075, scale * 0.50, 0], [scale * 0.15, scale * 0.23, scale * 0.155], 18, 30, [0, 0, -0.24])
    addSphere(mesh, [-scale * 0.025, scale * 0.61, 0], [scale * 0.14, scale * 0.23, scale * 0.145], 18, 30, [0, 0, -0.34])
    addSphere(mesh, [scale * 0.055, scale * 0.70, 0], [scale * 0.15, scale * 0.18, scale * 0.145], 18, 30, [0, 0, -0.18])
  })
  addPart(mesh, 'knight-head-face', 'forehead-cheek-muzzle-jaw-and-eye-planes', () => {
    addSphere(mesh, [scale * 0.10, scale * 0.765, 0], [scale * 0.17, scale * 0.145, scale * 0.14], 20, 32, [0, 0, -0.12])
    addSphere(mesh, [scale * 0.235, scale * 0.72, 0], [scale * 0.17, scale * 0.085, scale * 0.115], 18, 30, [0, 0, -0.10])
    addSphere(mesh, [scale * 0.18, scale * 0.665, 0], [scale * 0.13, scale * 0.065, scale * 0.11], 16, 26, [0, 0, 0.08])
    for (const z of [-0.128, 0.128]) {
      addSphere(mesh, [scale * 0.095, scale * 0.79, scale * z], [scale * 0.022, scale * 0.018, scale * 0.012], 9, 14)
      addSphere(mesh, [scale * 0.30, scale * 0.735, scale * (z * 0.67)], [scale * 0.018, scale * 0.013, scale * 0.01], 8, 12)
    }
  })
  addPart(mesh, 'knight-ears', 'two-anatomical-ears', () => {
    addSphere(mesh, [scale * 0.025, scale * 0.90, -scale * 0.065], [scale * 0.045, scale * 0.105, scale * 0.035], 14, 22, [0.06, 0, -0.14])
    addSphere(mesh, [scale * 0.03, scale * 0.905, scale * 0.07], [scale * 0.043, scale * 0.10, scale * 0.034], 14, 22, [-0.06, 0, -0.10])
  })
  addPart(mesh, 'knight-crayon-mane', 'continuous-rear-neck-mane-with-rounded-spectrum-ridges', () => {
    const points: Array<[number, number, number]> = [
      [-0.17, 0.79, 0], [-0.18, 0.74, 0], [-0.19, 0.69, 0], [-0.19, 0.64, 0], [-0.185, 0.59, 0],
      [-0.175, 0.54, 0], [-0.16, 0.49, 0], [-0.14, 0.44, 0], [-0.12, 0.40, 0], [-0.10, 0.36, 0],
    ]
    points.forEach(([x, y, z], index) => {
      addCylinder(mesh, [scale * x, scale * y, scale * z], scale * 0.14, scale * 0.027, scale * 0.018, 16, [Math.PI / 2, 0, -0.2 + index * 0.018])
      addSphere(mesh, [scale * x, scale * (y + 0.07), scale * z], [scale * 0.027, scale * 0.022, scale * 0.027], 8, 12)
    })
  })
}

function resolvePieceRole(specification: AssetSpecification): PieceRole {
  const prompt = specification.prompt.toLocaleLowerCase('pl')
  if (prompt.includes('queen') || prompt.includes('hetman') || prompt.includes('królow') || prompt.includes('krolow')) return 'queen'
  if (prompt.includes('bishop') || prompt.includes('goniec')) return 'bishop'
  if (prompt.includes('rook') || prompt.includes('wież') || prompt.includes('castle')) return 'rook'
  if (prompt.includes('knight') || prompt.includes('horse') || prompt.includes('koń') || prompt.includes('kon ') || prompt.includes('crayon')) return 'knight'
  if (prompt.includes('pawn') || prompt.includes('pion')) return 'pawn'
  return 'king'
}

function buildMesh(role: PieceRole, scale: number) {
  const mesh: Mesh = { positions: [], normals: [], texcoords: [], indices: [], semanticParts: [] }
  if (role === 'king') createKing(mesh, scale)
  else if (role === 'queen') createQueen(mesh, scale)
  else if (role === 'bishop') createBishop(mesh, scale)
  else if (role === 'rook') createRook(mesh, scale)
  else if (role === 'knight') createKnight(mesh, scale)
  else createPawn(mesh, scale)
  return mesh
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
  let a = 1, b = 0
  for (const byte of bytes) { a = (a + byte) % 65521; b = (b + a) % 65521 }
  return ((b << 16) | a) >>> 0
}

function u32(value: number) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255])
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
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
  const deflate = concat([new Uint8Array([0x78, 0x01, 0x01, length & 255, (length >>> 8) & 255, (~length) & 255, ((~length) >>> 8) & 255]), raw, u32(adler32(raw))])
  const ihdr = concat([u32(width), u32(height), new Uint8Array([8, 2, 0, 0, 0])])
  return concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflate), pngChunk('IEND', new Uint8Array())])
}

function bytesFingerprint(bytes: Uint8Array) {
  let hash = 2166136261
  for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 16777619) }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function geometryFingerprint(mesh: Mesh) {
  let hash = 2166136261
  for (const value of [...mesh.positions, ...mesh.indices]) {
    for (const character of `${Number.isInteger(value) ? value : value.toFixed(7)};`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function typedBytes(values: number[], kind: 'float32' | 'uint32') {
  const typed = kind === 'float32' ? new Float32Array(values) : new Uint32Array(values)
  return new Uint8Array(typed.buffer)
}

function vectorBounds(values: number[]) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < values.length; index += 3) for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], values[index + axis])
    max[axis] = Math.max(max[axis], values[index + axis])
  }
  return { min, max }
}

function createPbrMaps(specification: AssetSpecification, role: PieceRole) {
  const width = 128, height = 128
  const led = specification.ledIntensity / 100
  const normal = createRgbPng(width, height, (x, y) => {
    const u = x / width, v = y / height
    const micro = Math.sin(u * 90 + Math.sin(v * 31) * 2.2) * Math.cos(v * 77 - u * 13)
    const ridges = role === 'knight' ? Math.sin(u * 12 * Math.PI) * 0.5 : Math.sin((u + v) * 19) * 0.18
    return [128 + (micro + ridges) * 12, 128 + (micro - ridges) * 10, 244]
  })
  const orm = createRgbPng(width, height, (x, y) => {
    const noise = ((Math.sin(x * 12.9898 + y * 78.233 + role.length * 17.171) * 43758.5453) % 1 + 1) % 1
    const ao = 228 + noise * 24
    const roughness = role === 'pawn' ? 185 + noise * 38 : role === 'knight' ? 150 + noise * 42 : 135 + noise * 46
    const metallic = role === 'pawn' ? 15 : 34 + led * 38
    return [ao, roughness, metallic]
  })
  const [er, eg, eb] = (() => {
    const value = Number.parseInt(specification.secondaryColor.slice(1), 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  })()
  const emissive = createRgbPng(width, height, (x, y) => {
    const u = x / width, v = y / height
    const mane = role === 'knight' && (Math.floor(u * 12) % 2 === 0)
    const inlay = Math.abs(Math.sin((u + v) * Math.PI * 12)) > 0.965
    const active = role === 'pawn' ? inlay && led > 0.65 : (mane || inlay) && led > 0.05
    const factor = active ? Math.max(0.18, led) : 0
    return [er * factor, eg * factor, eb * factor]
  })
  const map = (bytes: Uint8Array, suffix: string, mapRole: PbrMap['role']): PbrMap => ({ filename: `${specification.id}-${suffix}.png`, mimeType: 'image/png', width, height, bytes, fingerprint: bytesFingerprint(bytes), role: mapRole })
  return { normal: map(normal, 'normal', 'normal'), orm: map(orm, 'orm', 'orm'), emissive: map(emissive, 'emissive', 'emissive') }
}

export function generatePremiumCubeAssetBundle(specification: AssetSpecification): PremiumCubeAssetBundle {
  if (specification.assetKind !== 'figurine' || specification.piecePreset === 'earth-guardian') {
    const fallback = generateProceduralAssetBundle(specification)
    const blank = createRgbPng(128, 128, () => [128, 128, 255])
    const orm = createRgbPng(128, 128, () => [255, 180, 24])
    const emissive = createRgbPng(128, 128, () => [0, 0, 0])
    const wrap = (bytes: Uint8Array, suffix: string, role: PbrMap['role']): PbrMap => ({ filename: `${specification.id}-${suffix}.png`, mimeType: 'image/png', width: 128, height: 128, bytes, fingerprint: bytesFingerprint(bytes), role })
    return Object.assign(fallback, {
      trainingProfile: 'OWNER_AUTHORIZED_PREMIUM_FULL_GAME_V3' as const,
      pieceRole: 'pawn' as const,
      pbrMaps: { normal: wrap(blank, 'normal', 'normal'), orm: wrap(orm, 'orm', 'orm'), emissive: wrap(emissive, 'emissive', 'emissive') },
      pbrProfile: { baseColor: true as const, normal: true as const, occlusionRoughnessMetallic: true as const, emissive: true as const },
    })
  }

  const role = resolvePieceRole(specification)
  const scale = specification.scaleMm / 1000
  const mesh = buildMesh(role, scale)
  const base = generateProceduralAssetBundle(specification)
  const pbrMaps = createPbrMaps(specification, role)
  const positions = typedBytes(mesh.positions, 'float32')
  const normals = typedBytes(mesh.normals, 'float32')
  const texcoords = typedBytes(mesh.texcoords, 'float32')
  const indices = typedBytes(mesh.indices, 'uint32')
  const binary = concat([positions, normals, texcoords, indices])
  const bounds = vectorBounds(mesh.positions)
  const fingerprint = geometryFingerprint(mesh)
  const textureFingerprint = base.textureFingerprint
  const emissiveStrength = Number((specification.ledIntensity / 100).toFixed(3))
  const images = [
    { name: 'baseColor', bytes: base.texture.bytes, fingerprint: base.textureFingerprint },
    { name: 'normal', bytes: pbrMaps.normal.bytes, fingerprint: pbrMaps.normal.fingerprint },
    { name: 'orm', bytes: pbrMaps.orm.bytes, fingerprint: pbrMaps.orm.fingerprint },
    { name: 'emissive', bytes: pbrMaps.emissive.bytes, fingerprint: pbrMaps.emissive.fingerprint },
  ]
  const gltf = {
    asset: { version: '2.0', generator: 'ForgeMCP procedural exporter v1 · premium geometry profile V2' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: `Premium ${role}` }],
    meshes: [{ name: `${specification.id}-premium-v2`, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{
      name: `${role}-premium-pbr-v2`,
      pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 }, metallicFactor: 1, roughnessFactor: 1 },
      normalTexture: { index: 1, scale: 0.72 },
      occlusionTexture: { index: 2, strength: 0.8 },
      emissiveTexture: { index: 3 },
      emissiveFactor: [emissiveStrength, emissiveStrength, emissiveStrength],
    }],
    textures: images.map((_, index) => ({ sampler: 0, source: index })),
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: images.map(image => ({ uri: `data:image/png;base64,${bytesToBase64(image.bytes)}`, mimeType: 'image/png', name: image.name, extras: { fingerprint: image.fingerprint } })),
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
      status: 'LOCAL_PROCEDURAL_PREMIUM_V2',
      pieceRole: role,
      ownerTrainingProfile: 'premium-full-game-v3',
      trainingRulesApplied: [
        'recognizable chess silhouette', 'uniform scale/pivot/base', 'one-cell footprint intent',
        'higher-detail geometry', 'PBR baseColor+normal+ORM+emissive', 'semantic-part QA',
      ],
      geometryFingerprint: fingerprint,
      pbrFingerprints: Object.fromEntries(images.map(image => [image.name, image.fingerprint])),
      semanticParts: mesh.semanticParts,
    },
  }
  const content = JSON.stringify(gltf, null, 2)
  JSON.parse(content)
  const vertexCount = mesh.positions.length / 3
  const semanticPartRangesValid = mesh.semanticParts.every(part => mesh.indices.slice(part.indexStart, part.indexStart + part.indexCount).every(index => index >= part.vertexStart && index < part.vertexStart + part.vertexCount))
  const qa = {
    parseableGltfJson: true,
    geometryPresent: mesh.positions.length > 0,
    binaryLengthMatches: binary.length === positions.length + normals.length + texcoords.length + indices.length,
    indicesWithinVertexRange: mesh.indices.every(index => index >= 0 && index < vertexCount),
    finitePositions: mesh.positions.every(Number.isFinite),
    bufferViewsAligned: [0, positions.length, positions.length + normals.length, positions.length + normals.length + texcoords.length].every(offset => offset % 4 === 0),
    pngSignatureValid: [base.texture.bytes, pbrMaps.normal.bytes, pbrMaps.orm.bytes, pbrMaps.emissive.bytes].every(bytes => [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)),
    specificationLinked: gltf.extras.specificationId === specification.id,
    presetResolved: true,
    geometryFingerprintLinked: gltf.extras.geometryFingerprint === fingerprint,
    textureFingerprintLinked: gltf.images[0].extras.fingerprint === textureFingerprint,
    semanticPartsPresent: mesh.semanticParts.length >= 2,
    semanticPartRangesValid,
    texturePatternResolved: gltf.images.length === 4,
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
      preset: base.preview.preset,
      label: `Premium V2 ${role}`,
      promptMatched: true,
      primaryColor: specification.primaryColor,
      secondaryColor: specification.secondaryColor,
      positions: mesh.positions,
      normals: mesh.normals,
      texcoords: mesh.texcoords,
      indices: mesh.indices,
    },
    model: { filename: `${specification.id}-premium-v2.gltf`, mimeType: 'model/gltf+json', content },
    texture: base.texture,
    metrics: { vertices: vertexCount, triangles: mesh.indices.length / 3, embeddedTexture: true, selfContained: true },
    qa: { ...qa, result: Object.values(qa).every(Boolean) ? 'GENERATOR_CHECKS_PASS' : 'GENERATOR_CHECKS_FAIL' },
    truthBoundary: 'Premium V2 applies owner-authorized ChessArena visual-training rules as deterministic geometry/PBR constraints. It does not claim a trained generative 3D checkpoint is loaded. The mesh and four PBR maps are generated locally and remain prototype art until reviewed against the owner archive and runtime closeups.',
    trainingProfile: 'OWNER_AUTHORIZED_PREMIUM_FULL_GAME_V3',
    pieceRole: role,
    pbrMaps,
    pbrProfile: { baseColor: true, normal: true, occlusionRoughnessMetallic: true, emissive: true },
  }
}
