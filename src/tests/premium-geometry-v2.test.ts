import { describe, expect, it } from 'vitest'
import { createAssetSpecification, type AssetConfiguration } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'
import { generatePremiumCubeAssetBundle } from '../integrations/cube/premiumGeometryV2'

function configuration(prompt: string, piecePreset: AssetConfiguration['piecePreset']): AssetConfiguration {
  return {
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'figurine',
    boardPreset: 'lab-ledcolor',
    piecePreset,
    material: 'Premium PBR test',
    texture: 'BaseColor Normal ORM Emissive',
    primaryColor: '#252b36',
    secondaryColor: '#56ddff',
    ledIntensity: 60,
    scaleMm: 110,
    prompt,
  }
}

describe('training-driven Cube Premium geometry V2', () => {
  it('creates a substantially denser, semantically separated knight than the fallback generator', () => {
    const specification = createAssetSpecification(configuration('Premium knight horse with anatomical face and crayon mane', 'lab-ledcolor'))
    const fallback = generateProceduralAssetBundle(specification)
    const premium = generatePremiumCubeAssetBundle(specification)

    expect(premium.trainingProfile).toBe('OWNER_AUTHORIZED_PREMIUM_FULL_GAME_V3')
    expect(premium.pieceRole).toBe('knight')
    expect(premium.metrics.triangles).toBeGreaterThan(fallback.metrics.triangles * 2)
    expect(premium.semanticParts.map(part => part.name)).toEqual(expect.arrayContaining([
      'knight-base-chest',
      'knight-s-neck',
      'knight-head-face',
      'knight-ears',
      'knight-crayon-mane',
    ]))
    expect(premium.qa.result).toBe('GENERATOR_CHECKS_PASS')
  })

  it('embeds a real four-map PBR material in the exported glTF', () => {
    const specification = createAssetSpecification(configuration('Premium queen with deep crown', 'czech-facet'))
    const premium = generatePremiumCubeAssetBundle(specification)
    const gltf = JSON.parse(premium.model.content) as {
      images: unknown[]
      textures: unknown[]
      materials: Array<{
        pbrMetallicRoughness?: { baseColorTexture?: unknown; metallicRoughnessTexture?: unknown }
        normalTexture?: unknown
        occlusionTexture?: unknown
        emissiveTexture?: unknown
      }>
      extras: { ownerTrainingProfile?: string; trainingRulesApplied?: string[] }
    }

    expect(gltf.images).toHaveLength(4)
    expect(gltf.textures).toHaveLength(4)
    expect(gltf.materials[0].pbrMetallicRoughness?.baseColorTexture).toBeTruthy()
    expect(gltf.materials[0].pbrMetallicRoughness?.metallicRoughnessTexture).toBeTruthy()
    expect(gltf.materials[0].normalTexture).toBeTruthy()
    expect(gltf.materials[0].occlusionTexture).toBeTruthy()
    expect(gltf.materials[0].emissiveTexture).toBeTruthy()
    expect(gltf.extras.ownerTrainingProfile).toBe('premium-full-game-v3')
    expect(gltf.extras.trainingRulesApplied).toContain('recognizable chess silhouette')
    expect(premium.pbrMaps.normal.bytes.length).toBeGreaterThan(100)
    expect(premium.pbrMaps.orm.bytes.length).toBeGreaterThan(100)
    expect(premium.pbrMaps.emissive.bytes.length).toBeGreaterThan(100)
    expect(premium.qa.result).toBe('GENERATOR_CHECKS_PASS')
  })

  it.each([
    ['king', 'Premium king', 'czech-facet'],
    ['queen', 'Premium queen hetman', 'czech-facet'],
    ['bishop', 'Premium bishop goniec', 'czech-facet'],
    ['rook', 'Premium rook wieża', 'czech-facet'],
    ['knight', 'Premium knight horse', 'lab-ledcolor'],
    ['pawn', 'Premium pawn pion', 'classic'],
  ] as const)('keeps %s recognizable as a supported semantic role', (role, prompt, preset) => {
    const premium = generatePremiumCubeAssetBundle(createAssetSpecification(configuration(prompt, preset)))
    expect(premium.pieceRole).toBe(role)
    expect(premium.metrics.vertices).toBeGreaterThan(500)
    expect(premium.semanticParts.length).toBeGreaterThanOrEqual(role === 'pawn' ? 1 : 2)
    expect(premium.qa.result).toBe('GENERATOR_CHECKS_PASS')
  })
})
