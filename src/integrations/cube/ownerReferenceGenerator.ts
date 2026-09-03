import type { PremiumCubeAssetBundle } from './premiumGeometryV2'
import {
  chooseOwnerReferenceModel,
  inferOwnerTextureRole,
  type OwnerAssetInput,
  type OwnerPieceRole,
  type OwnerReferenceProfile,
} from './ownerAssetIntake'

export interface OwnerReferenceGenerationResult {
  bundle: PremiumCubeAssetBundle
  reference: {
    manifestSha256: string
    modelName: string | null
    geometryCalibrated: boolean
    widthDepthScale: number
    textureOverrides: Array<{ role: 'baseColor' | 'normal' | 'orm' | 'emissive'; filename: string }>
    warnings: string[]
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

function typedBytes(values: number[], kind: 'float32' | 'uint32') {
  const typed = kind === 'float32' ? new Float32Array(values) : new Uint32Array(values)
  return new Uint8Array(typed.buffer)
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

function vectorBounds(values: number[]) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis])
      max[axis] = Math.max(max[axis], values[index + axis])
    }
  }
  return { min, max }
}

function geometryFingerprint(positions: number[], indices: number[]) {
  let hash = 2166136261
  for (const value of [...positions, ...indices]) {
    const text = `${Number.isInteger(value) ? value : value.toFixed(7)};`
    for (const character of text) {
      hash ^= character.charCodeAt(0)
      hash = Math.imul(hash, 16777619)
    }
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function normalizeNormal(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

function referenceAspect(profile: OwnerReferenceProfile, role: OwnerPieceRole) {
  const reference = chooseOwnerReferenceModel(profile, role)
  const width = reference?.bounds.width ?? null
  const height = reference?.bounds.height ?? null
  return width && height && width > 0 && height > 0 ? height / width : null
}

function generatedAspect(bundle: PremiumCubeAssetBundle) {
  const bounds = vectorBounds(bundle.preview.positions)
  const width = bounds.max[0] - bounds.min[0]
  const height = bounds.max[1] - bounds.min[1]
  return width > 0 && height > 0 ? height / width : null
}

function rebuildGeometry(bundle: PremiumCubeAssetBundle, widthDepthScale: number, ownerManifestSha256: string) {
  if (Math.abs(widthDepthScale - 1) < 0.005) return { bundle, calibrated: false }
  const positions = [...bundle.preview.positions]
  const normals = [...bundle.preview.normals]
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] *= widthDepthScale
    positions[index + 2] *= widthDepthScale
    const [nx, ny, nz] = normalizeNormal(
      normals[index] / widthDepthScale,
      normals[index + 1],
      normals[index + 2] / widthDepthScale,
    )
    normals[index] = nx
    normals[index + 1] = ny
    normals[index + 2] = nz
  }
  const positionBytes = typedBytes(positions, 'float32')
  const normalBytes = typedBytes(normals, 'float32')
  const texcoordBytes = typedBytes(bundle.preview.texcoords, 'float32')
  const indexBytes = typedBytes(bundle.preview.indices, 'uint32')
  const binary = concat([positionBytes, normalBytes, texcoordBytes, indexBytes])
  const bounds = vectorBounds(positions)
  const fingerprint = geometryFingerprint(positions, bundle.preview.indices)
  const gltf = JSON.parse(bundle.model.content) as {
    buffers: Array<{ uri: string; byteLength: number }>
    bufferViews: Array<{ buffer: number; byteOffset: number; byteLength: number; target?: number }>
    accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; min?: number[]; max?: number[] }>
    extras?: Record<string, unknown>
  }
  gltf.buffers[0] = { uri: `data:application/octet-stream;base64,${bytesToBase64(binary)}`, byteLength: binary.length }
  gltf.bufferViews[0] = { ...gltf.bufferViews[0], byteOffset: 0, byteLength: positionBytes.length }
  gltf.bufferViews[1] = { ...gltf.bufferViews[1], byteOffset: positionBytes.length, byteLength: normalBytes.length }
  gltf.bufferViews[2] = { ...gltf.bufferViews[2], byteOffset: positionBytes.length + normalBytes.length, byteLength: texcoordBytes.length }
  gltf.bufferViews[3] = { ...gltf.bufferViews[3], byteOffset: positionBytes.length + normalBytes.length + texcoordBytes.length, byteLength: indexBytes.length }
  gltf.accessors[0] = { ...gltf.accessors[0], count: positions.length / 3, min: bounds.min, max: bounds.max }
  gltf.accessors[1] = { ...gltf.accessors[1], count: normals.length / 3 }
  gltf.accessors[2] = { ...gltf.accessors[2], count: bundle.preview.texcoords.length / 2 }
  gltf.accessors[3] = { ...gltf.accessors[3], count: bundle.preview.indices.length }
  gltf.extras = {
    ...(gltf.extras ?? {}),
    geometryFingerprint: fingerprint,
    ownerReferenceManifestSha256,
    ownerReferenceWidthDepthScale: Number(widthDepthScale.toFixed(5)),
    ownerReferenceCalibration: 'HEIGHT_WIDTH_ASPECT_WITH_ONE_CELL_SAFETY_CLAMP',
  }
  return {
    calibrated: true,
    bundle: {
      ...bundle,
      geometryFingerprint: fingerprint,
      preview: { ...bundle.preview, positions, normals },
      model: { ...bundle.model, content: JSON.stringify(gltf, null, 2) },
      truthBoundary: `${bundle.truthBoundary} Owner-reference geometry calibration adjusted width/depth only within a guarded ±18% range to approach the selected owner model aspect while preserving the generated role topology and board-fit intent.`,
    },
  }
}

