import { APP_BG } from './config'

/**
 * /game room shell → match Electron chrome (#0b0f14).
 * Site sizes .game-room to ~66vh (browser header math); fill the WebContentsView instead.
 * Glow overlays stay as <img> — we only kill CSS background-* on the shell.
 */
export const GAME_ROOM_CSS = `
html:has(.game-room),
html:has(.game-room) body,
#app:has(.game-room) {
  background: ${APP_BG} !important;
  background-color: ${APP_BG} !important;
  background-image: none !important;
  min-height: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

#app:has(.game-room) {
  min-height: 100vh !important;
  min-height: 100dvh !important;
}

.game-room,
.game-room.desktop-version,
.game-room__wrapper,
.game-room__container,
.game-room__battlefield,
.battlefield,
.controls-wrapper {
  background-color: ${APP_BG} !important;
  background-image: none !important;
}

.game-room,
.game-room.desktop-version {
  width: 100% !important;
  width: 100vw !important;
  height: 100% !important;
  height: 100vh !important;
  height: 100dvh !important;
  max-height: none !important;
  min-height: 100% !important;
  box-sizing: border-box !important;
}

.game-room__wrapper,
.game-room__container {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
}

/* site ambient glows (green/purple/blue PNGs) — kill for solid APP_BG */
.game-room__glow,
.game-room__glow-purple,
.game-room__glow-green,
.game-room__glow-blueFooter,
.game-room__glow-blueLeft,
.game-room__glow-purpleRight {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`
