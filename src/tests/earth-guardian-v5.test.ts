import { describe, expect, it } from 'vitest'
import { createAssetSpecification } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'
import { repairEarthGuardianBundle } from '../integrations/terra/earthGuardianUpgrade'

function guardianBundle() {
  const specification = createAssetSpecification({
    track: 'cube-asset',
    stationId: 'earth-space',
    assetKind: 'figurine',
    boardPreset: 'classic-mono',
    piecePreset: 'earth-guardian',
    material: 'Painted resin + recyclable display base',
    texture: 'Raised continents · soft cloud relief · controlled gloss',
    primaryColor: '#16a7e0',
    secondaryColor: '#35f0a1',
    ledIntensity: 70,
    scaleMm: 120,
    prompt: 'Earth Guardian with readable eyes, raised continents, gloves and boots',
  })
  return repairEarthGuardianBundle(generateProceduralAssetBundle(specification))
}

describe('Earth Guardian V5 material repair', () => {
  it('splits the historical globe/eye semantic group into dedicated face materials', () => {
    const bundle = guardianBundle()
    const names = bundle.semanticParts.map(part => part.name)
    expect(names).toContain('earth-globe-body')
    expect(names).toContain('guardian-eye-whites')
    expect(names).toContain('guardian-pupils')
    expect(names).not.toContain('earth-character-body')
  })

  it('exports eye whites and pupils without the Earth texture', () => {
    const bundle = guardianBundle()
    const gltf = JSON.parse(bundle.model.content) as {
      materials: Array<{ name?: string; pbrMetallicRoughness?: { baseColorTexture?: unknown; baseColorFactor?: number[] } }>
      meshes: Array<{ primitives: Array<{ material: number; extras: { semanticPart: string } }> }>
    }
    const primitiveByPart = new Map(gltf.meshes[0].primitives.map(primitive => [primitive.extras.semanticPart, primitive]))
    const eyeMaterial = gltf.materials[primitiveByPart.get('guardian-eye-whites')!.material]
    const pupilMaterial = gltf.materials[primitiveByPart.get('guardian-pupils')!.material]
    expect(eyeMaterial.name).toBe('guardian-eye-white')
    expect(eyeMaterial.pbrMetallicRoughness?.baseColorTexture).toBeUndefined()
    expect(pupilMaterial.name).toBe('guardian-pupil-dark')
    expect(pupilMaterial.pbrMetallicRoughness?.baseColorTexture).toBeUndefined()
    expect(bundle.truthBoundary).toContain('Eye whites and pupils use dedicated non-Earth PBR materials')
  })
})
