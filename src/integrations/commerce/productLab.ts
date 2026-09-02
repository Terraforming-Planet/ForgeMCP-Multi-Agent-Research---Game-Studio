import { getResearchStationPreset, type ResearchStationPresetId } from '../../data/researchStations'

export type ProductTestTrack = 'cube-asset' | 'terra-station'
export type AssetKind = 'figurine' | 'board' | 'texture-pack' | 'station-shell'
export type BoardPreset = 'cube-512' | 'classic-mono' | 'lab-ledcolor'
export type PiecePreset = 'czech-facet' | 'classic' | 'lab-ledcolor' | 'earth-guardian'

export interface AssetConfiguration {
  track: ProductTestTrack
  stationId: ResearchStationPresetId
  assetKind: AssetKind
  boardPreset: BoardPreset
  piecePreset: PiecePreset
  material: string
  texture: string
  primaryColor: string
  secondaryColor: string
  ledIntensity: number
  scaleMm: number
  prompt: string
}

export interface AssetSpecification extends AssetConfiguration {
  id: string
  schema: 'forgemcp.asset-spec.v1'
  stationName: string
  previewMode: 'PROCEDURAL_PREVIEW'
  generatedModelFile: false
  manufacturingReady: false
  humanApprovalRequired: true
  deliverables: string[]
}

const normalizeHex = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback

function hashText(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createAssetSpecification(input: AssetConfiguration): AssetSpecification {
  const station = getResearchStationPreset(input.stationId)
  const normalized: AssetConfiguration = {
    ...input,
    primaryColor: normalizeHex(input.primaryColor, station.accent),
    secondaryColor: normalizeHex(input.secondaryColor, station.secondary),
    ledIntensity: Math.max(0, Math.min(100, Math.round(input.ledIntensity))),
    scaleMm: Math.max(20, Math.min(500, Math.round(input.scaleMm))),
    prompt: input.prompt.trim().slice(0, 2000),
  }
  const fingerprint = hashText(JSON.stringify(normalized))
  return {
    ...normalized,
    id: `asset-${fingerprint}`,
    schema: 'forgemcp.asset-spec.v1',
    stationName: `${station.name} · ${station.subtitle}`,
    previewMode: 'PROCEDURAL_PREVIEW',
    generatedModelFile: false,
    manufacturingReady: false,
    humanApprovalRequired: true,
    deliverables: [
      'versioned design specification',
      'material and texture brief',
      'colour and LED configuration',
      'optional local low-poly glTF and deterministic PNG texture export',
      'QA checklist',
    ],
  }
}

export function runAssetQualityGate(specification: AssetSpecification) {
  const checks = {
    promptPresent: specification.prompt.length >= 20,
    targetScaleWithinUiBounds: specification.scaleMm >= 20 && specification.scaleMm <= 500,
    coloursDistinct: specification.primaryColor !== specification.secondaryColor,
    ledBounded: specification.ledIntensity >= 0 && specification.ledIntensity <= 100,
    approvalGatePresent: specification.humanApprovalRequired,
  }
  const passed = Object.values(checks).every(Boolean)
  return {
    status: passed ? 'PASS' as const : 'WARNING' as const,
    checks,
    limitation: 'Configuration QA only. The separate local exporter can create a low-poly glTF and PNG texture, but this gate does not prove topology quality, PBR completeness, printability or physical manufacturability.',
  }
}

export function prepareCodexAssetBrief(prompt: string, configuration: AssetConfiguration) {
  const specification = createAssetSpecification({ ...configuration, prompt })
  return {
    status: 'READY_FOR_CODEX_REVIEW' as const,
    execution: 'NOT_STARTED' as const,
    prompt: specification.prompt,
    specification,
    agentPlan: [
      'Geometry agent: propose silhouette, proportions and board clearance.',
      'Material agent: describe surface, texture and LED zones.',
      'Game QA agent: check visual readability and board fit.',
      'Human gate: approve before any external generation, publication or order.',
    ],
    truthfulBoundary: 'This prepares a Codex handoff. It does not claim that Codex generated a GLB, texture archive or production-ready model in this browser run.',
  }
}

export function prepareShopifyDraft(specification: AssetSpecification) {
  return {
    status: 'SHOPIFY_NOT_CONNECTED' as const,
    productStatus: 'DRAFT' as const,
    published: false,
    purchasable: false,
    product: {
      title: `${specification.stationName} · ${specification.assetKind}`,
      description: specification.prompt,
      tags: ['ForgeMCP', specification.track, specification.stationId, specification.assetKind],
      specificationId: specification.id,
    },
    requiredNextStep: 'Connect an authorized Shopify store and a real product variant, then obtain explicit human approval.',
  }
}

export function prepareB2bRfq(specification: AssetSpecification) {
  return {
    status: 'RFQ_DRAFT_NOT_SENT' as const,
    supplierDirectory: 'NOT_CONNECTED' as const,
    recipient: null,
    sent: false,
    specificationId: specification.id,
    request: {
      subject: `Manufacturing feasibility review · ${specification.assetKind}`,
      requestedChecks: ['mesh and wall thickness', 'material compatibility', 'finish and LED feasibility', 'unit and tooling estimate'],
      constraints: [`target scale ${specification.scaleMm} mm`, specification.material, specification.texture],
    },
    requiredNextStep: 'Select and verify a real supplier outside this prototype, then approve sending the RFQ.',
  }
}

export function shopifyCartNotConnected() {
  return {
    state: 'NOT_CONNECTED' as const,
    verification: 'INSUFFICIENT_DATA' as const,
    checkoutUrl: null,
    cartCreated: false,
    orderCreated: false,
    error: 'A real Shopify Storefront API product variant is required. No cart, checkout, payment or order was created.',
    provenance: [],
  }
}

export function supplierSubmissionNotConnected() {
  return {
    state: 'NOT_CONNECTED' as const,
    verification: 'INSUFFICIENT_DATA' as const,
    rfqSent: false,
    recipient: null,
    error: 'No verified supplier directory or recipient is connected. No B2B request was sent.',
    provenance: [],
  }
}
