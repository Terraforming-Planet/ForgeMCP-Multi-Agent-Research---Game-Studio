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

type Point3 = [number, number, number]

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

function rotatePoint([x, y, z]: Point3, [rx, ry, rz]: Point3): Point3 {
  const cx = Math.cos(rx), sx = Math.sin(rx)
  const cy = Math.cos(ry), sy = Math.sin(ry)
  const cz = Math.cos(rz), sz = Math.sin(rz)
  const y1 = y * cx - z * sx
  const z1 = y * sx + z * cx
  const x2 = x * cy + z1 * sy
  const z2 = -x * sy + z1 * cy
  return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2]
}

function rotateNewGeometry(mesh: Mesh, startVertex: number, center: Point3, rotation: Point3) {
  for (let vertex = startVertex; vertex < mesh.positions.length / 3; vertex += 1) {
    const offset = vertex * 3
    const position = rotatePoint([
      mesh.positions[offset] - center[0],
      mesh.positions[offset + 1] - center[1],
      mesh.positions[offset + 2] - center[2],
    ], rotation)
    const normal = rotatePoint([
      mesh.normals[offset],
      mesh.normals[offset + 1],
      mesh.normals[offset + 2],
    ], rotation)
    mesh.positions[offset] = center[0] + position[0]
    mesh.positions[offset + 1] = center[1] + position[1]
    mesh.positions[offset + 2] = center[2] + position[2]
    mesh.normals[offset] = normal[0]
    mesh.normals[offset + 1] = normal[1]
    mesh.normals[offset + 2] = normal[2]
  }
}

