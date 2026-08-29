import type { WorkflowEvent } from '../types/core'
import { StatusBadge } from './StatusBadge'

export function Timeline({ events }: { events: WorkflowEvent[] }) {
  return (
    <section className="card">
      <h2>Execution Timeline</h2>
      <ul className="timeline">
        {events.map((event, index) => (
          <li key={`${event.timestamp}-${event.tool}-${index}`}>
            <div>
              <strong>{event.tool}</strong> · {event.integrationTarget.toUpperCase()} · <StatusBadge value={event.status} />
            </div>
            <small>
              {event.timestamp} · {event.durationMs}ms · verification {event.verificationState}
            </small>
            {event.error ? <p className="error">{event.error}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
