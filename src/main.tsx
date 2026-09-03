import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { installReviewerCubeGuestEntry } from './reviewerCubeGuestEntry'
import { installReviewerCubePublicEntry } from './reviewerCubePublicEntry'

// First mark all primary reviewer Cube links as public-game entries.
// Then apply the explicit anonymous guest URL so the final href is ?guest=1.
installReviewerCubePublicEntry()
installReviewerCubeGuestEntry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
