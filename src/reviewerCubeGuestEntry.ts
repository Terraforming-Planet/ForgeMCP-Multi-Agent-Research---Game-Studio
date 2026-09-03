import { CUBE_PUBLIC_URL } from './integrations/cube/adapter'

// Dedicated reviewer entry built by Cube as a second Vite HTML entry.
// Using a distinct path avoids stale root-index cache while still loading the same public game runtime.
export const CUBE_GUEST_REVISION = 'e022239d15379127c4cda45e4b581b33ad48201c'
export const CUBE_GUEST_URL = `${CUBE_PUBLIC_URL}guest.html?rev=${CUBE_GUEST_REVISION}`

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

  // Use Cube's existing anonymous guest path. This does not create an account
  // or grant account/ranking/multiplayer privileges.
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
