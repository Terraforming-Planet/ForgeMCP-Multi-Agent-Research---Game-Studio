import type { HazardInvestigationResult } from '../integrations/terra/hazardInvestigation'
import type { ImageryDisplaySettings } from '../integrations/terra/imageryDisplay'

export const RESEARCH_ARCHIVE_KEY = 'forgemcp.terraResearchArchive.v1'
export const RESEARCH_ARCHIVE_BACKUP_KEY = 'forgemcp.terraResearchArchive.backup.v1'
export const RESEARCH_ARCHIVE_LIMIT = 50

export type ResearchArchiveStorage = 'local' | 'session' | 'memory'

export type ResearchArchiveSaveResult = {
  entries: ResearchArchiveEntry[]
  storage: ResearchArchiveStorage
}

export type ResearchArchiveEntry = {
  schemaVersion: '1.0'
  id: string
  runId: string
  savedAt: string
  title: string
  classification: string
  signalState: string
  verificationState: string
  area: { resolvedName: string; latitude: number; longitude: number; radiusKm: number }
  period: HazardInvestigationResult['period']
  hazards: HazardInvestigationResult['hazards']
  shortSummary: string[]
  observations: Array<{ evidenceClass: string; statement: string; limitation: string }>
  hypotheses: Array<{ id: string; hazardType: string; hypothesis: string; status: string; requiredChecks: string[] }>
  hydrology?: {
    waterChangeState: string
    temporalBasis: string
    inflowOutflowStatus: string
    candidateFeatures: string[]
    mainAndTributaryContext: string
    causeStatus: string
  }
  imagery: { inspectedByModel: number; galleryImages: number; requestedYears: number; missingYears: number }
  sources: Array<{ name: string; provider: string; state: string; sourceUrl: string }>
  limitations: string[]
  displaySettings: ImageryDisplaySettings & { evidenceMeaning: 'DISPLAY_ONLY_NOT_MODEL_INPUT' }
  learningStatus: 'CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING'
  humanDecisionRequired: true
}

const compact = (value: string, maximum = 360) => value.replace(/\s+/g, ' ').trim().slice(0, maximum)

let memoryArchive: ResearchArchiveEntry[] = []
let memoryFallbackActive = false

