import './reviewerDirectProjectLinks.css'
import { CUBE_PUBLIC_URL } from './integrations/cube/adapter'
import { TERRA_APP_URL } from './integrations/terra/adapter'

export function applyReviewerDirectProjectLinks() {
  const hero = document.querySelector<HTMLElement>('.reviewer-hero')
  if (!hero || hero.querySelector('[data-reviewer-project-links="true"]')) return false

  const actions = document.createElement('div')
  actions.className = 'reviewer-direct-project-links'
  actions.dataset.reviewerProjectLinks = 'true'
  actions.setAttribute('aria-label', 'Open the two live public projects')

  const terra = document.createElement('a')
  terra.href = TERRA_APP_URL
  terra.className = 'reviewer-direct-project-link reviewer-direct-project-link--terra'
  terra.dataset.directProject = 'terra'
  terra.textContent = 'OPEN TERRA OBSERVATORY'

  const cube = document.createElement('a')
  cube.href = CUBE_PUBLIC_URL
  cube.className = 'reviewer-direct-project-link reviewer-direct-project-link--cube'
  cube.dataset.directProject = 'cube'
  cube.textContent = 'OPEN CUBE CHESS 512 AI'

  actions.append(terra, cube)
  hero.append(actions)
  return true
}

export function installReviewerDirectProjectLinks() {
  if (typeof document === 'undefined') return

  const apply = () => applyReviewerDirectProjectLinks()
  if (apply()) return

  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
