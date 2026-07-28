import { APP_BG } from '@shared/config'
import { GAME_ROOM_CSS } from '@shared/gameRoomCss'
import { LOBBY_UI_CSS } from '@shared/lobbyUiCss'

export interface InjectionStyle {
  id: string
  /** Glob-ish path prefix; empty = all allowed pages */
  match?: string[]
  css: string
}

export interface InjectionScript {
  id: string
  match?: string[]
  runAt: 'document-start' | 'document-end'
  /** Runs in page world via executeJavaScript */
  code: string
}

function pathMatches(url: string, patterns: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return true
  try {
    const { pathname } = new URL(url)
    return patterns.some((p) => {
      if (p.endsWith('*')) return pathname.startsWith(p.slice(0, -1))
      return pathname === p || pathname.startsWith(`${p}/`)
    })
  } catch {
    return false
  }
}

export const HIDE_FOOTER_CSS = `
footer.p-footer,
.p-footer {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
}
`

export const HIDE_BANNERS_CSS = `
.p-play__right-banners,
.p-play__banners-slider,
.p-play-new-banners,
.p-play-new-banners__iframe,
.p-play__right-pagination {
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
`

/** Profile lives in the Electron titlebar — hide site header user widget. */
export const HIDE_SITE_PROFILE_CSS = `
.p-header__userCont-desktop,
.p-header__userCont,
.p-header__userCont-user,
.p-header__userCont-dropdown {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}
`

/**
 * break-search modal is mirrored in chrome SearchBanner — hide the site dialog
 * (and its overlay) so it doesn't flash / block the lobby.
 */
export const HIDE_BREAK_SEARCH_MODAL_CSS = `
.v--modal-box:has(.modal-break-search__wrapper),
.v--modal-box:has(.modal-break-search__header),
body:has(.modal-break-search__wrapper) .v--modal-overlay,
body:has(.modal-break-search__header) .v--modal-overlay {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
`

/** Nav moved into Electron side menu — hide site header links. */
export const HIDE_SITE_NAV_CSS = `
.p-header__menu,
.p-header__menu-button,
.p-header__logo,
.p-header__logo-image {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}
`

/**
 * Site uses fixed grid: `56.5rem 26.09rem` + side margins → wider than Electron window.
 * Collapse to one fluid column that never exceeds the viewport.
 */
export const EXPAND_CENTER_CSS = `
html,
body,
#__nuxt,
#app {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

.p-play__profile-container,
.p-play__profile,
.p-play__right-banners,
.p-play__banners-slider,
.p-play-new-banners,
.p-play-new-banners__iframe,
.p-play__right-pagination {
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
  /* visible: hover .p-play__participants must not be clipped */
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

/* label + "Создать лобби" — label must NOT be width:100% (pushes button past viewport) */
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

/* Search + create live in Electron side menu */
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

/* Play tab: 4 columns (join is display:none) */
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

/* players cell hosts absolute .p-play__participants popover — never clip */
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

${LOBBY_UI_CSS}
`

/** Match Electron chrome background so the site doesn't flash a different color. */
export const APP_THEME_CSS = `
:root {
  --polemica-client-bg: ${APP_BG};
  color-scheme: dark;
}

html,
body {
  background: ${APP_BG} !important;
  background-color: ${APP_BG} !important;
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
  background-color: ${APP_BG} !important;
  background-image: none !important;
}
`

/** Client reskin / Tampermonkey-style patches for the embedded site. */
export const INJECTION_STYLES: InjectionStyle[] = [
  {
    id: 'app-theme-bg',
    css: APP_THEME_CSS
  },
  {
    id: 'game-room-bg',
    match: ['/game'],
    css: GAME_ROOM_CSS
  },
  {
    id: 'hide-footer',
    css: HIDE_FOOTER_CSS
  },
  {
    id: 'hide-banners',
    css: HIDE_BANNERS_CSS
  },
  {
    id: 'hide-site-profile',
    css: HIDE_SITE_PROFILE_CSS
  },
  {
    id: 'hide-site-nav',
    css: HIDE_SITE_NAV_CSS
  },
  {
    id: 'hide-break-search-modal',
    css: HIDE_BREAK_SEARCH_MODAL_CSS
  },
  {
    id: 'expand-center',
    css: EXPAND_CENTER_CSS
  }
]

/** Prefer game preload for observers — executeJavaScript can deadlock with MutationObserver. */
export const INJECTION_SCRIPTS: InjectionScript[] = []

export function stylesForUrl(url: string): InjectionStyle[] {
  return INJECTION_STYLES.filter((s) => pathMatches(url, s.match))
}

export function scriptsForUrl(url: string, runAt: InjectionScript['runAt']): InjectionScript[] {
  return INJECTION_SCRIPTS.filter((s) => s.runAt === runAt && pathMatches(url, s.match))
}