function findPngOverride(inputs: OwnerAssetInput[], role: OwnerPieceRole, mapRole: 'baseColor' | 'normal' | 'orm' | 'emissive') {
  const exact = inputs.find(input => input.mimeType === 'image/png'
    && inferOwnerTextureRole(input.name) === mapRole
    && input.name.toLowerCase().includes(role))
  if (exact) return exact
  return inputs.find(input => input.mimeType === 'image/png' && inferOwnerTextureRole(input.name) === mapRole) ?? null
}

function smallFingerprint(bytes: Uint8Array) {
  let hash = 2166136261
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function applyOwnerPngTextures(bundle: PremiumCubeAssetBundle, inputs: OwnerAssetInput[], role: OwnerPieceRole, manifestSha256: string) {
  const gltf = JSON.parse(bundle.model.content) as {
    images?: Array<{ uri?: string; mimeType?: string; name?: string; extras?: Record<string, unknown> }>
    extras?: Record<string, unknown>
  }
  if (!gltf.images || gltf.images.length < 4) return { bundle, overrides: [] as Array<{ role: 'baseColor' | 'normal' | 'orm' | 'emissive'; filename: string }> }
  const clone: PremiumCubeAssetBundle = {
    ...bundle,
    texture: { ...bundle.texture },
    pbrMaps: {
      normal: { ...bundle.pbrMaps.normal },
      orm: { ...bundle.pbrMaps.orm },
      emissive: { ...bundle.pbrMaps.emissive },
    },
  }
  const overrides: Array<{ role: 'baseColor' | 'normal' | 'orm' | 'emissive'; filename: string }> = []
  const definitions = [
    ['baseColor', 0], ['normal', 1], ['orm', 2], ['emissive', 3],
  ] as const
  for (const [mapRole, imageIndex] of definitions) {
    const input = findPngOverride(inputs, role, mapRole)
    if (!input) continue
    const fingerprint = smallFingerprint(input.bytes)
    gltf.images[imageIndex] = {
      ...gltf.images[imageIndex],
      uri: `data:image/png;base64,${bytesToBase64(input.bytes)}`,
      mimeType: 'image/png',
      name: `owner-${mapRole}-${input.name}`,
      extras: { ...(gltf.images[imageIndex].extras ?? {}), fingerprint, ownerManifestSha256: manifestSha256, sourceFilename: input.name },
    }
    if (mapRole === 'baseColor') {
      clone.texture = { ...clone.texture, filename: input.name, bytes: input.bytes, fingerprint }
      clone.textureFingerprint = fingerprint
    } else {
      clone.pbrMaps[mapRole] = { ...clone.pbrMaps[mapRole], filename: input.name, bytes: input.bytes, fingerprint }
    }
    overrides.push({ role: mapRole, filename: input.name })
  }
  gltf.extras = {
    ...(gltf.extras ?? {}),
    ownerReferenceManifestSha256: manifestSha256,
    ownerTextureOverrides: overrides,
  }
  clone.model = { ...clone.model, content: JSON.stringify(gltf, null, 2) }
  clone.truthBoundary = `${clone.truthBoundary} ${overrides.length ? `${overrides.length} owner-selected PNG PBR map(s) are embedded directly into this exported glTF for the current browser session.` : 'No compatible owner PNG PBR map was embedded; generated V2 PBR maps remain active.'}`
  return { bundle: clone, overrides }
}

export function applyOwnerReferenceToPremiumBundle(
  inputBundle: PremiumCubeAssetBundle,
  inputs: OwnerAssetInput[],
  profile: OwnerReferenceProfile,
  role: OwnerPieceRole,
): OwnerReferenceGenerationResult {
  const warnings: string[] = []
  const targetAspect = referenceAspect(profile, role)
  const currentAspect = generatedAspect(inputBundle)
  let widthDepthScale = 1
  if (targetAspect && currentAspect) {
    widthDepthScale = Math.max(0.82, Math.min(1.18, currentAspect / targetAspect))
    if (Math.abs(currentAspect / targetAspect - widthDepthScale) > 0.01) {
      warnings.push('Owner aspect required more than ±18% correction; board-fit safety clamp limited the change.')
    }
  } else {
    warnings.push('No parseable height/width bounds for the selected owner model; generated V2 proportions were kept.')
  }
  const geometry = rebuildGeometry(inputBundle, widthDepthScale, profile.manifestSha256)
  const textured = applyOwnerPngTextures(geometry.bundle, inputs, role, profile.manifestSha256)
  if (!textured.overrides.length && profile.textures.length) {
    warnings.push('Owner textures were inventoried, but no compatible PNG BaseColor/Normal/ORM/Emissive map could be embedded automatically.')
  }
  const reference = chooseOwnerReferenceModel(profile, role)
  return {
    bundle: textured.bundle,
    reference: {
      manifestSha256: profile.manifestSha256,
      modelName: reference?.name ?? null,
      geometryCalibrated: geometry.calibrated,
      widthDepthScale: Number(widthDepthScale.toFixed(4)),
      textureOverrides: textured.overrides,
      warnings,
    },
  }
}
