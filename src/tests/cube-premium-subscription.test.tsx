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
    expect(screen.getByText('30 DAYS FREE TEST')).toBeTruthy()
    expect(screen.getByText('NO PAYMENT')).toBeTruthy()
    expect(screen.getByText('CUBE CHESS ONLY')).toBeTruthy()
    expect(screen.getByText(/Nie tworzy konta, koszyka Shopify, zamówienia, płatności ani odnawialnej subskrypcji/i)).toBeTruthy()
    expect(screen.getByText(/Terra Observation oraz stacje badawcze nie są objęte subskrypcją/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Przejdź do bezpłatnego Game Studio' }).getAttribute('href')).toBe('/game-studio')
    expect(screen.getByRole('heading', { name: 'Arena Chess jako prywatne źródło treningowe Cube Chess' })).toBeTruthy()
    expect(screen.getByText('OWNER AUTHORIZED')).toBeTruthy()
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

    fireEvent.click(screen.getByRole('button', { name: 'Przetestuj Premium za darmo przez miesiąc' }))
    expect(screen.getByRole('heading', { name: 'Lokalny test jest aktywny' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Lokalny test jest aktywny' }).closest('section')).toHaveTextContent('30 dni pozostało')
    expect(storage.getItem(CUBE_PREMIUM_TRIAL_STORAGE_KEY)).not.toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()

    expect(screen.getByRole('heading', { name: 'Wybierz planszę i figurę, potem wygeneruj własny zestaw' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cube Chess 512/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Classic Black & White/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Lab LEDColor/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Strażnik Ziemi/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Król orbitalny/i }))
    fireEvent.click(screen.getByRole('button', { name: /Cube Chess 512/i }))
    fireEvent.change(screen.getByLabelText(/Własny prompt modelu i tekstury/), { target: { value: 'Zaprojektuj króla szachowego z mocną koroną, czytelną sylwetką i niebiesko-zielonym LED.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Wygeneruj zestaw 3D + tekstury' }))

    expect(screen.getByRole('img', { name: /Rotating live preview of Cube Chess 512 eight-level board/i })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Rotating live preview of ForgeMCP faceted king/i })).toBeTruthy()
    expect(screen.getByText(/Podgląd, tekstury i pliki glTF pochodzą z tej samej specyfikacji/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pobierz planszę .gltf' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pobierz figurę .gltf' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Wygeneruj podstawową grę i od razu wykonaj ruch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Generate playable game' })).toBeTruthy()
    expect(screen.getByLabelText('Zaawansowany prompt produkcyjny Cube Chess')).toHaveValue(expect.stringContaining('KNIGHT — HIGHEST PRIORITY'))
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
