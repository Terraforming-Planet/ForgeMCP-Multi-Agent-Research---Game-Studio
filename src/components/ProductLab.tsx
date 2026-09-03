import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
import { repairEarthGuardianBundle } from '../integrations/terra/earthGuardianUpgrade'
import { repairTerraMaterials } from '../integrations/terra/terraMaterialRepair'
import { StationConceptVisual } from './StationConceptVisual'
import { StatusBadge } from './StatusBadge'
import { ProceduralAssetViewer } from './ProceduralAssetViewer'

const EXAMPLE_PROMPT = 'Zrób mi model 3D figurki planety Ziemia jako przyjaznej bajkowej postaci stojącej na klasycznej czarno-białej szachownicy z zielono-niebieskim podświetleniem LED. Dodaj czytelne oczy, uśmiech, wypukłe kontynenty, rękawiczki, stabilne buty i okrągłą podstawę. Zachowaj rozpoznawalną sylwetkę z góry i pod kątem 3/4.'

const CODEX_PIECE_COMMAND = `Zaprojektuj spójny komplet sześciu czytelnych figur szachowych: król, hetman, wieża, goniec, koń i pion. Zachowaj klasyczne sylwetki rozpoznawalne z widoku 3/4 i z góry, stabilną okrągłą podstawę, wspólną skalę, środek w (0,0,0), oś Y w górę i bezpieczny odstęp od pola. Styl: nowoczesny czeski kubizm, kontrolowane fasety, delikatne wytłoczenia i zielono-niebieskie strefy LED. Koń ma mieć jednoznaczny profil: pysk, uszy, łuk szyi i centralną wielobarwną grzywę — bez anten. Przygotuj niepokrywające się UV dla unikalnych części, PBR baseColor/roughness/metalness/emissive, wariant jasny i ciemny, LOD0/LOD1/LOD2 oraz GLB. Użyj wyłącznie naszych zasobów z manifestem własności. Wygeneruj arkusz podglądów, liczbę wierzchołków/trójkątów, SHA-256 i raport QA: skala, bounds, normals, UV, materiały, brak NaN i brak indeksów poza zakresem. Nie nazywaj modelu produkcyjnym, dopóki QA i człowiek go nie zaakceptują.`

const CODEX_STATION_COMMAND = `Zbuduj cztery rozpoznawalne i funkcjonalnie różne stacje LOD: Arctic — kopuła, maszt GNSS/meteo oraz moduł lodu, CTD, ADCP i sonaru; Sahara — moduł geologiczno-hydrologiczny, GPR, panele PV i wieża; Ocean — stabilna platforma z pływakami, CTD/ADCP/sonarem, anteną i miejscem AUV; Earth–Space — kopuła optyczna, tracker, antena i skrzydła PV. Każdy przyrząd ma mieć nazwę funkcji w manifeście, osobną strefę materiałową i czytelną sylwetkę. Nie dodawaj fikcyjnych zdolności ani informacji o działającej fizycznej stacji. Dostarcz GLB, PBR, UV, emissive LED, LOD0/LOD1/LOD2, mobilny podgląd, bounds/normal/UV QA i manifest pochodzenia.`

type GeneratorExample = {
  id: string
  label: string
  prompt: string
  assetKind: AssetKind
  piecePreset?: PiecePreset
  stationId?: ResearchStationPresetId
  boardPreset?: BoardPreset
  primaryColor?: string
  secondaryColor?: string
}