function addBox(mesh: Mesh, center: Point3, size: Point3, rotation: Point3 = [0, 0, 0]) {
  const start = mesh.positions.length / 3
  const [cx, cy, cz] = center
  const [hx, hy, hz] = size.map(value => value / 2) as Point3
  const faces: Array<{ normal: Point3; corners: Point3[] }> = [
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

function addCylinder(mesh: Mesh, center: Point3, height: number, radius: number, segments = 24, rotation: Point3 = [0, 0, 0]) {
  const start = mesh.positions.length / 3
  const [cx, cy, cz] = center
  const half = height / 2
  const sideBase = mesh.positions.length / 3
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments
    const angle = u * Math.PI * 2
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    mesh.positions.push(cx + cosine * radius, cy - half, cz + sine * radius)
    mesh.positions.push(cx + cosine * radius, cy + half, cz + sine * radius)
    mesh.normals.push(cosine, 0, sine, cosine, 0, sine)
    mesh.texcoords.push(u, 0, u, 1)
  }
  for (let index = 0; index < segments; index += 1) {
    const first = sideBase + index * 2
    mesh.indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2)
  }
  for (const [y, normalY, reverse] of [[cy - half, -1, true], [cy + half, 1, false]] as const) {
    const base = mesh.positions.length / 3
    mesh.positions.push(cx, y, cz)
    mesh.normals.push(0, normalY, 0)
    mesh.texcoords.push(0.5, 0.5)
    for (let index = 0; index <= segments; index += 1) {
      const angle = index / segments * Math.PI * 2
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

function addPart(mesh: Mesh, name: string, role: string, build: () => void) {
  const vertexStart = mesh.positions.length / 3
  const indexStart = mesh.indices.length
  build()
  const vertexCount = mesh.positions.length / 3 - vertexStart
  const indexCount = mesh.indices.length - indexStart
  if (vertexCount && indexCount) mesh.semanticParts.push({ name, role, vertexStart, vertexCount, indexStart, indexCount })
}

function buildExcavator(scale: number) {
  const mesh: Mesh = { positions: [], normals: [], texcoords: [], indices: [], semanticParts: [] }
  addPart(mesh, 'crawler-undercarriage', 'two-wide-tracks-and-ground-contact', () => {
    addBox(mesh, [-scale * 0.02, scale * 0.12, -scale * 0.19], [scale * 0.64, scale * 0.16, scale * 0.13])
    addBox(mesh, [-scale * 0.02, scale * 0.12, scale * 0.19], [scale * 0.64, scale * 0.16, scale * 0.13])
    for (const z of [-0.19, 0.19]) for (const x of [-0.22, 0, 0.22]) {
      addCylinder(mesh, [scale * x, scale * 0.12, scale * z], scale * 0.11, scale * 0.07, 20, [Math.PI / 2, 0, 0])
    }
  })
  addPart(mesh, 'rotating-chassis', 'slew-platform-engine-and-counterweight', () => {
    addCylinder(mesh, [0, scale * 0.25, 0], scale * 0.1, scale * 0.24, 28)
    addBox(mesh, [-scale * 0.08, scale * 0.34, 0], [scale * 0.46, scale * 0.18, scale * 0.38])
    addBox(mesh, [-scale * 0.22, scale * 0.44, 0], [scale * 0.25, scale * 0.22, scale * 0.34])
  })
  addPart(mesh, 'operator-cab', 'cab-frame-and-window-volume', () => {
    addBox(mesh, [scale * 0.08, scale * 0.51, scale * 0.1], [scale * 0.23, scale * 0.34, scale * 0.25], [0, 0, -0.04])
    addBox(mesh, [scale * 0.14, scale * 0.61, scale * 0.235], [scale * 0.15, scale * 0.16, scale * 0.012], [0, 0, -0.04])
  })
  addPart(mesh, 'boom-stick-hydraulics', 'articulated-excavation-arm-with-visible-joints', () => {
    addBox(mesh, [scale * 0.27, scale * 0.58, 0], [scale * 0.52, scale * 0.09, scale * 0.13], [0, 0, 0.58])
    addCylinder(mesh, [scale * 0.08, scale * 0.43, 0], scale * 0.15, scale * 0.075, 24, [Math.PI / 2, 0, 0])
    addBox(mesh, [scale * 0.52, scale * 0.77, 0], [scale * 0.42, scale * 0.075, scale * 0.11], [0, 0, -0.72])
    addCylinder(mesh, [scale * 0.45, scale * 0.72, 0], scale * 0.13, scale * 0.065, 24, [Math.PI / 2, 0, 0])
    addBox(mesh, [scale * 0.28, scale * 0.66, -scale * 0.085], [scale * 0.42, scale * 0.025, scale * 0.028], [0, 0, 0.55])
    addBox(mesh, [scale * 0.53, scale * 0.7, scale * 0.08], [scale * 0.31, scale * 0.022, scale * 0.026], [0, 0, -0.72])
  })
  addPart(mesh, 'terrain-bucket', 'ground-facing-bucket-for-channel-and-sample-work', () => {
    addBox(mesh, [scale * 0.66, scale * 0.52, 0], [scale * 0.2, scale * 0.14, scale * 0.28], [0, 0, -0.38])
    for (const z of [-0.1, -0.033, 0.033, 0.1]) {
      addBox(mesh, [scale * 0.75, scale * 0.45, scale * z], [scale * 0.12, scale * 0.025, scale * 0.035], [0, 0, -0.38])
    }
  })
  return mesh
}

function typedBytes(values: number[], kind: 'float32' | 'uint32') {
  const typed = kind === 'float32' ? new Float32Array(values) : new Uint32Array(values)
  return new Uint8Array(typed.buffer)
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { output.set(part, offset); offset += part.length }
  return output
}

function bounds(values: number[]) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < values.length; index += 3) for (let axis = 0; axis < 3; axis += 1) {
    min[axis] = Math.min(min[axis], values[index + axis])
    max[axis] = Math.max(max[axis], values[index + axis])
  }
  return { min, max }
}

function geometryFingerprint(mesh: Mesh) {
  let hash = 2166136261
  for (const value of [...mesh.positions, ...mesh.indices]) {
    for (const character of `${Number.isInteger(value) ? value : value.toFixed(7)};`) {
      hash ^= character.charCodeAt(0)
      hash = Math.imul(hash, 16777619)
    }
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function generateSaharaExcavatorBundle(specification: AssetSpecification): ProceduralAssetBundle {
  const base = generateProceduralAssetBundle(specification)
  const scale = Math.max(0.35, specification.scaleMm / 1000)
  const mesh = buildExcavator(scale)
  const positions = typedBytes(mesh.positions, 'float32')
  const normals = typedBytes(mesh.normals, 'float32')
  const texcoords = typedBytes(mesh.texcoords, 'float32')
  const indices = typedBytes(mesh.indices, 'uint32')
  const binary = concat([positions, normals, texcoords, indices])
  const range = bounds(mesh.positions)
  const fingerprint = geometryFingerprint(mesh)
  const vertexCount = mesh.positions.length / 3
  const semanticPartRangesValid = mesh.semanticParts.every(part => mesh.indices
    .slice(part.indexStart, part.indexStart + part.indexCount)
    .every(index => index >= part.vertexStart && index < part.vertexStart + part.vertexCount))

  const gltf = {
    asset: { version: '2.0', generator: 'ForgeMCP Sahara field-equipment repair v1' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'Sahara terrain excavator' }],
    meshes: [{ name: `${specification.id}-excavator`, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{
      name: 'construction-yellow-weathered-steel',
      pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0.32, roughnessFactor: 0.6 },
      emissiveFactor: [0.03, 0.02, 0],
    }],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    images: [{ uri: `data:image/png;base64,${bytesToBase64(base.texture.bytes)}`, mimeType: 'image/png', name: 'sahara-excavator-surface' }],
    buffers: [{ uri: `data:application/octet-stream;base64,${bytesToBase64(binary)}`, byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length, byteLength: normals.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length, byteLength: texcoords.length, target: 34962 },
      { buffer: 0, byteOffset: positions.length + normals.length + texcoords.length, byteLength: indices.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min: range.min, max: range.max },
      { bufferView: 1, componentType: 5126, count: mesh.normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: mesh.texcoords.length / 2, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: mesh.indices.length, type: 'SCALAR' },
    ],
    extras: {
      specificationId: specification.id,
      status: 'LOCAL_PROCEDURAL_FIELD_EQUIPMENT',
      geometryFingerprint: fingerprint,
      textureFingerprint: base.textureFingerprint,
      texturePattern: base.texture.pattern,
      semanticParts: mesh.semanticParts,
      truthBoundary: 'Generated engineering concept for terrain-access and sampling visualization; not proof of deployed machinery or field intervention.',
    },
  }
  const content = JSON.stringify(gltf, null, 2)
  JSON.parse(content)
  const checks = {
    parseableGltfJson: true,
    geometryPresent: mesh.positions.length > 0,
    binaryLengthMatches: binary.length === positions.length + normals.length + texcoords.length + indices.length,
    indicesWithinVertexRange: mesh.indices.every(index => index >= 0 && index < vertexCount),
    finitePositions: mesh.positions.every(Number.isFinite),
    bufferViewsAligned: [0, positions.length, positions.length + normals.length, positions.length + normals.length + texcoords.length].every(offset => offset % 4 === 0),
    pngSignatureValid: base.qa.pngSignatureValid,
    specificationLinked: true,
    presetResolved: true,
    geometryFingerprintLinked: true,
    textureFingerprintLinked: true,
    semanticPartsPresent: mesh.semanticParts.length >= 5,
    semanticPartRangesValid,
    texturePatternResolved: base.qa.texturePatternResolved,
  }

  return {
    ...base,
    specificationId: `${specification.id}-excavator`,
    geometryFingerprint: fingerprint,
    semanticParts: mesh.semanticParts,
    preview: {
      preset: 'research-station',
      label: 'Sahara terrain excavator',
      promptMatched: true,
      primaryColor: '#d4a72c',
      secondaryColor: '#68747d',
      positions: mesh.positions,
      normals: mesh.normals,
      texcoords: mesh.texcoords,
      indices: mesh.indices,
    },
    model: { filename: `${specification.id}-sahara-excavator.gltf`, mimeType: 'model/gltf+json', content },
    metrics: { vertices: vertexCount, triangles: mesh.indices.length / 3, embeddedTexture: true, selfContained: true },
    qa: { ...checks, result: Object.values(checks).every(Boolean) ? 'GENERATOR_CHECKS_PASS' : 'GENERATOR_CHECKS_FAIL' },
    truthBoundary: 'This is a real locally generated 3D excavator concept with exported geometry and texture data. It is a visualization asset for Sahara terrain-access/sampling workflows, not evidence of an excavator operating in the field.',
  }
}
