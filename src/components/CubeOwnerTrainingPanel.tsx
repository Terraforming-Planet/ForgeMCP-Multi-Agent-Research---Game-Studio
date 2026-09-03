import { useMemo, useState } from 'react'
import { OWNER_CUBE_PROMPTS, OWNER_CUBE_SOURCE, OWNER_OPPONENT_TRAINING_PLAN } from '../data/ownerCubePipeline'
import { StatusBadge } from './StatusBadge'

export function CubeOwnerTrainingPanel() {
  const [promptId, setPromptId] = useState('knight')
  const [copyState, setCopyState] = useState('')
  const selected = useMemo(() => OWNER_CUBE_PROMPTS.find(item => item.id === promptId) ?? OWNER_CUBE_PROMPTS[0], [promptId])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(selected.prompt)
      setCopyState('Prompt skopiowany. Możesz wkleić go do pola własnego promptu powyżej albo przekazać agentowi modelującemu.')
    } catch {
      setCopyState('Przeglądarka zablokowała schowek — zaznacz tekst promptu ręcznie.')
    }
  }

  return <section className="cube-premium-agent" aria-label="Owner-authorized Cube asset and AI pipeline">
    <div className="cube-premium-section-heading">
      <div>
        <p className="cube-premium-kicker">WŁAŚCICIEL ZATWIERDZIŁ ŹRÓDŁO · MODELOWANIE · TEKSTURY · AI PRZECIWNIKA</p>
        <h2>Arena Chess jako prywatne źródło treningowe Cube Chess</h2>
      </div>
      <StatusBadge value="OWNER AUTHORIZED" />
    </div>
    <p>Zakres użycia: {OWNER_CUBE_SOURCE.scope.join(' · ')}. Prywatne pliki treningowe nie są kopiowane do publicznego repozytorium ForgeMCP; przenosimy wyłącznie zatwierdzoną metodologię, wymagania jakościowe i wyniki po weryfikacji.</p>

    <div className="grid two">
      <div>
        <label htmlFor="owner-cube-prompt">Prompt produkcyjny modelu / planszy</label>
        <select id="owner-cube-prompt" value={promptId} onChange={event => { setPromptId(event.target.value); setCopyState('') }}>
          {OWNER_CUBE_PROMPTS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select>
        <textarea aria-label="Zaawansowany prompt produkcyjny Cube Chess" rows={18} readOnly value={selected.prompt} />
        <div className="toolbar"><button type="button" onClick={copyPrompt}>Kopiuj ten prompt</button></div>
        {copyState ? <p role="status" className="lab-note">{copyState}</p> : null}
      </div>
      <div>
        <h3>Trening przeciwnika komputerowego</h3>
        <ol>{OWNER_OPPONENT_TRAINING_PLAN.map(item => <li key={item}>{item}</li>)}</ol>
        <p className="lab-note"><b>Zasada:</b> {OWNER_CUBE_SOURCE.opponentRule}</p>
        <p className="lab-note"><b>Prywatność źródła:</b> {OWNER_CUBE_SOURCE.publicationRule}</p>
        <StatusBadge value="LEGAL SELF-PLAY + DETERMINISTIC FALLBACK" />
      </div>
    </div>
  </section>
}
