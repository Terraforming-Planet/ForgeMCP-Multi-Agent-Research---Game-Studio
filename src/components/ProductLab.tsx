import { useMemo, useState, type CSSProperties } from 'react'
import earthFigurineConcept from '../assets/earth-figurine-concept.webp'
import { getResearchStationPreset, RESEARCH_STATION_PRESETS, type ResearchStationPresetId } from '../data/researchStations'
import {
  createAssetSpecification,
  prepareB2bRfq,
  prepareCodexAssetBrief,
  prepareShopifyDraft,
  runAssetQualityGate,
  shopifyCartNotConnected,
  supplierSubmissionNotConnected,
  type AssetConfiguration,
  type AssetKind,
  type BoardPreset,
  type PiecePreset,
  type ProductTestTrack,
} from '../integrations/commerce/productLab'
import { generateProceduralAssetBundle, proceduralAssetManifest, type ProceduralAssetBundle } from '../integrations/commerce/proceduralAssets'
import { StationConceptVisual } from './StationConceptVisual'
import { StatusBadge } from './StatusBadge'

const EXAMPLE_PROMPT = 'Zrób mi model 3D figurki planety Ziemia jako bajkowej postaci stojącej na szachownicy czarno-białej z podświetleniem LED zielono-niebieskim.'

