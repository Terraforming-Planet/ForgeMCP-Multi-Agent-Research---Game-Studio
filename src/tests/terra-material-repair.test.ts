import { describe, expect, it } from 'vitest'
import { createAssetSpecification, type AssetConfiguration } from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'
import { generateSaharaExcavatorBundle } from '../integrations/terra/saharaExcavatorAsset'
import { repairTerraMaterials, type TerraMaterialProfile } from '../integrations/terra/terraMaterialRepair'

function stationConfiguration(stationId: AssetConfiguration['stationId'], prompt: string): AssetConfiguration {
  return {
    track: 'terra-station',
    stationId,
    assetKind: 'station-shell',
    boardPreset: 'lab-ledcolor',
    piecePreset: 'earth-guardian',
    material: 'test material',
    texture: 'test texture',
    primaryColor: stationId === 'arctic' ? '#75efff' : stationId === 'ocean' ? '#3fffd1' : stationId === 'sahara' ? '#ffc767' : '#a77bff',
    secondaryColor: '#dffbff',
    ledIntensity: 50,
    scaleMm: 500,
    prompt,
  }
}

function gltfMaterials(profile: TerraMaterialProfile, configuration: AssetConfiguration) {
  const specification = createAssetSpecification(configuration)
  const repaired = repairTerraMaterials(generateProceduralAssetBundle(specification), profile)
  return { repaired, gltf: JSON.parse(repaired.model.content) as any }
}

describe('Terra semantic material repair', () => {
  it('separates Arctic ice from brushed steel equipment', () => {
    const { repaired, gltf } = gltfMaterials('arctic', stationConfiguration('arctic', 'Create Arctic research station laboratory'))
    const names = gltf.materials.map((material: any) => material.name)

    expect(names).toContain('arctic-ice')
    expect(names).toContain('arctic-brushed-steel')
    expect(gltf.meshes[0].primitives.length).toBe(repaired.semanticParts.length)
    expect(gltf.images.some((image: any) => image.name === 'terra-ice-surface')).toBe(true)
    expect(gltf.images.some((image: any) => image.name === 'terra-brushed-steel')).toBe(true)
    expect(gltf.extras.truthBoundary).toContain('not satellite evidence')
  })

  it('separates Ocean water/bathymetry from marine steel instruments', () => {
    const { gltf } = gltfMaterials('ocean', stationConfiguration('ocean', 'Create Ocean research station laboratory'))
    const names = gltf.materials.map((material: any) => material.name)

    expect(names).toContain('ocean-water')
    expect(names).toContain('ocean-bathymetry')
    expect(names).toContain('ocean-marine-steel')
    const water = gltf.materials.find((material: any) => material.name === 'ocean-water')
    expect(water.alphaMode).toBe('BLEND')
    expect(water.pbrMetallicRoughness.metallicFactor).toBe(0)
  })

  it('keeps the Earth body visually separate from orbital metal/grid materials', () => {
    const { gltf } = gltfMaterials('earth-space', stationConfiguration('earth-space', 'Create Earth Space research station laboratory'))
    const names = gltf.materials.map((material: any) => material.name)

    expect(names).toContain('earth-space-earth')
    expect(names).toContain('earth-space-analysis-grid')
    expect(names).toContain('earth-space-obsidian-alloy')
    expect(gltf.images.some((image: any) => image.name === 'terra-earth-surface')).toBe(true)
  })

  it('gives Earth Guardian an Earth body, cloud, land-relief and metal-base material split', () => {
    const specification = createAssetSpecification({
      track: 'cube-asset',
      stationId: 'earth-space',
      assetKind: 'figurine',
      boardPreset: 'lab-ledcolor',
      piecePreset: 'earth-guardian',
      material: 'painted resin',
      texture: 'Earth continents and clouds',
      primaryColor: '#16a7e0',
      secondaryColor: '#35f0a1',
      ledIntensity: 65,
      scaleMm: 120,
      prompt: 'Zaprojektuj Strażnika Ziemi jako planetę Earth z kontynentami i chmurami.',
    })
    const repaired = repairTerraMaterials(generateProceduralAssetBundle(specification), 'earth-guardian')
    const gltf = JSON.parse(repaired.model.content) as any
    const names = gltf.materials.map((material: any) => material.name)

    expect(names).toEqual(expect.arrayContaining([
      'guardian-earth-body',
      'guardian-land-relief',
      'guardian-clouds',
      'guardian-display-steel',
    ]))
    expect(gltf.meshes[0].primitives.length).toBe(repaired.semanticParts.length)
  })

  it('exports Sahara excavator with steel tracks/bucket, smoked cab glass and construction-yellow body', () => {
    const specification = createAssetSpecification(stationConfiguration('sahara', 'Tracked Sahara terrain excavator with cab tracks boom stick hydraulic joints and bucket'))
    const excavator = repairTerraMaterials(generateSaharaExcavatorBundle(specification), 'sahara-excavator')
    const gltf = JSON.parse(excavator.model.content) as any
    const names = gltf.materials.map((material: any) => material.name)

    expect(excavator.qa.result).toBe('GENERATOR_CHECKS_PASS')
    expect(names).toContain('excavator-weathered-steel')
    expect(names).toContain('excavator-smoked-glass')
    expect(names).toContain('excavator-construction-yellow')
    expect(gltf.meshes[0].primitives.length).toBe(excavator.semanticParts.length)
  })
})
