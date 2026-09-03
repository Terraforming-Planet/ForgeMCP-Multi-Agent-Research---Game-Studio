export const CUBE_PREMIUM_TRIAL_STORAGE_KEY = 'forgemcp.cube-premium-local-test.v1'
export const CUBE_PREMIUM_TRIAL_DURATION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000
const TRIAL_DURATION_MS = CUBE_PREMIUM_TRIAL_DURATION_DAYS * DAY_MS

export type CubePremiumTrialStatus = 'NOT_STARTED' | 'ACTIVE_LOCAL_TEST' | 'EXPIRED_LOCAL_TEST'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StoredCubePremiumTrial {
  schema: 'forgemcp.cube-premium-trial.v1'
  mode: 'LOCAL_TEST_MODE'
  scope: 'CUBE_CHESS_VISUALS_ONLY'
  startedAt: string
}

export interface CubePremiumTrialState {
  schema: 'forgemcp.cube-premium-trial.v1'
  mode: 'LOCAL_TEST_MODE'
  scope: 'CUBE_CHESS_VISUALS_ONLY'
  status: CubePremiumTrialStatus
  durationDays: 30
  startedAt: string | null
  endsAt: string | null
  remainingDays: number
  storedLocally: boolean
  billingConnected: false
  accountCreated: false
  paymentMethodCollected: false
  shopifyCartCreated: false
  orderCreated: false
  recurringChargeCreated: false
  serverEntitlement: false
  judgedCoreGated: false
  price: null
  currency: null
}

export const CUBE_PREMIUM_OFFER = {
  name: 'Cube Chess Premium',
  mode: 'LOCAL_TEST_MODE',
  scope: 'CUBE_CHESS_VISUALS_ONLY',
  durationDays: CUBE_PREMIUM_TRIAL_DURATION_DAYS,
  price: null,
  currency: null,
  availableNow: [
    'Cube Chess and local chess previews',
    'Lab LEDColor lighting controls',
    'Deterministic four-game benchmark',
    'Procedural Cube board and piece examples',
  ],
  intakePending: [
    'Owner-supplied high-detail Cube Chess models',
    'Owner-supplied PBR texture variants',
  ],
  plannedProductionServices: [
    'Account synchronization',
    'Billing and recurring subscriptions',
    'Server-verified entitlements',
  ],
  truthBoundary: 'This offer is a local product-flow test. It creates no account, payment, order, recurring subscription or server entitlement, and it never gates the free judging path.',
} as const

function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('A valid trial clock is required.')
  return date
}

function baseState(): CubePremiumTrialState {
  return {
    schema: 'forgemcp.cube-premium-trial.v1',
    mode: 'LOCAL_TEST_MODE',
    scope: 'CUBE_CHESS_VISUALS_ONLY',
    status: 'NOT_STARTED',
    durationDays: CUBE_PREMIUM_TRIAL_DURATION_DAYS,
    startedAt: null,
    endsAt: null,
    remainingDays: 0,
    storedLocally: false,
    billingConnected: false,
    accountCreated: false,
    paymentMethodCollected: false,
    shopifyCartCreated: false,
    orderCreated: false,
    recurringChargeCreated: false,
    serverEntitlement: false,
    judgedCoreGated: false,
    price: null,
    currency: null,
  }
}

function stateFromStart(startedAt: Date, now: Date, storedLocally: boolean): CubePremiumTrialState {
  const endTime = startedAt.getTime() + TRIAL_DURATION_MS
  const remainingMs = Math.max(0, endTime - now.getTime())
  return {
    ...baseState(),
    status: remainingMs > 0 ? 'ACTIVE_LOCAL_TEST' : 'EXPIRED_LOCAL_TEST',
    startedAt: startedAt.toISOString(),
    endsAt: new Date(endTime).toISOString(),
    remainingDays: Math.ceil(remainingMs / DAY_MS),
    storedLocally,
  }
}

function isStoredTrial(value: unknown): value is StoredCubePremiumTrial {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredCubePremiumTrial>
  return candidate.schema === 'forgemcp.cube-premium-trial.v1'
    && candidate.mode === 'LOCAL_TEST_MODE'
    && candidate.scope === 'CUBE_CHESS_VISUALS_ONLY'
    && typeof candidate.startedAt === 'string'
    && Number.isFinite(new Date(candidate.startedAt).getTime())
}

export function inspectCubePremiumOffer() {
  return CUBE_PREMIUM_OFFER
}

export function createCubePremiumLocalTrial(now: Date | string | number = new Date()): CubePremiumTrialState {
  const clock = toDate(now)
  return stateFromStart(clock, clock, false)
}

export function readCubePremiumLocalTrial(
  storage: StorageLike | undefined,
  now: Date | string | number = new Date(),
): CubePremiumTrialState {
  if (!storage) return baseState()
  try {
    const raw = storage.getItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY)
    if (!raw) return baseState()
    const value: unknown = JSON.parse(raw)
    if (!isStoredTrial(value)) return baseState()
    return stateFromStart(new Date(value.startedAt), toDate(now), true)
  } catch {
    return baseState()
  }
}

export function activateCubePremiumLocalTrial(
  storage: StorageLike | undefined,
  now: Date | string | number = new Date(),
): CubePremiumTrialState {
  const trial = createCubePremiumLocalTrial(now)
  if (!storage || !trial.startedAt) return trial
  const stored: StoredCubePremiumTrial = {
    schema: trial.schema,
    mode: trial.mode,
    scope: trial.scope,
    startedAt: trial.startedAt,
  }
  try {
    storage.setItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY, JSON.stringify(stored))
    return { ...trial, storedLocally: true }
  } catch {
    return trial
  }
}

export function clearCubePremiumLocalTrial(storage: StorageLike | undefined): CubePremiumTrialState {
  try {
    storage?.removeItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY)
  } catch {
    // A blocked local-storage provider must not break the free Cube experience.
  }
  return baseState()
}
