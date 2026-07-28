/** Single source of truth for app constants (main + renderer). */

export const APP_NAME = 'Polemica Client'

export const APP_DISPLAY_NAME = 'Polemica Unofficial Client'

/** Keep in sync with package.json version. */
export const APP_VERSION = '1.0.0'

export const GAME_ORIGIN = 'https://polemicagame.com'

/** Target page that the embedded BrowserView opens on launch. */
export const GAME_START_URL = `${GAME_ORIGIN}/game-search`

/** Height of the React chrome above the BrowserView (px). */
export const CHROME_HEIGHT = 68

/** Extra chrome height when search-ban / searching banner is visible. */
export const BAN_BANNER_HEIGHT = 70

/** Extra chrome height for play/search row (modes + Играть / статус в одну линию). */
export const SEARCH_PLAY_BANNER_HEIGHT = 96

/** Apple-settings-style side menu geometry */
export const SIDE_MENU_INSET = 12
export const SIDE_MENU_GAP = 10
export const SIDE_MENU_WIDTH = 268

/** Total X offset for game view when side menu is open */
export const SIDE_MENU_OFFSET = SIDE_MENU_INSET + SIDE_MENU_WIDTH + SIDE_MENU_GAP

export const TRAFFIC_LIGHTS = {
  default: { x: 18, y: 22 },
  /** Inside the inset menu card (matches SIDE_MENU_INSET + inner pad) */
  menu: { x: SIDE_MENU_INSET + 14, y: SIDE_MENU_INSET + 14 }
} as const

/** App / site shell background — keep chrome + embedded page in sync. */
export const APP_BG = '#0b0f14'

export const WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 900,
  minHeight: 600
} as const

/** Domains the game view is allowed to navigate to. */
export const ALLOWED_ORIGINS = [GAME_ORIGIN] as const
