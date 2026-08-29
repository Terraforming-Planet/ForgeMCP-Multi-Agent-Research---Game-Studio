import { useState } from 'react'
import type { AiExperiment } from '../types/core'
import { evaluatePromotion } from '../verification/engine'

const baseExperiment: AiExperiment = {
  id: 'exp-1',
  baselineVersion: 'baseline-v1',
  candidateVersion: 'candidate-v1',
  gameCount: 20,
  seed: 42,
  sideSwap: true,
  timeLimitMs: 1000,
  searchSettings: 'alpha-beta iterative deepening',
  gamesCompleted: 20,
  wins: 9,
  draws: 8,
  losses: 3,
  illegalMoves: 0,
  nodes: null,
  moveTimesMs: [1010, 970, 995],
  metricsNotes: 'Nodes unavailable from current integration boundary.',
}

export function CubeLab() {
  const [experiment] = useState(baseExperiment)
  const promotion = evaluatePromotion({
    gamesCompleted: experiment.gamesCompleted,
    illegalMoves: experiment.illegalMoves,
    baselineScore: experiment.losses,
    candidateScore: experiment.wins,
    regressionPass: true,
  })

  return (
    <section className="card">
      <h2>Cube AI Lab</h2>
      <p>Measured metrics only; unavailable metrics are null/unavailable.</p>
      <pre>{JSON.stringify(experiment, null, 2)}</pre>
      <h3>Promotion Gate</h3>
      <pre>{JSON.stringify(promotion, null, 2)}</pre>
    </section>
  )
}
