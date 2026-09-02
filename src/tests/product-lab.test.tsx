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
    expect(screen.getByRole('img', { name: /Rotating live preview of Earth Guardian character/i })).toBeTruthy()
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
    const gltf = JSON.parse(bundle.model.content) as { asset: { version: string }; accessors: Array<{ max?: number[] }>; buffers: Array<{ uri: string }>; images: Array<{ uri: string }>; extras: { sourceScaleMm: number; units: string; proceduralPreset: string; geometryFingerprint: string; renderSource: string } }
    expect(gltf.asset.version).toBe('2.0')
    expect(gltf.buffers[0].uri.startsWith('data:application/octet-stream;base64,')).toBe(true)
    expect(gltf.images[0].uri.startsWith('data:image/png;base64,')).toBe(true)
    expect(Math.max(...(gltf.accessors[0].max ?? []))).toBeLessThan(1)
    expect(gltf.extras).toMatchObject({ sourceScaleMm: 120, units: 'metres' })
    expect(gltf.extras).toMatchObject({ proceduralPreset: 'earth-guardian', geometryFingerprint: bundle.geometryFingerprint, renderSource: bundle.renderSource })
    expect(Array.from(bundle.texture.bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(proceduralAssetManifest(bundle)).toMatchObject({ assetContentGeneratedInMemory: true, downloadReady: true, filePersisted: false, manufacturingReady: false, qa: { result: 'GENERATOR_CHECKS_PASS' } })
  })

  it('resolves the Earth prompt as a figurine even when the board is mentioned as context', () => {
    const specification = createAssetSpecification(configuration)
    expect(selectProceduralPreset(specification)).toEqual({ preset: 'earth-guardian', promptMatched: true })
  })

  it('creates visibly different deterministic geometry for added pieces and all four station shells', () => {
    const pieceCases = [
      { prompt: 'Create a blue chess rook.', piecePreset: 'czech-facet' as const, expected: 'facet-rook' },
      { prompt: 'Create a crayon knight chess figure.', piecePreset: 'lab-ledcolor' as const, expected: 'crayon-knight' },
      { prompt: 'Create a classic pawn chess figure.', piecePreset: 'classic' as const, expected: 'classic-pawn' },
    ]
    const pieceBundles = pieceCases.map(item => generateProceduralAssetBundle(createAssetSpecification({ ...configuration, prompt: item.prompt, piecePreset: item.piecePreset })))
    expect(pieceBundles.map(bundle => bundle.preview.preset)).toEqual(pieceCases.map(item => item.expected))
    expect(new Set(pieceBundles.map(bundle => bundle.geometryFingerprint)).size).toBe(pieceCases.length)

    const stationBundles = (['arctic', 'sahara', 'ocean', 'earth-space'] as const).map(stationId => generateProceduralAssetBundle(createAssetSpecification({
      ...configuration,
      track: 'terra-station',
      stationId,
      assetKind: 'station-shell',
      prompt: `Generate research station ${stationId}`,
    })))
    expect(stationBundles.every(bundle => bundle.qa.result === 'GENERATOR_CHECKS_PASS')).toBe(true)
    expect(new Set(stationBundles.map(bundle => bundle.geometryFingerprint)).size).toBe(4)
  })
})
