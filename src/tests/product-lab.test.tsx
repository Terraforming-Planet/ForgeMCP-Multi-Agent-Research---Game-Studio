import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import {
  createAssetSpecification,
  prepareB2bRfq,
  prepareShopifyDraft,
  shopifyCartNotConnected,
  supplierSubmissionNotConnected,
  type AssetConfiguration,
} from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle, proceduralAssetManifest, selectProceduralPreset } from '../integrations/commerce/proceduralAssets'

const configuration: AssetConfiguration = {
  track: 'cube-asset',
  stationId: 'earth-space',
  assetKind: 'figurine',
  boardPreset: 'classic-mono',
  piecePreset: 'earth-guardian',
  material: 'painted resin',
  texture: 'raised continents and cloud relief',
  primaryColor: '#16a7e0',
  secondaryColor: '#35f0a1',
  ledIntensity: 70,
  scaleMm: 120,
  prompt: 'Create a fairy-tale Earth figurine on a black-and-white LED chessboard.',
}

describe('3D and Shopify test lab', () => {
  it('shows two project tracks and prepares the Codex handoff without claiming execution', () => {
    render(<MemoryRouter initialEntries={['/shop-lab']}><App /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /TEST 01.*Cube Asset Test/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /TEST 02.*Terra Station Test/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Generate and show 3D model + texture' }))
    expect(screen.getByRole('img', { name: /Rotating semantic preview of Earth Guardian character/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download .gltf model' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Assistant: prepare Codex brief' }))
    expect(screen.getByText('Agent plan ready — execution not started')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run final test window' }))
    expect(screen.getAllByText(/INCOMPLETE/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare local Shopify mapping draft' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare unsent B2B RFQ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run final test window' }))
    expect(screen.getAllByText(/PASS_WITH_EXPECTED_BLOCKS/).length).toBeGreaterThan(0)
  })

  it('keeps Shopify purchase and supplier submission blocked', () => {
    const specification = createAssetSpecification(configuration)
    expect(prepareShopifyDraft(specification)).toMatchObject({ status: 'SHOPIFY_NOT_CONNECTED', published: false, purchasable: false })
    expect(prepareB2bRfq(specification)).toMatchObject({ status: 'RFQ_DRAFT_NOT_SENT', sent: false })
    expect(shopifyCartNotConnected()).toMatchObject({ state: 'NOT_CONNECTED', cartCreated: false, orderCreated: false })
    expect(supplierSubmissionNotConnected()).toMatchObject({ state: 'NOT_CONNECTED', rfqSent: false })
  })

  it('generates a real self-contained glTF prototype and PNG texture without claiming manufacturing readiness', () => {
    const bundle = generateProceduralAssetBundle(createAssetSpecification(configuration))
    const gltf = JSON.parse(bundle.model.content) as {
      asset: { version: string }
      accessors: Array<{ max?: number[] }>
      buffers: Array<{ uri: string }>
      images: Array<{ uri: string; extras: { fingerprint: string; pattern: string } }>
      extras: {
        sourceScaleMm: number
        units: string
        proceduralPreset: string
        geometryFingerprint: string
        textureFingerprint: string
        texturePattern: string
        semanticParts: Array<{ name: string; role: string; vertexStart: number; vertexCount: number; indexStart: number; indexCount: number }>
        renderSource: string
      }
    }
    expect(gltf.asset.version).toBe('2.0')
    expect(gltf.buffers[0].uri.startsWith('data:application/octet-stream;base64,')).toBe(true)
    expect(gltf.images[0].uri.startsWith('data:image/png;base64,')).toBe(true)
    expect(Math.max(...(gltf.accessors[0].max ?? []))).toBeLessThan(1)
    expect(gltf.extras).toMatchObject({ sourceScaleMm: 120, units: 'metres' })
    expect(gltf.extras).toMatchObject({ proceduralPreset: 'earth-guardian', geometryFingerprint: bundle.geometryFingerprint, renderSource: bundle.renderSource })
    expect(gltf.extras.textureFingerprint).toBe(bundle.textureFingerprint)
    expect(gltf.extras.texturePattern).toBe('earth-contours-clouds')
    expect(gltf.extras.semanticParts).toEqual(bundle.semanticParts)
    expect(gltf.images[0].extras).toEqual({ fingerprint: bundle.texture.fingerprint, pattern: bundle.texture.pattern })
    expect(bundle.preview.texcoords).toHaveLength((bundle.preview.positions.length / 3) * 2)
    expect(Array.from(bundle.texture.bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(proceduralAssetManifest(bundle)).toMatchObject({
      assetContentGeneratedInMemory: true,
      downloadReady: true,
      filePersisted: false,
      manufacturingReady: false,
      textureFingerprint: bundle.textureFingerprint,
      semanticParts: bundle.semanticParts,
      qa: { result: 'GENERATOR_CHECKS_PASS' },
    })
  })

  it('resolves the Earth prompt as a figurine even when the board is mentioned as context', () => {
    const specification = createAssetSpecification(configuration)
    expect(selectProceduralPreset(specification)).toEqual({ preset: 'earth-guardian', promptMatched: true })
  })

  it('creates visibly different deterministic geometry for added pieces and all four station shells', () => {
    const pieceCases = [
      { prompt: 'Create a faceted chess king.', piecePreset: 'czech-facet' as const, expected: 'facet-king' },
      { prompt: 'Create a faceted chess queen.', piecePreset: 'czech-facet' as const, expected: 'facet-queen' },
      { prompt: 'Create a faceted chess bishop.', piecePreset: 'czech-facet' as const, expected: 'facet-bishop' },
      { prompt: 'Create a blue chess rook.', piecePreset: 'czech-facet' as const, expected: 'facet-rook' },
      { prompt: 'Create a crayon knight chess figure.', piecePreset: 'lab-ledcolor' as const, expected: 'crayon-knight' },
      { prompt: 'Create a classic pawn chess figure.', piecePreset: 'classic' as const, expected: 'classic-pawn' },
      { prompt: 'Create a fairy-tale Earth guardian figurine.', piecePreset: 'earth-guardian' as const, expected: 'earth-guardian' },
    ]
    const pieceBundles = pieceCases.map(item => generateProceduralAssetBundle(createAssetSpecification({ ...configuration, prompt: item.prompt, piecePreset: item.piecePreset })))
    expect(pieceBundles.map(bundle => bundle.preview.preset)).toEqual(pieceCases.map(item => item.expected))
    expect(new Set(pieceBundles.map(bundle => bundle.geometryFingerprint)).size).toBe(pieceCases.length)
    expect(new Set(pieceBundles.map(bundle => bundle.textureFingerprint)).size).toBe(pieceCases.length)
    expect(pieceBundles.every(bundle => bundle.semanticParts.length >= 2)).toBe(true)
    expect(pieceBundles.every(bundle => bundle.qa.result === 'GENERATOR_CHECKS_PASS')).toBe(true)

    const stationIds = ['arctic', 'sahara', 'ocean', 'earth-space'] as const
    const stationBundles = stationIds.map(stationId => generateProceduralAssetBundle(createAssetSpecification({
      ...configuration,
      track: 'terra-station',
      stationId,
      assetKind: 'station-shell',
      prompt: `Generate research station ${stationId}`,
    })))
    expect(stationBundles.every(bundle => bundle.qa.result === 'GENERATOR_CHECKS_PASS')).toBe(true)
    expect(new Set(stationBundles.map(bundle => bundle.geometryFingerprint)).size).toBe(4)
    expect(new Set(stationBundles.map(bundle => bundle.textureFingerprint)).size).toBe(4)
    expect(stationBundles.map(bundle => bundle.texture.pattern)).toEqual([
      'arctic-cryo-instruments',
      'sahara-strata-flow',
      'ocean-bathymetry-sonar',
      'earth-space-orbital-grid',
    ])
    expect(stationBundles.map(bundle => bundle.semanticParts.map(part => part.name))).toEqual([
      expect.arrayContaining(['ice-reference-platform', 'gnss-lidar-array', 'under-ice-sensor-string']),
      expect.arrayContaining(['dem-terrain-diorama', 'd8-paleochannel-overlay', 'field-reference-mast']),
      expect.arrayContaining(['bathymetry-cutaway', 'survey-buoy', 'auv-multibeam-node']),
      expect.arrayContaining(['earth-jpl-reference', 'analysis-grid-512', 'observation-vector-node']),
    ])
    expect(stationBundles.slice(0, 3).every(bundle => bundle.semanticParts.some(part => part.role.includes('current-software'))
      && bundle.semanticParts.some(part => part.role.includes('proposed-field')))).toBe(true)
    expect(stationBundles[3].semanticParts.some(part => part.role.includes('not-physical'))).toBe(true)
    expect(stationBundles.every(bundle => bundle.metrics.vertices > 500 && bundle.metrics.vertices < 25_000)).toBe(true)

    const repeated = generateProceduralAssetBundle(createAssetSpecification({
      ...configuration,
      track: 'terra-station',
      stationId: 'ocean',
      assetKind: 'station-shell',
      prompt: 'Generate research station ocean',
    }))
    expect(repeated.geometryFingerprint).toBe(stationBundles[2].geometryFingerprint)
    expect(repeated.textureFingerprint).toBe(stationBundles[2].textureFingerprint)
  })

  it('builds three visibly and texturally distinct board examples including all 512 Cube fields', () => {
    const boards = (['cube-512', 'classic-mono', 'lab-ledcolor'] as const).map(boardPreset => generateProceduralAssetBundle(createAssetSpecification({
      ...configuration,
      assetKind: 'board',
      boardPreset,
      prompt: `Generate ${boardPreset} chessboard`,
      scaleMm: 500,
    })))

    expect(boards.map(bundle => bundle.preview.label)).toEqual([
      'Cube Chess 512 eight-level board',
      'Classic black-and-white board',
      'Lab LEDColor chessboard',
    ])
    expect(boards.map(bundle => bundle.texture.pattern)).toEqual([
      'cube-512-level-grid',
      'classic-checker-stone',
      'checker-led-grid',
    ])
    expect(boards[0].semanticParts).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'cube-512-support-frame' }),
      expect.objectContaining({ name: 'cube-512-levels' }),
    ]))
    expect(boards[0].metrics.vertices).toBeGreaterThan(12_000)
    expect(new Set(boards.map(bundle => bundle.geometryFingerprint)).size).toBe(3)
    expect(new Set(boards.map(bundle => bundle.textureFingerprint)).size).toBe(3)
    expect(boards.every(bundle => bundle.qa.result === 'GENERATOR_CHECKS_PASS')).toBe(true)
  })
})