type DisplayResult = Record<string, unknown> | null

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadFile(name: string, content: string | Uint8Array, mimeType: string) {
  const part: BlobPart = typeof content === 'string' ? content : Uint8Array.from(content).buffer
  const blob = new Blob([part], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ProductLab() {
  const [track, setTrack] = useState<ProductTestTrack>('cube-asset')
  const [stationId, setStationId] = useState<ResearchStationPresetId>('earth-space')
  const [assetKind, setAssetKind] = useState<AssetKind>('figurine')
  const [boardPreset, setBoardPreset] = useState<BoardPreset>('classic-mono')
  const [piecePreset, setPiecePreset] = useState<PiecePreset>('earth-guardian')
  const [material, setMaterial] = useState('Painted resin + recyclable display base')
  const [texture, setTexture] = useState('Raised continents · soft cloud relief · controlled gloss')
  const [primaryColor, setPrimaryColor] = useState('#16a7e0')
  const [secondaryColor, setSecondaryColor] = useState('#35f0a1')
  const [ledIntensity, setLedIntensity] = useState(70)
  const [scaleMm, setScaleMm] = useState(120)
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT)
  const [assistantResult, setAssistantResult] = useState<DisplayResult>(null)
  const [assistantSpecificationId, setAssistantSpecificationId] = useState<string | null>(null)
  const [assetBundle, setAssetBundle] = useState<ProceduralAssetBundle | null>(null)
  const [shopifyResult, setShopifyResult] = useState<DisplayResult>(null)
  const [shopifySpecificationId, setShopifySpecificationId] = useState<string | null>(null)
  const [rfqResult, setRfqResult] = useState<DisplayResult>(null)
  const [rfqSpecificationId, setRfqSpecificationId] = useState<string | null>(null)
  const [finalTest, setFinalTest] = useState<DisplayResult>(null)

  const station = getResearchStationPreset(stationId)
  const configuration = useMemo<AssetConfiguration>(() => ({
    track,
    stationId,
    assetKind,
    boardPreset,
    piecePreset,
    material,
    texture,
    primaryColor,
    secondaryColor,
    ledIntensity,
    scaleMm,
    prompt,
  }), [track, stationId, assetKind, boardPreset, piecePreset, material, texture, primaryColor, secondaryColor, ledIntensity, scaleMm, prompt])

  const specification = useMemo(() => createAssetSpecification(configuration), [configuration])
  const qa = useMemo(() => runAssetQualityGate(specification), [specification])
  const assetBundleIsCurrent = assetBundle?.specificationId === specification.id
  const assistantIsCurrent = assistantSpecificationId === specification.id
  const shopifyDraftIsCurrent = shopifySpecificationId === specification.id
  const rfqDraftIsCurrent = rfqSpecificationId === specification.id
  const finalTestIsCurrent = finalTest?.specificationId === specification.id

  function generateAssetFiles() {
    setAssetBundle(generateProceduralAssetBundle(specification))
  }

  function runAssistant() {
    setAssistantResult(prepareCodexAssetBrief(prompt, configuration) as unknown as DisplayResult)
    setAssistantSpecificationId(specification.id)
  }

  function buildShopifyDraft() {
    setShopifyResult(prepareShopifyDraft(specification) as unknown as DisplayResult)
    setShopifySpecificationId(specification.id)
  }

  function buildRfq() {
    setRfqResult(prepareB2bRfq(specification) as unknown as DisplayResult)
    setRfqSpecificationId(specification.id)
  }

  function runFinalTest() {
    const prerequisites = {
      configurationQaPassed: qa.status === 'PASS',
      localAssetFilesGenerated: assetBundleIsCurrent && assetBundle?.qa.result === 'GENERATOR_CHECKS_PASS',
      codexHandoffPrepared: assistantIsCurrent,
      shopifyDraftPrepared: shopifyDraftIsCurrent,
      b2bRfqDraftPrepared: rfqDraftIsCurrent,
    }
    const complete = Object.values(prerequisites).every(Boolean)
    const result = {
      status: complete ? 'PASS_WITH_EXPECTED_BLOCKS' : 'INCOMPLETE',
      checkedAt: new Date().toISOString(),
      specificationId: specification.id,
      configurationQa: qa,
      prerequisites,
      localAssetQa: assetBundleIsCurrent ? assetBundle?.qa : null,
      shopify: shopifyCartNotConnected(),
      b2bSupplier: supplierSubmissionNotConnected(),
      safety: {
        realProductCreated: false,
        paymentStarted: false,
        orderCreated: false,
        supplierContacted: false,
        humanApprovalPreserved: true,
      },
    }
    setFinalTest(result as unknown as DisplayResult)
  }

  const previewStyle = {
    '--asset-primary': specification.primaryColor,
    '--asset-secondary': specification.secondaryColor,
    '--asset-led': `${specification.ledIntensity / 100}`,
  } as CSSProperties

  return (
    <>
      <section className="card product-hero">
        <div>
          <p className="eyebrow">CREATE · CODEX ASSISTANT · SHOPIFY TEST · B2B RFQ</p>
          <h1>ForgeMCP 3D + Texture Product Lab</h1>
          <p>Turn a human idea into a versioned asset specification, generated concept preview, deterministic QA, Shopify product draft and an unsent manufacturing request.</p>
        </div>
        <div className="product-safety"><StatusBadge value="TEST MODE" /><StatusBadge value="NO PAYMENT" /><StatusBadge value="NO RFQ SENT" /></div>
        <p className="lab-error"><b>TEST MODE:</b> no live product, payment, order or supplier request is created automatically. Shopify and a verified supplier directory are not connected.</p>
      </section>

      <section className="product-track-grid" aria-label="Two main Shopify test tracks">
        <button type="button" className={track === 'cube-asset' ? 'active' : ''} onClick={() => { setTrack('cube-asset'); setAssetKind('figurine') }}>
          <span>TEST 01</span><b>Cube Asset Test</b><small>Figurine · board · texture pack · Game Studio QA</small>
        </button>
        <button type="button" className={track === 'terra-station' ? 'active' : ''} onClick={() => { setTrack('terra-station'); setAssetKind('station-shell') }}>
          <span>TEST 02</span><b>Terra Station Test</b><small>Research-station shell · materials · engineering RFQ</small>
        </button>
      </section>

      <section className="product-workbench">
        <div className="card product-controls">
          <p className="eyebrow">ASSET CONFIGURATOR</p>
          <h2>1. Configure the concept</h2>
          <label>Research-station design system
            <select value={stationId} onChange={event => setStationId(event.target.value as ResearchStationPresetId)}>{RESEARCH_STATION_PRESETS.map(item => <option value={item.id} key={item.id}>{item.name} · {item.subtitle}</option>)}</select>
          </label>
          <label>Asset type
            <select value={assetKind} onChange={event => setAssetKind(event.target.value as AssetKind)}>
              <option value="figurine">3D figurine concept</option>
              <option value="board">Chessboard concept</option>
              <option value="texture-pack">Texture pack specification</option>
              <option value="station-shell">Research-station shell concept</option>
            </select>
          </label>
          <label>Board
            <select value={boardPreset} onChange={event => setBoardPreset(event.target.value as BoardPreset)}>
              <option value="cube-512">Cube Chess 512</option><option value="classic-mono">Classic Black &amp; White</option><option value="lab-ledcolor">Lab LEDColor</option>
            </select>
          </label>
          <label>Piece family
            <select value={piecePreset} onChange={event => setPiecePreset(event.target.value as PiecePreset)}>
              <option value="earth-guardian">Earth Guardian</option><option value="czech-facet">Czech Facet</option><option value="classic">Classic</option><option value="lab-ledcolor">Lab LEDColor</option>
            </select>
          </label>
          <label>Material<input value={material} onChange={event => setMaterial(event.target.value)} /></label>
          <label>Texture brief<textarea rows={3} value={texture} onChange={event => setTexture(event.target.value)} /></label>
          <div className="product-color-grid">
            <label>Primary LED<input aria-label="Primary LED colour" type="color" value={primaryColor} onChange={event => setPrimaryColor(event.target.value)} /></label>
            <label>Secondary LED<input aria-label="Secondary LED colour" type="color" value={secondaryColor} onChange={event => setSecondaryColor(event.target.value)} /></label>
          </div>
          <label>LED intensity <output>{ledIntensity}%</output><input aria-label="Product LED intensity" type="range" min="0" max="100" value={ledIntensity} onChange={event => setLedIntensity(Number(event.target.value))} /></label>
          <label>Target height / width <output>{scaleMm} mm</output><input aria-label="Target size" type="range" min="20" max="500" value={scaleMm} onChange={event => setScaleMm(Number(event.target.value))} /></label>
        </div>

        <div className="card product-preview" style={previewStyle}>
          <div className="lab-section-title"><div><p className="eyebrow">VISUAL CONCEPT + LOCAL ASSET EXPORT</p><h2>{station.name} · {assetKind}</h2></div><StatusBadge value={assetBundleIsCurrent ? 'GLTF READY' : assetBundle ? 'REGENERATE REQUIRED' : 'CONCEPT'} /></div>
          {track === 'cube-asset' && piecePreset === 'earth-guardian'
            ? <img src={earthFigurineConcept} alt="AI-generated Earth figurine concept on a black-and-white board with green and blue LEDs; not a manufactured product or 3D model file" />
            : <StationConceptVisual station={station} />}
          <div className="preview-swatches"><i /><i /><span>{material}</span></div>
          <p className="lab-note"><b>Generated image:</b> visual direction only. The exporter below creates a real low-poly glTF prototype with embedded 128×128 PNG texture; it is not a sculpted GLB/STL, PBR archive or manufacturing proof.</p>
          <div className="asset-export-panel">
            <button type="button" className="lab-primary" onClick={generateAssetFiles}>Generate procedural glTF + PNG</button>
            {assetBundle ? assetBundleIsCurrent ? <>
              <StatusBadge value="LOCAL FILES READY" />
              <p><b>{assetBundle.metrics.vertices}</b> vertices · <b>{assetBundle.metrics.triangles}</b> triangles · self-contained texture</p>
              <div className="toolbar">
                <button type="button" onClick={() => downloadFile(assetBundle.model.filename, assetBundle.model.content, assetBundle.model.mimeType)}>Download .gltf model</button>
                <button type="button" onClick={() => downloadFile(assetBundle.texture.filename, assetBundle.texture.bytes, assetBundle.texture.mimeType)}>Download .png texture</button>
                <button type="button" onClick={() => downloadJson(`${assetBundle.specificationId}-manifest.json`, proceduralAssetManifest(assetBundle))}>Download QA manifest</button>
              </div>
              <small>{assetBundle.truthBoundary}</small>
            </> : <p className="lab-error">The configuration changed. Generate the files again so the model, texture and specification stay linked.</p> : null}
          </div>
        </div>
      </section>

      <section className="card codex-assistant">
        <div className="lab-section-title"><div><p className="eyebrow">FORGEMCP ASSISTANT + CODEX AGENT</p><h2>2. Prepare a build-ready agent brief</h2></div><StatusBadge value={assistantIsCurrent ? 'BRIEF READY' : assistantResult ? 'REGENERATE REQUIRED' : 'WAITING FOR HUMAN'} /></div>
        <div className="assistant-flow" aria-label="Assistant workflow"><span>Human prompt</span><b>→</b><span>ForgeMCP assistant</span><b>→</b><span>Codex agent brief</span><b>→</b><span>QA</span><b>→</b><span>Human approval</span></div>
        <label>Example prompt
          <textarea rows={4} value={prompt} onChange={event => setPrompt(event.target.value)} />
        </label>
        <div className="toolbar">
          <button type="button" className="lab-primary" onClick={runAssistant}>Assistant: prepare Codex brief</button>
          <button type="button" onClick={() => downloadJson(`${specification.id}.json`, assistantResult ?? prepareCodexAssetBrief(prompt, configuration))}>Export agent brief JSON</button>
        </div>
        {assistantResult ? <div className="assistant-result"><h3>Agent plan ready — execution not started</h3><pre>{JSON.stringify(assistantResult, null, 2)}</pre></div> : null}
      </section>

      <section className="grid two product-handoffs">
        <article className="card">
          <p className="eyebrow">SHOPIFY TEST</p><h2>3. Local product mapping brief</h2>
          <p>Prepare title, description, tags and specification reference for later Shopify field mapping. This is not a ProductCreateInput; it remains unpublished and cannot be purchased until a real store and variant are connected.</p>
          <button type="button" onClick={buildShopifyDraft}>Prepare local Shopify mapping draft</button>
          {shopifyResult ? <><StatusBadge value={shopifyDraftIsCurrent ? 'SHOPIFY NOT CONNECTED' : 'DRAFT OUTDATED'} /><pre>{JSON.stringify(shopifyResult, null, 2)}</pre></> : null}
          <button type="button" disabled>Buy in Shopify · connection required</button>
        </article>
        <article className="card">
          <p className="eyebrow">B2B MANUFACTURING TEST</p><h2>4. Request for quotation</h2>
          <p>Shopify B2B manages known companies; it does not discover manufacturers. This lab prepares an RFQ, while supplier discovery stays explicitly unconnected.</p>
          <button type="button" onClick={buildRfq}>Prepare unsent B2B RFQ</button>
          {rfqResult ? <><StatusBadge value={rfqDraftIsCurrent ? 'RFQ NOT SENT' : 'DRAFT OUTDATED'} /><pre>{JSON.stringify(rfqResult, null, 2)}</pre></> : null}
          <button type="button" disabled>Send to verified supplier · connection required</button>
        </article>
      </section>

      <section className="card final-test-window">
        <div className="lab-section-title"><div><p className="eyebrow">FINAL SAFETY WINDOW</p><h2>5. Run the end-to-end test without buying or sending</h2></div><StatusBadge value={finalTest ? finalTestIsCurrent && typeof finalTest.status === 'string' ? finalTest.status : 'RERUN REQUIRED' : qa.status} /></div>
        <p>PASS requires current model/texture data, generator QA, Codex brief, Shopify mapping draft and B2B RFQ draft. Payment, order and supplier submission must remain blocked.</p>
        <button type="button" className="lab-primary" onClick={runFinalTest}>Run final test window</button>
        {finalTest ? <pre>{JSON.stringify(finalTest, null, 2)}</pre> : null}
      </section>
    </>
  )
}
