import type { HazardInvestigationResult } from '../integrations/terra/hazardInvestigation'
import type { ImageryDisplaySettings } from '../integrations/terra/imageryDisplay'

export const RESEARCH_ARCHIVE_KEY = 'forgemcp.terraResearchArchive.v1'
export const RESEARCH_ARCHIVE_LIMIT = 50

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
  imagery: { inspectedByModel: number; galleryImages: number; requestedYears: number; missingYears: number }
  sources: Array<{ name: string; provider: string; state: string; sourceUrl: string }>
  limitations: string[]
  displaySettings: ImageryDisplaySettings & { evidenceMeaning: 'DISPLAY_ONLY_NOT_MODEL_INPUT' }
  learningStatus: 'CURATION_REQUIRED_NOT_AUTOMATIC_TRAINING'
  humanDecisionRequired: true
}

const compact = (value: string, maximum = 360) => value.replace(/\s+/g, ' ').trim().slice(0, maximum)

export function createResearchArchiveEntry(result: HazardInvestigationResult, display: ImageryDisplaySettings): ResearchArchiveEntry {
  const visual = result.imagery.analysis?.analysis
  const shortSummary = [
    visual?.headline,
    visual?.change_over_time,
    visual?.water_assessment,
    result.verification.reason,
  ].filter((value): value is string => Boolean(value?.trim())).map(value => compact(value)).slice(0, 4)

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

function isArchiveEntry(value: unknown): value is ResearchArchiveEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Partial<ResearchArchiveEntry>
  return entry.schemaVersion === '1.0' && typeof entry.runId === 'string' && typeof entry.savedAt === 'string' && Array.isArray(entry.shortSummary) && Array.isArray(entry.hypotheses)
}

export function readResearchArchive(): ResearchArchiveEntry[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(RESEARCH_ARCHIVE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isArchiveEntry).slice(0, RESEARCH_ARCHIVE_LIMIT) : []
  } catch {
    return []
  }
}

export function saveResearchArchiveEntry(entry: ResearchArchiveEntry) {
  if (typeof localStorage === 'undefined') throw new Error('Archiwum przeglądarki jest niedostępne.')
  const archive = [entry, ...readResearchArchive().filter(item => item.runId !== entry.runId)].slice(0, RESEARCH_ARCHIVE_LIMIT)
  try {
    localStorage.setItem(RESEARCH_ARCHIVE_KEY, JSON.stringify(archive))
  } catch {
    throw new Error('Nie udało się zapisać skrótu. Pamięć przeglądarki może być pełna lub zablokowana.')
  }
  return archive
}
