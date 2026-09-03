import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activateCubePremiumLocalTrial,
  clearCubePremiumLocalTrial,
  inspectCubePremiumOffer,
  readCubePremiumLocalTrial,
  type StorageLike,
} from '../integrations/cube/premiumTrial'
import { StatusBadge } from './StatusBadge'
import { CubePremiumAssetStudio } from './CubePremiumAssetStudio'
import { CubePremiumModelLabV2 } from './CubePremiumModelLabV2'
import { CubeOwnerTrainingPanel } from './CubeOwnerTrainingPanel'
import { BasicGame3DGenerator } from './BasicGame3DGenerator'
import './CubePremiumSubscription.css'

interface CubePremiumSubscriptionProps {
  storage?: StorageLike
  now?: () => Date
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function CubePremiumSubscription({ storage = defaultStorage(), now = () => new Date() }: CubePremiumSubscriptionProps) {
  const offer = inspectCubePremiumOffer()
  const [trial, setTrial] = useState(() => readCubePremiumLocalTrial(storage, now()))

  function activateTrial() {
    setTrial(activateCubePremiumLocalTrial(storage, now()))
  }

  function resetTrial() {
    setTrial(clearCubePremiumLocalTrial(storage))
  }

  const active = trial.status === 'ACTIVE_LOCAL_TEST'
  const expired = trial.status === 'EXPIRED_LOCAL_TEST'

  return (
    <div className="cube-premium-page">
      <section className="cube-premium-hero">
        <div>
          <p className="cube-premium-kicker">SUBSKRYPCJA · TYLKO CUBE CHESS · 30 DNI TESTU</p>
          <h1>Cube Chess Premium</h1>
          <p className="cube-premium-lead">Plansze, figury, własne generowanie 3D + tekstur, Lab LEDColor oraz zatwierdzony przez właściciela pipeline Arena Chess są zebrane w jednym miejscu. Lokalny test Premium trwa 30 dni i nie wymaga płatności.</p>
          <div className="cube-premium-actions">
            {!active ? <button type="button" onClick={activateTrial}>{expired ? 'Uruchom ponownie bezpłatny test na 30 dni' : 'Przetestuj Premium za darmo przez miesiąc'}</button> : null}
            {trial.status !== 'NOT_STARTED' ? <button type="button" className="cube-premium-secondary" onClick={resetTrial}>Wyczyść lokalny stan testu</button> : null}
            <Link to="/game-studio">Przejdź do bezpłatnego Game Studio</Link>
          </div>
        </div>
        <div className="cube-premium-badges" aria-label="Granice prototypu">
          <StatusBadge value="30 DAYS FREE TEST" />
          <StatusBadge value="NO PAYMENT" />
          <StatusBadge value="CUBE CHESS ONLY" />
        </div>
      </section>

      <section className="cube-premium-status" role="status" aria-live="polite">
        <div>
          <p className="cube-premium-kicker">STATUS LOKALNEGO TESTU</p>
          <h2>{active ? 'Lokalny test jest aktywny' : expired ? 'Lokalny test wygasł' : 'Test nie został uruchomiony'}</h2>
        </div>
        {active ? <p><b>{trial.remainingDays}</b> dni pozostało · do {formatDate(trial.endsAt)} UTC</p> : null}
        {expired ? <p>Wygasł {formatDate(trial.endsAt)} UTC. Bezpłatna gra, benchmark i podglądy nadal działają.</p> : null}
        <small>{trial.storedLocally ? 'Stan zapisano wyłącznie w pamięci tej przeglądarki.' : 'Nie utworzono jeszcze lokalnego zapisu testu.'}</small>
      </section>

      <CubePremiumAssetStudio trialActive={active} />
      <CubePremiumModelLabV2 />
      <BasicGame3DGenerator />
      <CubeOwnerTrainingPanel />

      <section className="cube-premium-grid" aria-label="Zakres Cube Chess Premium">
        <article>
          <StatusBadge value="AVAILABLE NOW" />
          <h2>Działa teraz</h2>
          <ul>{offer.availableNow.map(item => <li key={item}>{item}</li>)}</ul>
          <ul>
            <li>3 plansze: Cube Chess 512, Classic Black &amp; White i Lab LEDColor</li>
            <li>Figury z osobnymi presetami i edytowalnym własnym promptem</li>
            <li>Lokalne generowanie glTF + PNG + manifest QA</li>
            <li>Premium V2: dokładniejsze bryły Staunton + BaseColor, Normal, packed ORM i Emissive</li>
            <li>Generator podstawowej gry: blueprint + plansza 3D + 6 typów figur 3D</li>
            <li>Biblioteka produkcyjnych promptów dla pełnego zestawu figur i plansz</li>
            <li>Plan legalnego self-play i treningu przeciwnika z prywatnego źródła właściciela</li>
          </ul>
        </article>
        <article>
          <StatusBadge value="OWNER ARCHIVE INTAKE" />
          <h2>Oryginalny pakiet modeli właściciela</h2>
          <ul>{offer.intakePending.map(item => <li key={item}>{item}</li>)}</ul>
          <p>Po pobraniu paczki właściciela pliki mają przejść manifest, SHA-256, kontrolę skali/pivotu/UV/PBR oraz podgląd przed zastąpieniem proceduralnych fallbacków.</p>
        </article>
        <article>
          <StatusBadge value="PLANNED" />
          <h2>Usługi produkcyjne</h2>
          <ul>{offer.plannedProductionServices.map(item => <li key={item}>{item}</li>)}</ul>
          <p>Cena produkcyjna nie została ustalona. Ten prototyp nie pobiera danych płatniczych.</p>
        </article>
      </section>

      <section className="cube-premium-boundary">
        <p className="cube-premium-kicker">UCZCIWA GRANICA TESTU</p>
        <h2>Premium dotyczy tylko Cube Chess</h2>
        <p>To lokalna demonstracja przepływu produktu. Nie tworzy konta, koszyka Shopify, zamówienia, płatności ani odnawialnej subskrypcji. Nie wykonuje połączeń sieciowych.</p>
        <p>Pełna ścieżka oceniana przez jurorów pozostaje bezpłatna i bez logowania. Terra Observation oraz stacje badawcze nie są objęte subskrypcją.</p>
      </section>
    </div>
  )
}
