import { describe, expect, it } from 'vitest'
import { createAssetSpecification, type AssetConfiguration } from '../integrations/commerce/productLab'
import {
  buildOwnerReferenceProfile,
  calibrateOwnerReferenceConfiguration,
  type OwnerAssetInput,
} from '../integrations/cube/ownerAssetIntake'
import { applyOwnerReferenceToPremiumBundle } from '../integrations/cube/ownerReferenceGenerator'
import { generatePremiumCubeAssetBundle } from '../integrations/cube/premiumGeometryV2'

function configuration(): AssetConfiguration {
  return {
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'figurine',
    boardPreset: 'lab-ledcolor',
    piecePreset: 'lab-ledcolor',
    material: 'Premium owner reference',
    texture: 'BaseColor Normal ORM Emissive',
    primaryColor: '#252b36',
    secondaryColor: '#ff54d8',
    ledIntensity: 58,
    scaleMm: 108,
    prompt: 'Premium knight horse with anatomical face, S neck and controlled crayon mane.',
  }
}

function referenceGltf() {
  return {
    asset: { version: '2.0' },
    accessors: [
      { count: 12000, type: 'VEC3', min: [-0.04, 0, -0.03], max: [0.04, 0.12, 0.03] },
      { count: 30000, type: 'SCALAR' },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{
      pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 } },
      normalTexture: { index: 1 },
      occlusionTexture: { index: 2 },
      emissiveTexture: { index: 3 },
    }],
  }
}

function input(name: string, bytes: Uint8Array, mimeType = 'application/octet-stream'): OwnerAssetInput {
  return { name, bytes, mimeType }
}

describe('owner asset intake and reference-driven Premium V3', () => {
  it('parses owner glTF bounds, topology, PBR coverage and derives calibrated scale', async () => {
    const model = input('premium-knight-owner.gltf', new TextEncoder().encode(JSON.stringify(referenceGltf())), 'model/gltf+json')
    const profile = await buildOwnerReferenceProfile([model])

    expect(profile.status).toBe('OWNER_REFERENCE_READY')
    expect(profile.models[0].inferredRole).toBe('knight')
    expect(profile.models[0].vertices).toBe(12000)
    expect(profile.models[0].triangles).toBe(10000)
    expect(profile.models[0].bounds.height).toBeCloseTo(0.12)
    expect(profile.calibration.suggestedScaleMm).toBe(120)
    expect(profile.calibration.pbrCoverage).toBe(4)
    expect(profile.manifestSha256).toMatch(/^[a-f0-9]{64}$/)

    const calibrated = calibrateOwnerReferenceConfiguration(configuration(), profile, 'knight')
    expect(calibrated.scaleMm).toBeGreaterThan(110)
    expect(calibrated.scaleMm).toBeLessThan(125)
    expect(calibrated.prompt).toContain('OWNER REFERENCE CALIBRATION')
    expect(calibrated.prompt).toContain('30,000 triangles')
  })

  it('embeds owner PNG PBR maps and records geometry calibration in exported glTF', async () => {
    const baseSpecification = createAssetSpecification(configuration())
    const seed = generatePremiumCubeAssetBundle(baseSpecification)
    const ownerInputs: OwnerAssetInput[] = [
      input('premium-knight-owner.gltf', new TextEncoder().encode(JSON.stringify(referenceGltf())), 'model/gltf+json'),
      input('knight-basecolor.png', seed.texture.bytes, 'image/png'),
      input('knight-normal.png', seed.pbrMaps.normal.bytes, 'image/png'),
      input('knight-orm.png', seed.pbrMaps.orm.bytes, 'image/png'),
      input('knight-emissive.png', seed.pbrMaps.emissive.bytes, 'image/png'),
    ]
    const profile = await buildOwnerReferenceProfile(ownerInputs)
    const calibratedConfiguration = calibrateOwnerReferenceConfiguration(configuration(), profile, 'knight')
    const specification = createAssetSpecification(calibratedConfiguration)
    const premium = generatePremiumCubeAssetBundle(specification)
    const beforeWidth = Math.max(...premium.preview.positions.filter((_, index) => index % 3 === 0)) - Math.min(...premium.preview.positions.filter((_, index) => index % 3 === 0))
    const result = applyOwnerReferenceToPremiumBundle(premium, ownerInputs, profile, 'knight')
    const afterWidth = Math.max(...result.bundle.preview.positions.filter((_, index) => index % 3 === 0)) - Math.min(...result.bundle.preview.positions.filter((_, index) => index % 3 === 0))
    const gltf = JSON.parse(result.bundle.model.content) as {
      images: Array<{ name?: string; uri?: string; extras?: { ownerManifestSha256?: string } }>
      extras?: { ownerReferenceManifestSha256?: string; ownerReferenceCalibration?: string; ownerTextureOverrides?: unknown[] }
    }

    expect(result.reference.geometryCalibrated).toBe(true)
    expect(result.reference.widthDepthScale).not.toBe(1)
    expect(afterWidth).not.toBeCloseTo(beforeWidth)
    expect(result.reference.textureOverrides).toHaveLength(4)
    expect(gltf.extras?.ownerReferenceManifestSha256).toBe(profile.manifestSha256)
    expect(gltf.extras?.ownerReferenceCalibration).toBe('HEIGHT_WIDTH_ASPECT_WITH_ONE_CELL_SAFETY_CLAMP')
    expect(gltf.extras?.ownerTextureOverrides).toHaveLength(4)
    expect(gltf.images[0].name).toContain('owner-baseColor')
    expect(gltf.images[1].name).toContain('owner-normal')
    expect(gltf.images[2].name).toContain('owner-orm')
    expect(gltf.images[3].name).toContain('owner-emissive')
    expect(gltf.images.every(image => image.uri?.startsWith('data:image/png;base64,'))).toBe(true)
    expect(result.bundle.truthBoundary).toContain('owner-selected PNG PBR map(s)')
  })
})