export function createResearchArchiveEntry(result: HazardInvestigationResult, display: ImageryDisplaySettings): ResearchArchiveEntry {
  const visual = result.imagery.analysis?.analysis
  const hydrology = visual?.hydrology_screening
  const shortSummary = [
    visual?.headline,
    visual?.change_over_time,
    visual?.water_assessment,
    hydrology ? `Woda: ${hydrology.water_change_state}; dopływy/odpływy: ${hydrology.inflow_outflow_status}; przyczyna nieustalona.` : undefined,
    result.verification.reason,
  ].filter((value): value is string => Boolean(value?.trim())).map(value => compact(value)).slice(0, 5)

  if (!shortSummary.length) {
    shortSummary.push(...result.observations.slice(0, 3).map(item => compact(item.statement)))
  }

  return {
    schemaVersion: '1.0',
    id: `archive-${result.runId}`,
    runId: result.runId,
    savedAt: new Date().toISOString(),
    title: result.area.resolvedName,
    classification: result.classification,
    signalState: result.signalState,
    verificationState: result.verification.state,
    area: {
      resolvedName: result.area.resolvedName,
      latitude: result.area.latitude,
      longitude: result.area.longitude,
      radiusKm: result.area.radiusKm,
    },
    period: result.period,
    hazards: result.hazards,
    shortSummary,
    observations: result.observations.slice(0, 6).map(item => ({ evidenceClass: item.evidenceClass, statement: compact(item.statement), limitation: compact(item.limitation) })),
    hypotheses: [...result.hypotheses].sort((left, right) => left.priority - right.priority).slice(0, 6).map(item => ({
      id: item.id,
      hazardType: item.hazardType,
      hypothesis: compact(item.hypothesis),
      status: item.status,
      requiredChecks: item.requiredChecks.slice(0, 4).map(check => compact(check, 220)),
    })),
    hydrology: hydrology ? {
      waterChangeState: hydrology.water_change_state,
      temporalBasis: compact(hydrology.temporal_basis),
      inflowOutflowStatus: hydrology.inflow_outflow_status,
      candidateFeatures: hydrology.candidate_features.slice(0, 8).map(item => compact(item, 220)),
      mainAndTributaryContext: compact(hydrology.main_and_tributary_context),
      causeStatus: hydrology.cause_status,
    } : undefined,
    imagery: {
      inspectedByModel: result.imagery.visuallyInspectedByModel,
      galleryImages: result.imagery.slots.filter(item => item.status === 'image').length,
      requestedYears: result.imagery.requestedYears.length,
      missingYears: result.imagery.missingYears,
    },
    sources: result.sourceStatus.slice(0, 16).map(item => ({ name: item.name, provider: item.provider, state: item.state, sourceUrl: item.sourceUrl })),
    limitations: result.limitations.slice(0, 8).map(item => compact(item)),
    displaySettings: { ...display, evidenceMeaning: 'DISPLAY_ONLY_NOT_MODEL_INPUT' },
    learningStatus: 'CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING',
    humanDecisionRequired: true,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isArchiveEntry(value: unknown): value is ResearchArchiveEntry {
  if (!isRecord(value)) return false
  const area = value.area
  const period = value.period
  const imagery = value.imagery
  const display = value.displaySettings
  if (!isRecord(area) || !isRecord(period) || !isRecord(imagery) || !isRecord(display)) return false

  const observationsValid = Array.isArray(value.observations) && value.observations.every(item => (
    isRecord(item)
    && typeof item.evidenceClass === 'string'
    && typeof item.statement === 'string'
    && typeof item.limitation === 'string'
  ))
  const hypothesesValid = Array.isArray(value.hypotheses) && value.hypotheses.every(item => (
    isRecord(item)
    && typeof item.id === 'string'
    && typeof item.hazardType === 'string'
    && typeof item.hypothesis === 'string'
    && typeof item.status === 'string'
    && isStringArray(item.requiredChecks)
  ))
  const sourcesValid = Array.isArray(value.sources) && value.sources.every(item => (
    isRecord(item)
    && typeof item.name === 'string'
    && typeof item.provider === 'string'
    && typeof item.state === 'string'
    && typeof item.sourceUrl === 'string'
  ))
  const hydrologyValid = value.hydrology === undefined || (
    isRecord(value.hydrology)
    && typeof value.hydrology.waterChangeState === 'string'
    && typeof value.hydrology.temporalBasis === 'string'
    && typeof value.hydrology.inflowOutflowStatus === 'string'
    && isStringArray(value.hydrology.candidateFeatures)
    && typeof value.hydrology.mainAndTributaryContext === 'string'
    && typeof value.hydrology.causeStatus === 'string'
  )

  return value.schemaVersion === '1.0'
    && typeof value.id === 'string'
    && typeof value.runId === 'string'
    && typeof value.savedAt === 'string'
    && Number.isFinite(Date.parse(value.savedAt))
    && typeof value.title === 'string'
    && typeof value.classification === 'string'
    && typeof value.signalState === 'string'
    && typeof value.verificationState === 'string'
    && typeof area.resolvedName === 'string'
    && isFiniteNumber(area.latitude)
    && isFiniteNumber(area.longitude)
    && isFiniteNumber(area.radiusKm)
    && isFiniteNumber(period.startYear)
    && isFiniteNumber(period.endYear)
    && typeof period.season === 'string'
    && typeof period.timelineMode === 'string'
    && isStringArray(value.hazards)
    && isStringArray(value.shortSummary)
    && observationsValid
    && hypothesesValid
    && hydrologyValid
    && isFiniteNumber(imagery.inspectedByModel)
    && isFiniteNumber(imagery.galleryImages)
    && isFiniteNumber(imagery.requestedYears)
    && isFiniteNumber(imagery.missingYears)
    && sourcesValid
    && isStringArray(value.limitations)
    && typeof display.preset === 'string'
    && isFiniteNumber(display.brightness)
    && isFiniteNumber(display.contrast)
    && isFiniteNumber(display.saturation)
    && isFiniteNumber(display.hue)
    && display.evidenceMeaning === 'DISPLAY_ONLY_NOT_MODEL_INPUT'
    && value.learningStatus === 'CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING'
    && value.humanDecisionRequired === true
}

export function readResearchArchive(): ResearchArchiveEntry[] {
  const read = (storage: Storage | undefined, key: string) => {
    if (!storage) return null
    try {
      const raw = storage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.filter(isArchiveEntry).slice(0, RESEARCH_ARCHIVE_LIMIT) : null
    } catch {
      return null
    }
  }

  const local = read(typeof localStorage === 'undefined' ? undefined : localStorage, RESEARCH_ARCHIVE_KEY)
  if (local !== null) {
    memoryArchive = local
    memoryFallbackActive = false
    return local
  }

  const backup = read(typeof localStorage === 'undefined' ? undefined : localStorage, RESEARCH_ARCHIVE_BACKUP_KEY)
  if (backup !== null) {
    memoryArchive = backup
    memoryFallbackActive = false
    return backup
  }

  const session = read(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, RESEARCH_ARCHIVE_KEY)
  if (session !== null) {
    memoryArchive = session
    memoryFallbackActive = false
    return session
  }

  return memoryFallbackActive ? memoryArchive : []
}

function writeAndVerify(storage: Storage, key: string, serialized: string, entryId: string) {
  try {
    storage.setItem(key, serialized)
    const persisted = storage.getItem(key)
    if (!persisted) return false
    const parsed = JSON.parse(persisted) as unknown
    return Array.isArray(parsed) && parsed.some(item => isArchiveEntry(item) && item.id === entryId)
  } catch {
    return false
  }
}

export function saveResearchArchiveEntry(entry: ResearchArchiveEntry): ResearchArchiveSaveResult {
  if (!isArchiveEntry(entry)) throw new Error('Skrót badania jest niepełny i nie został zapisany.')
  const archive = [entry, ...readResearchArchive().filter(item => item.runId !== entry.runId)].slice(0, RESEARCH_ARCHIVE_LIMIT)
  const serialized = JSON.stringify(archive)
  memoryArchive = archive

  if (typeof localStorage !== 'undefined' && writeAndVerify(localStorage, RESEARCH_ARCHIVE_KEY, serialized, entry.id)) {
    // A second compact copy lets the reader recover when one browser record is damaged.
    writeAndVerify(localStorage, RESEARCH_ARCHIVE_BACKUP_KEY, serialized, entry.id)
    memoryFallbackActive = false
    return { entries: archive, storage: 'local' }
  }

  if (typeof sessionStorage !== 'undefined' && writeAndVerify(sessionStorage, RESEARCH_ARCHIVE_KEY, serialized, entry.id)) {
    memoryFallbackActive = false
    return { entries: archive, storage: 'session' }
  }

  // The current SPA route can still show the record even when Android privacy
  // settings block both browser stores. The UI explicitly labels this fallback.
  memoryFallbackActive = true
  return { entries: archive, storage: 'memory' }
}
