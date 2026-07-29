/**
 * Preload for the embedded Polemica WebContentsView (isolated world).
 * Runs before page scripts — closest thing to Tampermonkey @run-at document-start.
 */

import { GAME_ROOM_CSS } from '@shared/gameRoomCss'
import { LOBBY_UI_CSS } from '@shared/lobbyUiCss'
import { LOBBY_ACCORDION_JS } from '@shared/lobbyAccordionJs'
import { LOBBY_FILTERS_JS } from '@shared/lobbyFiltersJs'
import { LOBBY_UNPAGINATE_JS } from '@shared/lobbyUnpaginateJs'
import { GAME_AV_GATE_JS } from '@shared/avGateModalJs'
import { CAMERA_OFF_ON_LOBBY_JS } from '@shared/cameraOffOnLobbyJs'

const BOOT_LOADER_STYLE_ID = 'polemica-boot-loader-style'
const BOOT_LOADER_ID = 'polemica-boot-loader'

function ensureBootLoader(): void {
  const root = document.documentElement
  if (!root) return

  if (!document.getElementById(BOOT_LOADER_STYLE_ID)) {
    const style = document.createElement('style')
    style.id = BOOT_LOADER_STYLE_ID
    style.textContent = `
      #${BOOT_LOADER_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #0b0f14 !important;
        pointer-events: all !important;
      }
      #${BOOT_LOADER_ID}::before {
        content: '' !important;
        width: 36px !important;
        height: 36px !important;
        border-radius: 50% !important;
        border: 2.5px solid rgba(255, 255, 255, 0.12) !important;
        border-top-color: #1677ff !important;
        animation: polemica-boot-spin 0.7s linear infinite !important;
      }
      @keyframes polemica-boot-spin {
        to { transform: rotate(360deg); }
      }
    `
    root.appendChild(style)
  }

  if (!document.getElementById(BOOT_LOADER_ID)) {
    const el = document.createElement('div')
    el.id = BOOT_LOADER_ID
    el.setAttribute('aria-busy', 'true')
    ;(document.body || root).appendChild(el)
  }
}

const CLIENT_CSS = `
:root {
  --polemica-client-bg: #0b0f14;
  color-scheme: dark;
}

html,
body {
  background: #0b0f14 !important;
  background-color: #0b0f14 !important;
  background-image: none !important;
}

html body,
html body #__nuxt,
html body #__nuxt > div,
html body #app,
html body .p-page,
html body .p-main,
html body .layout,
html body .page,
html body [class*="page"],
html body [class*="layout"],
html body [class*="wrapper"],
html body [class*="container"] {
  background-color: #0b0f14 !important;
  background-image: none !important;
}

footer.p-footer,
.p-footer,
.p-play__right-banners,
.p-play__banners-slider,
.p-play-new-banners,
.p-play-new-banners__iframe,
.p-play__right-pagination,
.p-header__userCont-desktop,
.p-header__userCont,
.p-header__menu,
.p-header__menu-button,
.p-header__logo,
.p-header__logo-image {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
  flex: 0 0 0 !important;
}

html,
body,
#__nuxt,
#app {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

.p-play__profile-container,
.p-play__profile {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

.p-play,
.p-play.p-play--cultural {
  display: grid !important;
  grid-template: "center" / minmax(0, 1fr) !important;
  grid-template-columns: minmax(0, 1fr) !important;
  grid-template-areas: "center" !important;
  gap: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
  box-sizing: border-box !important;
  overflow: visible !important;
}

.p-play__center {
  grid-area: center !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow: visible !important;
}

.p-play__lobby,
.p-play__lobby-table {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}

.p-play__lobby,
.p-play__lobby-table,
.p-play__lobby-table-delimiter,
.p-play__lobby .pages,
.p-play__lobby .pagination__container {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

.p-play__lobby {
  border-color: transparent !important;
}

.p-play__lobby-search {
  display: flex !important;
  align-items: center !important;
  gap: 1rem !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}

.p-play__lobby-search-label {
  flex: 1 1 0% !important;
  width: auto !important;
  max-width: none !important;
  min-width: 0 !important;
}

.p-play__lobby-search-input {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

.p-play__lobby-search,
.p-play__lobby-search-label,
.p-play__lobby-search-input,
.p-play__lobby-search-button {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.p-play__lobby-search-button ~ .p-play__lobby-search-button {
  display: none !important;
}

.p-play__lobby-table-row,
.p-play__lobby-table-header-row {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1.85fr) minmax(0, 1.7fr) minmax(0, 1.65fr) minmax(0, 1fr) !important;
  overflow: visible !important;
}

.p-play__lobby-table-cell,
.p-search-lobby-name,
.p-search-lobby-type,
.p-search-lobby-status {
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.p-search-lobby-players,
.p-play__lobby-table-cell-players,
.p-play__participants {
  overflow: visible !important;
  max-width: none !important;
  text-overflow: unset !important;
}

.p-play__participants {
  z-index: 50 !important;
}

.p-play__tabs,
.p-play__tab {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

header.p-header,
.p-header,
.p-header__container,
.p-header__wrapper {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  max-height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  border: 0 !important;
}

.p-play,
.p-play.p-play--cultural {
  padding-top: 0 !important;
  margin-top: 0 !important;
}

.p-play__lobby {
  padding-top: 28px !important;
  margin-top: 0 !important;
}

.p-play__lobby-search {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
}
` + LOBBY_UI_CSS + GAME_ROOM_CSS

