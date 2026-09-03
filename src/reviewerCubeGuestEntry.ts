import { CUBE_PUBLIC_URL } from './integrations/cube/adapter'

export const CUBE_GUEST_URL = `${CUBE_PUBLIC_URL}?guest=1`

export function applyReviewerCubeGuestEntry() {
  document.querySelectorAll<HTMLAnchorElement>('a[data-cube-public-entry="true"]').forEach(anchor => {
    anchor.href = CUBE_GUEST_URL
    anchor.dataset.cubeGuestEntry = 'true'
  })
}

let scheduled = false
function scheduleApply() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    applyReviewerCubeGuestEntry()
  })
}

export function installReviewerCubeGuestEntry() {
  if (typeof document === 'undefined') return

  // Register this capture handler before reviewerCubePublicEntry installs its
  // generic public-game handler. An explicit guest URL selects Cube's existing
  // anonymous guest mode; it does not grant an authenticated account.
  document.addEventListener('click', event => {
    const target = event.target as Element | null
    const anchor = target?.closest<HTMLAnchorElement>('a[data-cube-public-entry="true"]')
    if (!anchor || event.defaultPrevented) return
    if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    window.location.assign(CUBE_GUEST_URL)
  }, true)

  scheduleApply()
  const observer = new MutationObserver(scheduleApply)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', scheduleApply)
}
