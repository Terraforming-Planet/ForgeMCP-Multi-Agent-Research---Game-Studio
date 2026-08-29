import { useMemo, useState } from 'react'
import { webmcpTools } from '../webmcp/registry'
import { StatusBadge } from './StatusBadge'

const domains = ['all', 'terra', 'cube', 'research', 'ai', 'visual', 'verification', 'system']

export function ToolInspector() {
  const [filter, setFilter] = useState('all')

  const items = useMemo(
    () =>
      webmcpTools.filter((tool) => {
        if (filter === 'all') return true
        if (filter === 'research') return tool.domain === 'terra'
        if (filter === 'ai') return tool.domain === 'cube'
        return tool.domain === filter
      }),
    [filter],
  )

  return (
    <section className="card">
      <h2>WebMCP Tool Inspector</h2>
      <div className="toolbar">
        {domains.map((domain) => (
          <button key={domain} type="button" onClick={() => setFilter(domain)}>
            {domain.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Domain</th>
              <th>Read/Write</th>
              <th>Connection</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tool) => (
              <tr key={tool.name}>
                <td>{tool.name}</td>
                <td>{tool.domain.toUpperCase()}</td>
                <td>{tool.readOnly ? 'READ-ONLY' : 'WRITE'}</td>
                <td>
                  <StatusBadge value={tool.connectionStatus} />
                </td>
                <td>{tool.verificationPolicy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