const GENERATOR_EXAMPLES: GeneratorExample[] = [
  { id: 'earth', label: '🌍 Earth Guardian', prompt: EXAMPLE_PROMPT, assetKind: 'figurine', piecePreset: 'earth-guardian', stationId: 'earth-space', boardPreset: 'classic-mono', primaryColor: '#16a7e0', secondaryColor: '#35f0a1' },
  { id: 'rook', label: '♜ Facet rook', prompt: 'Wygeneruj futurystyczną, fasetowaną wieżę szachową ForgeMCP z niebieskim światłem LED.', assetKind: 'figurine', piecePreset: 'czech-facet', primaryColor: '#6f8cff', secondaryColor: '#5de4ff' },
  { id: 'knight', label: '♞ Crayon knight', prompt: 'Wygeneruj niskopoligonowego konia szachowego Crayon Cathedral z wyraźnym pyskiem, uszami, łukiem szyi i centralną wielobarwną grzywą — bez anten.', assetKind: 'figurine', piecePreset: 'lab-ledcolor', primaryColor: '#ffb547', secondaryColor: '#ff54d8' },
  { id: 'pawn', label: '♟ Classic pawn', prompt: 'Wygeneruj klasyczny pionek szachowy jako czysty model low-poly do podglądu.', assetKind: 'figurine', piecePreset: 'classic', primaryColor: '#d8e2f3', secondaryColor: '#5de4ff' },
  { id: 'bishop', label: '♝ Facet bishop', prompt: 'Wygeneruj kubistycznego gońca szachowego z czytelnym nacięciem mitry, stabilną podstawą i niebiesko-zieloną strefą LED.', assetKind: 'figurine', piecePreset: 'czech-facet', primaryColor: '#7ba8ff', secondaryColor: '#35f0a1' },
  { id: 'queen', label: '♛ Orbital queen', prompt: 'Wygeneruj smukłego hetmana szachowego z orbitalną koroną, fasetowanym korpusem i subtelną strefą LED.', assetKind: 'figurine', piecePreset: 'czech-facet', primaryColor: '#a77bff', secondaryColor: '#56ddff' },
  { id: 'king', label: '♚ Orbital king', prompt: 'Wygeneruj króla szachowego z mocną klasyczną sylwetką, geometryczną koroną, stabilną podstawą i zielono-niebieskim LED.', assetKind: 'figurine', piecePreset: 'czech-facet', primaryColor: '#56ddff', secondaryColor: '#35f0a1' },
  { id: 'board', label: '▦ LED board', prompt: 'Wygeneruj czarno-białą planszę szachową z zielono-niebieską ramą LED.', assetKind: 'board', boardPreset: 'lab-ledcolor', primaryColor: '#10131c', secondaryColor: '#35f0a1' },
  { id: 'arctic', label: '❄ Arctic station', prompt: 'Wygeneruj proceduralny model koncepcyjny stacji badawczej Arctic 90°N.', assetKind: 'station-shell', stationId: 'arctic', primaryColor: '#75efff', secondaryColor: '#dffbff' },
  { id: 'sahara', label: '◒ Sahara station', prompt: 'Wygeneruj proceduralny model koncepcyjny stacji Sahara Water Memory.', assetKind: 'station-shell', stationId: 'sahara', primaryColor: '#ffc767', secondaryColor: '#ffe2a9' },
  { id: 'ocean', label: '≋ Ocean station', prompt: 'Wygeneruj proceduralny model koncepcyjny pływającej stacji Ocean Blue Sentinel.', assetKind: 'station-shell', stationId: 'ocean', primaryColor: '#3fffd1', secondaryColor: '#73bfff' },
  { id: 'orbit', label: '◎ Earth–Space', prompt: 'Wygeneruj proceduralny model koncepcyjny stacji Earth–Space Orbital Synthesis.', assetKind: 'station-shell', stationId: 'earth-space', primaryColor: '#a77bff', secondaryColor: '#56ddff' },
]

type DisplayResult = Record<string, unknown> | null