const HIDE_SELECTORS = [
  'footer.p-footer',
  '.p-footer',
  '.p-play__right-banners',
  '.p-play__banners-slider',
  '.p-play-new-banners',
  '.p-play__profile-container',
  '.p-play__profile'
].join(', ')

function ensureStyle(): void {
  const root = document.head || document.documentElement
  if (!root) return

  let el = document.getElementById('polemica-client-css') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'polemica-client-css'
    root.appendChild(el)
  }
  if (el.textContent !== CLIENT_CSS) {
    el.textContent = CLIENT_CSS
  }

  document.documentElement.style.setProperty('background-color', '#0b0f14', 'important')
  if (document.body) {
    document.body.style.setProperty('background-color', '#0b0f14', 'important')
    document.body.style.setProperty('background-image', 'none', 'important')
  }
}

function shouldHide(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false
  return (
    node.matches(HIDE_SELECTORS) ||
    !!node.querySelector?.(HIDE_SELECTORS)
  )
}

function hideChromeNoise(): void {
  ensureStyle()
  document.querySelectorAll(HIDE_SELECTORS).forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.getAttribute('data-polemica-hidden')) return
    node.style.setProperty('display', 'none', 'important')
    node.setAttribute('hidden', '')
    node.setAttribute('data-polemica-hidden', '1')
  })
}

function injectLobbyAccordion(): void {
  const VER = '8'
  if (document.documentElement.getAttribute('data-polemica-lobby-accordion') === VER) return
  document.documentElement.setAttribute('data-polemica-lobby-accordion', VER)
  const prev = document.getElementById('polemica-lobby-accordion')
  if (prev) prev.remove()
  const s = document.createElement('script')
  s.id = 'polemica-lobby-accordion'
  s.textContent = LOBBY_ACCORDION_JS
  const root = document.head || document.documentElement
  root.appendChild(s)
}

function injectLobbyFilters(): void {
  const VER = '5'
  if (document.documentElement.getAttribute('data-polemica-lobby-filters') === VER) return
  document.documentElement.setAttribute('data-polemica-lobby-filters', VER)
  const prev = document.getElementById('polemica-lobby-filters')
  if (prev) prev.remove()
  const s = document.createElement('script')
  s.id = 'polemica-lobby-filters'
  s.textContent = LOBBY_FILTERS_JS
  const root = document.head || document.documentElement
  root.appendChild(s)
}

function injectLobbyUnpaginate(): void {
  const VER = '5'
  if (document.documentElement.getAttribute('data-polemica-lobby-unpaginate') === VER) return
  document.documentElement.setAttribute('data-polemica-lobby-unpaginate', VER)
  const prev = document.getElementById('polemica-lobby-unpaginate')
  if (prev) prev.remove()
  const s = document.createElement('script')
  s.id = 'polemica-lobby-unpaginate'
  s.textContent = LOBBY_UNPAGINATE_JS
  const root = document.head || document.documentElement
  root.appendChild(s)
}

function injectAvGate(): void {
  const VER = '3'
  if (document.documentElement.getAttribute('data-polemica-av-gate') === VER) return
  document.documentElement.setAttribute('data-polemica-av-gate', VER)
  const prev = document.getElementById('polemica-av-gate')
  if (prev) prev.remove()
  const s = document.createElement('script')
  s.id = 'polemica-av-gate'
  s.textContent = GAME_AV_GATE_JS
  const root = document.head || document.documentElement
  root.appendChild(s)
}

function injectCameraOffOnLobby(): void {
  const VER = '5'
  if (document.documentElement.getAttribute('data-polemica-camera-off') === VER) return
  document.documentElement.setAttribute('data-polemica-camera-off', VER)
  const prev = document.getElementById('polemica-camera-off')
  if (prev) prev.remove()
  const s = document.createElement('script')
  s.id = 'polemica-camera-off'
  s.textContent = CAMERA_OFF_ON_LOBBY_JS
  const root = document.head || document.documentElement
  root.appendChild(s)
}

function start(): void {
  ensureBootLoader()
  hideChromeNoise()
  injectLobbyUnpaginate()
  injectLobbyFilters()
  injectLobbyAccordion()
  injectAvGate()
  injectCameraOffOnLobby()

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement && (node.id === 'polemica-client-css' || node.tagName === 'STYLE')) {
          continue
        }
        if (shouldHide(node)) {
          hideChromeNoise()
          return
        }
        if (node instanceof HTMLElement) ensureStyle()
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true })
}

if (document.documentElement) {
  ensureBootLoader()
  start()
} else {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      ensureBootLoader()
      start()
    },
    { once: true }
  )
}
