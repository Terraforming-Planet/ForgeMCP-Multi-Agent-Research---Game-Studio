import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CubePremiumSubscription } from '../components/CubePremiumSubscription'
import {
  activateCubePremiumLocalTrial,
  CUBE_PREMIUM_TRIAL_DURATION_DAYS,
  CUBE_PREMIUM_TRIAL_STORAGE_KEY,
  clearCubePremiumLocalTrial,
  readCubePremiumLocalTrial,
  type StorageLike,
} from '../integrations/cube/premiumTrial'

class MemoryStorage implements StorageLike {
  values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

describe('Cube Premium local test', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('is explicitly Cube-only and creates no network, payment, account or game gate', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<MemoryRouter><CubePremiumSubscription storage={new MemoryStorage()} now={() => new Date('2026-09-03T12:00:00.000Z')} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Cube Chess Premium' })).toBeTruthy()
    expect(screen.getByText('TEST MODE')).toBeTruthy()
    expect(screen.getByText('NO PAYMENT')).toBeTruthy()
    expect(screen.getByText('CUBE ONLY')).toBeTruthy()
    expect(screen.getByText(/Nie tworzy konta, koszyka Shopify, zamówienia, płatności ani odnawialnej subskrypcji/i)).toBeTruthy()
    expect(screen.getByText(/Terra Observation oraz stacje badawcze nie są objęte subskrypcją/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Przejdź do bezpłatnego Game Studio' }).getAttribute('href')).toBe('/game-studio')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('activates exactly 30 days of local test state and restores it', () => {
    const storage = new MemoryStorage()
    const started = new Date('2026-09-03T12:00:00.000Z')
    const trial = activateCubePremiumLocalTrial(storage, started)

    expect(trial.status).toBe('ACTIVE_LOCAL_TEST')
    expect(trial.durationDays).toBe(CUBE_PREMIUM_TRIAL_DURATION_DAYS)
    expect(trial.remainingDays).toBe(30)
    expect(new Date(trial.endsAt!).getTime() - new Date(trial.startedAt!).getTime()).toBe(30 * 24 * 60 * 60 * 1000)
    expect(trial).toMatchObject({
      storedLocally: true,
      billingConnected: false,
      accountCreated: false,
      paymentMethodCollected: false,
      shopifyCartCreated: false,
      orderCreated: false,
      recurringChargeCreated: false,
      serverEntitlement: false,
      judgedCoreGated: false,
    })

    const restored = readCubePremiumLocalTrial(storage, new Date('2026-09-04T12:00:00.000Z'))
    expect(restored).toMatchObject({ status: 'ACTIVE_LOCAL_TEST', remainingDays: 29, storedLocally: true })
  })

  it('updates the page visibly after activation without calling an external service', () => {
    const storage = new MemoryStorage()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<MemoryRouter><CubePremiumSubscription storage={storage} now={() => new Date('2026-09-03T12:00:00.000Z')} /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'Wypróbuj bezpłatnie przez 30 dni' }))
    expect(screen.getByRole('heading', { name: 'Lokalny test jest aktywny' })).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent('30 dni pozostało')
    expect(storage.getItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY)).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść lokalny stan testu' }))
    expect(screen.getByRole('heading', { name: 'Test nie został uruchomiony' })).toBeTruthy()
    expect(storage.getItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY)).toBeNull()
  })

  it('treats expiry and corrupt storage safely while preserving the free Game Studio path', () => {
    const storage = new MemoryStorage()
    activateCubePremiumLocalTrial(storage, new Date('2026-09-03T12:00:00.000Z'))

    const expired = readCubePremiumLocalTrial(storage, new Date('2026-10-04T12:00:00.000Z'))
    expect(expired).toMatchObject({ status: 'EXPIRED_LOCAL_TEST', remainingDays: 0, judgedCoreGated: false })

    render(<MemoryRouter><CubePremiumSubscription storage={storage} now={() => new Date('2026-10-04T12:00:00.000Z')} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Lokalny test wygasł' })).toBeTruthy()
    expect(screen.getByText(/Bezpłatna gra, benchmark i podglądy nadal działają/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Przejdź do bezpłatnego Game Studio' })).toBeTruthy()

    storage.setItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY, '{not-json')
    expect(readCubePremiumLocalTrial(storage, new Date('2026-09-03T12:00:00.000Z')).status).toBe('NOT_STARTED')
    expect(clearCubePremiumLocalTrial(storage).judgedCoreGated).toBe(false)
  })
})