function GeneratedTexturePreview({ bundle }: { bundle: ProceduralAssetBundle }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([Uint8Array.from(bundle.texture.bytes).buffer], { type: bundle.texture.mimeType })), [bundle])
  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])
  return <img className="generated-texture-preview" src={url} alt={`Generated ${bundle.texture.width} by ${bundle.texture.height} pixel texture for ${bundle.preview.label}`} />
}

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
  const [generationMessage, setGenerationMessage] = useState('Choose an example or write a prompt, then generate a visible model.')
  const [copyMessage, setCopyMessage] = useState('')

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
  const codexCommand = track === 'terra-station' ? CODEX_STATION_COMMAND : CODEX_PIECE_COMMAND

  function generateAssetFiles() {
    const raw = generateProceduralAssetBundle(specification)
    const generated = raw.preview.preset === 'earth-guardian'
      ? repairEarthGuardianBundle(raw)
      : raw.preview.preset === 'research-station'
        ? repairTerraMaterials(raw, stationId)
        : raw
    setAssetBundle(generated)
    setGenerationMessage(`Generated ${generated.preview.label}: ${generated.metrics.vertices} vertices and ${generated.metrics.triangles} triangles. Semantic materials are visible in the rotating preview; Earth Guardian and Terra station glTF exports include repaired PBR material zones.`)
  }

  function applyExample(example: GeneratorExample) {
    setPrompt(example.prompt)
    setAssetKind(example.assetKind)
    if (example.piecePreset) setPiecePreset(example.piecePreset)
    if (example.stationId) setStationId(example.stationId)
    if (example.boardPreset) setBoardPreset(example.boardPreset)
    if (example.primaryColor) setPrimaryColor(example.primaryColor)
    if (example.secondaryColor) setSecondaryColor(example.secondaryColor)
    setTrack(example.assetKind === 'station-shell' ? 'terra-station' : 'cube-asset')
    setGenerationMessage(`${example.label} configured. Press Generate to build and display its geometry.`)
  }

  async function copyCodexCommand() {
    try {
      await navigator.clipboard.writeText(`${codexCommand}\n\nPrompt użytkownika: ${prompt}`)
      setCopyMessage('Codex command copied.')
    } catch {
      setCopyMessage('Copy is unavailable in this browser; select the command text manually.')
    }
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

      <section className="card premium-pack-notice">
        <div className="lab-section-title"><div><p className="eyebrow">{track === 'cube-asset' ? 'CUBE PREMIUM ASSET INTAKE' : 'TERRA STATION SOURCE INTAKE · NOT PREMIUM'}</p><h2>{track === 'cube-asset' ? 'Cube Chess Premium Visual Pack' : 'Research-station engineering assets'}</h2></div><StatusBadge value="SOURCE PACK NOT IMPORTED" /></div>
        <p>{track === 'cube-asset' ? 'The owner-declared 4.2 GB Cube source pack must be audited file-by-file, optimized into small GLB/KTX2 previews and served on demand. It must not be bundled into GitHub Pages or loaded when the site opens.' : 'Terra station assets stay outside the Cube Chess subscription. They require the same provenance, geometry and mobile-performance checks, but remain part of the research workflow rather than a premium game product.'}</p>
        <div className="lab-metrics premium-pack-steps">
          <article><b>01</b><span>scan + inventory</span></article><article><b>02</b><span>license + origin</span></article><article><b>03</b><span>GLB/KTX2 + LOD</span></article><article><b>04</b><span>CDN + mobile QA</span></article>
        </div>
        <p className="lab-note">No source asset is sold, published or relicensed automatically. The public judging path stays free; Shopify remains a blocked mapping test until an audited product, authorized store and explicit human decision exist.</p>
      </section>

      <section className="product-workbench">
        <div className="card product-controls">
          <p className="eyebrow">ASSET CONFIGURATOR</p>
          <h2>1. Configure the concept</h2>
          <div className="generator-examples" aria-label="Working generator examples">
            {GENERATOR_EXAMPLES.map(example => <button type="button" key={example.id} onClick={() => applyExample(example)}>{example.label}</button>)}
          </div>
          <label>Prompt for the deterministic local generator
            <textarea aria-label="3D generator prompt" rows={5} value={prompt} onChange={event => setPrompt(event.target.value)} />
          </label>
          <p className="lab-note">Supported words select a tested shape: Earth, pawn, rook, knight, board or station. The remaining creative instructions are preserved for the Codex brief; this browser does not pretend to run a free-form generative 3D model.</p>
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
          <div className="lab-section-title"><div><p className="eyebrow">VISUAL CONCEPT + LOCAL ASSET EXPORT</p><h2>{assetBundle ? `${assetBundle.preview.label}${assetBundleIsCurrent ? '' : ' · OUTDATED'}` : `${station.name} · ${assetKind}`}</h2></div><StatusBadge value={assetBundleIsCurrent ? 'GLTF READY' : assetBundle ? 'REGENERATE REQUIRED' : 'CONCEPT'} /></div>
          {assetBundle
            ? <ProceduralAssetViewer bundle={assetBundle} stale={!assetBundleIsCurrent} />
            : track === 'cube-asset' && assetKind === 'figurine' && piecePreset === 'earth-guardian'
              ? <img src={earthFigurineConcept} alt="AI-generated Earth figurine concept on a black-and-white board with green and blue LEDs; not a manufactured product or 3D model file" />
              : <StationConceptVisual station={station} />}
          <div className="preview-swatches"><i /><i /><span>{material}</span></div>
          <p className="lab-note"><b>{assetBundle ? 'Live generated geometry:' : 'Concept reference:'}</b> {assetBundle ? 'the rotating canvas renders the same vertex and index arrays embedded in the downloadable glTF. The semantic preview now separates Earth, face, metal, ice, water and terrain zones; repaired PBR materials are embedded in Earth Guardian and Terra station glTF exports.' : 'visual direction only; generate below to create and see a real low-poly prototype.'} It is not a sculpted production asset or manufacturing proof.</p>
          <p className="generation-status" aria-live="polite">{generationMessage}</p>
          <div className="asset-export-panel">
            <button type="button" className="lab-primary" onClick={generateAssetFiles}>Generate and show 3D model + texture</button>
            {assetBundle ? assetBundleIsCurrent ? <>
              <StatusBadge value="LOCAL FILES READY" />
              <div className="generated-asset-summary">
                <GeneratedTexturePreview bundle={assetBundle} />
                <p><b>{assetBundle.preview.label}</b><br />{assetBundle.metrics.vertices} vertices · {assetBundle.metrics.triangles} triangles<br /><small>{assetBundle.geometryFingerprint}</small></p>
              </div>
              <div className="toolbar">
                <button type="button" onClick={() => downloadFile(assetBundle.model.filename, assetBundle.model.content, assetBundle.model.mimeType)}>Download .gltf model</button>
                <button type="button" onClick={() => downloadFile(assetBundle.texture.filename, assetBundle.texture.bytes, assetBundle.texture.mimeType)}>Download .png texture</button>
                <button type="button" onClick={() => downloadJson(`${assetBundle.specificationId}-manifest.json`, proceduralAssetManifest(assetBundle))}>Download QA manifest</button>
              </div>
              <small>{assetBundle.truthBoundary}</small>
            </> : <p className="lab-error">The configuration changed. The old model remains visible with an outdated overlay; generate again so model, texture and specification stay linked.</p> : null}
          </div>
          <details className="concept-reference"><summary>Show the visual concept reference</summary>{track === 'cube-asset' && piecePreset === 'earth-guardian' ? <img src={earthFigurineConcept} alt="Earth Guardian visual concept reference" /> : <StationConceptVisual station={station} />}</details>
        </div>
      </section>

      <section className="card codex-assistant">
        <div className="lab-section-title"><div><p className="eyebrow">FORGEMCP ASSISTANT + CODEX AGENT</p><h2>2. Prepare a build-ready agent brief</h2></div><StatusBadge value={assistantIsCurrent ? 'BRIEF READY' : assistantResult ? 'REGENERATE REQUIRED' : 'WAITING FOR HUMAN'} /></div>
        <div className="assistant-flow" aria-label="Assistant workflow"><span>Human prompt</span><b>→</b><span>ForgeMCP assistant</span><b>→</b><span>Codex agent brief</span><b>→</b><span>QA</span><b>→</b><span>Human approval</span></div>
        <label>Codex build command
          <textarea aria-label="Codex build command" rows={10} readOnly value={`${codexCommand}\n\nPrompt użytkownika: ${prompt}`} />
        </label>
        <div className="toolbar">
          <button type="button" className="lab-primary" onClick={runAssistant}>Assistant: prepare Codex brief</button>
          <button type="button" onClick={copyCodexCommand}>Copy command for Codex</button>
          <button type="button" onClick={() => downloadJson(`${specification.id}.json`, assistantResult ?? prepareCodexAssetBrief(prompt, configuration))}>Export agent brief JSON</button>
        </div>
        {copyMessage ? <p className="lab-note" role="status">{copyMessage}</p> : null}
        {assistantResult ? <details className="assistant-result"><summary>Agent plan ready — execution not started</summary><pre>{JSON.stringify(assistantResult, null, 2)}</pre></details> : null}
      </section>

      <section className="grid two product-handoffs">
        <article className="card">
          <p className="eyebrow">SHOPIFY TEST</p><h2>3. Local product mapping brief</h2>
          <p>Prepare title, description, tags and specification reference for later Shopify field mapping. This is not a ProductCreateInput; it remains unpublished and cannot be purchased until a real store and variant are connected.</p>
          <button type="button" onClick={buildShopifyDraft}>Prepare local Shopify mapping draft</button>
          {shopifyResult ? <><StatusBadge value={shopifyDraftIsCurrent ? 'SHOPIFY NOT CONNECTED' : 'DRAFT OUTDATED'} /><details><summary>Show local Shopify draft JSON</summary><pre>{JSON.stringify(shopifyResult, null, 2)}</pre></details></> : null}
          <button type="button" disabled>Buy in Shopify · connection required</button>
        </article>
        <article className="card">
          <p className="eyebrow">B2B MANUFACTURING TEST</p><h2>4. Request for quotation</h2>
          <p>Shopify B2B manages known companies; it does not discover manufacturers. This lab prepares an RFQ, while supplier discovery stays explicitly unconnected.</p>
          <button type="button" onClick={buildRfq}>Prepare unsent B2B RFQ</button>
          {rfqResult ? <><StatusBadge value={rfqDraftIsCurrent ? 'RFQ NOT SENT' : 'DRAFT OUTDATED'} /><details><summary>Show unsent RFQ JSON</summary><pre>{JSON.stringify(rfqResult, null, 2)}</pre></details></> : null}
          <button type="button" disabled>Send to verified supplier · connection required</button>
        </article>
      </section>

      <section className="card final-test-window">
        <div className="lab-section-title"><div><p className="eyebrow">FINAL SAFETY WINDOW</p><h2>5. Run the end-to-end test without buying or sending</h2></div><StatusBadge value={finalTest ? finalTestIsCurrent && typeof finalTest.status === 'string' ? finalTest.status : 'RERUN REQUIRED' : qa.status} /></div>
        <p>PASS requires current model/texture data, generator QA, Codex brief, Shopify mapping draft and B2B RFQ draft. Payment, order and supplier submission must remain blocked.</p>
        <button type="button" className="lab-primary" onClick={runFinalTest}>Run final test window</button>
        {finalTest ? <details open><summary>Show final test evidence</summary><pre>{JSON.stringify(finalTest, null, 2)}</pre></details> : null}
      </section>
    </>
  )
}
