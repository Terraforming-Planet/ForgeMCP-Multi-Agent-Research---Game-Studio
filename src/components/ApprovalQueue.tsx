import { useState } from 'react'
import type { HumanApprovalItem } from '../types/core'

const initial: HumanApprovalItem[] = [
  {
    id: 'approval-1',
    action: 'PROMOTE_AI_CANDIDATE',
    requestingAgent: 'Tournament Evaluator',
    reason: 'Candidate passed legality and benchmark gate.',
    evidence: ['20 legal games', 'No illegal moves'],
    risk: 'Potential regression on unseen openings',
    reversibility: 'Rollback supported',
    verification: 'Regression suite PASS',
  },
]

export function ApprovalQueue() {
  const [items, setItems] = useState(initial)

  const decide = (id: string, decision: 'APPROVE' | 'REJECT') => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, decision } : item)),
    )
  }

  return (
    <section className="card">
      <h2>Human Approval Queue</h2>
      {items.map((item) => (
        <article key={item.id} className="approval-item">
          <h3>{item.action}</h3>
          <p>Agent: {item.requestingAgent}</p>
          <p>Reason: {item.reason}</p>
          <p>Risk: {item.risk}</p>
          <p>Reversibility: {item.reversibility}</p>
          <p>Verification: {item.verification}</p>
          <p>Evidence: {item.evidence.join('; ')}</p>
          <div className="toolbar">
            <button type="button" onClick={() => decide(item.id, 'APPROVE')}>Approve</button>
            <button type="button" onClick={() => decide(item.id, 'REJECT')}>Reject</button>
            {item.decision ? <strong>{item.decision}</strong> : null}
          </div>
        </article>
      ))}
    </section>
  )
}
