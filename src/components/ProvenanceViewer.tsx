import { useState } from 'react'
import type { ProvenanceRecord } from '../types/core'

export function ProvenanceViewer({ records }: { records: ProvenanceRecord[] }) {
  const [json, setJson] = useState(false)

  return (
    <section className="card">
      <h2>Provenance Viewer</h2>
      <button type="button" onClick={() => setJson((v) => !v)}>
        {json ? 'Show human view' : 'Show JSON'}
      </button>
      {json ? (
        <pre>{JSON.stringify(records, null, 2)}</pre>
      ) : (
        <ul>
          {records.map((record, index) => (
            <li key={`${record.timestamp}-${index}`}>
              {record.provider} · {record.dataset} · AOI {record.aoi} · {record.operation} · {record.timestamp}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
