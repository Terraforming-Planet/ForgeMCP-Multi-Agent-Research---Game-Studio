import { useState } from 'react'
import { StatusBadge } from './StatusBadge'

export function LiveProjectFrame({
  title,
  url,
  description,
  loadLabel = 'Load interactive project',
  instructions,
}: {
  title: string
  url: string
  description: string
  loadLabel?: string
  instructions?: string
}) {
  const [requested, setRequested] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="live-project">
      <div className="lab-section-title">
        <div><p className="eyebrow">LIVE OPEN-SOURCE PROJECT · LOADS ON REQUEST</p><h3>{title}</h3></div>
        <StatusBadge value={requested ? loaded ? 'LOADED' : 'LOADING' : 'READY'} />
      </div>
      <p>{description}</p>
      {instructions ? <p className="lab-note"><b>Inside the source project:</b> {instructions}</p> : null}
      <div className="toolbar">
        <button type="button" className="lab-primary" onClick={() => { setRequested(true); setLoaded(false) }}>{requested ? 'Reload embedded project' : loadLabel}</button>
        <a className="button-link" href={url} target="_blank" rel="noreferrer">Open full screen ↗</a>
      </div>
      {requested ? <div className="live-project__frame-wrap">
        {!loaded ? <div className="live-project__loading" role="status">Loading the original public deployment…</div> : null}
        <iframe
          title={title}
          src={url}
          loading="lazy"
          allow="fullscreen; gamepad"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-pointer-lock"
          onLoad={() => setLoaded(true)}
        />
        <p>If the embedded WebGL view is blank on this device, use “Open full screen”. The source app stays on its original domain and ForgeMCP does not claim control of its internal state.</p>
      </div> : <div className="live-project__poster"><span>▶</span><b>{loadLabel}</b><small>No heavy WebGL payload is downloaded until you press the button.</small></div>}
    </div>
  )
}
