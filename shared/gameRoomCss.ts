import { APP_BG } from './config'

/**
 * /game room shell → match Electron chrome (#0b0f14).
 * Site sizes .game-room to ~66vh (browser header math); fill the WebContentsView instead.
 * Glow overlays stay as <img> — we only kill CSS background-* on the shell.
 * Also restyles CommonRoomModal (camera/mic gate) into a compact client plate.
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

/* —— Common room modal (camera / mic gate, confirms) —— */
body:has(.common-room-modal.default-modal) .full-page {
  background: rgba(11, 15, 20, 0.72) !important;
  backdrop-filter: blur(10px) saturate(1.05) !important;
  -webkit-backdrop-filter: blur(10px) saturate(1.05) !important;
}

.common-room-modal.default-modal {
  position: fixed !important;
  left: 50% !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 10050 !important;
  box-sizing: border-box !important;
  width: min(400px, calc(100vw - 32px)) !important;
  max-width: 400px !important;
  margin: 0 !important;
  padding: 26px 24px 22px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 10px !important;
  text-align: center !important;
  border-radius: 18px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: #101418 !important;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.35),
    0 28px 56px rgba(0, 0, 0, 0.55) !important;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Text',
    'Helvetica Neue',
    Helvetica,
    Arial,
    sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  letter-spacing: -0.015em !important;
  color: #e8eef6 !important;
  animation: polemica-av-pop 0.22s ease-out !important;
}

@keyframes polemica-av-pop {
  from {
    opacity: 0;
    transform: translate(-50%, -46%) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.common-room-modal.default-modal .title {
  margin: 0 !important;
  padding: 0 !important;
  max-width: 32ch !important;
  color: #f5f7f2 !important;
  font-size: 18px !important;
  font-weight: 650 !important;
  line-height: 1.25 !important;
  letter-spacing: -0.02em !important;
}

.common-room-modal.default-modal .description {
  margin: 0 !important;
  padding: 0 !important;
  max-width: 36ch !important;
  color: rgba(232, 238, 246, 0.58) !important;
  font-size: 13.5px !important;
  font-weight: 450 !important;
  line-height: 1.45 !important;
  white-space: normal !important;
}

.common-room-modal.default-modal .buttons-wrapper {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  width: 100% !important;
  margin-top: 10px !important;
}

.common-room-modal.default-modal .buttons-wrapper.is-confirmation {
  flex-direction: row !important;
}

.common-room-modal.default-modal .button-comp,
.common-room-modal.default-modal button.button-comp {
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  max-width: none !important;
  min-height: 44px !important;
  height: 44px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  border-radius: 12px !important;
  border: 0 !important;
  border-color: transparent !important;
  outline: none !important;
  box-shadow: none !important;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Text',
    'Helvetica Neue',
    Helvetica,
    Arial,
    sans-serif !important;
  font-size: 14px !important;
  font-weight: 650 !important;
  letter-spacing: -0.02em !important;
  cursor: pointer !important;
  transition:
    background 0.14s ease,
    filter 0.14s ease,
    transform 0.12s ease !important;
}

.common-room-modal.default-modal .button-comp.outline,
.common-room-modal.default-modal button.button-comp.outline,
.common-room-modal.default-modal .button-comp.outline[class],
.polemica-av-gate .button-comp,
.polemica-av-gate button.button-comp {
  background: #1677ff !important;
  background-color: #1677ff !important;
  background-image: none !important;
  border: 0 !important;
  border-color: transparent !important;
  color: #fff !important;
  --main-color: #1677ff !important;
  --text-color: #fff !important;
  --hover-color: #4096ff !important;
  --hover-border-color: #4096ff !important;
  --hover-text-color: #fff !important;
  --hover-text-color-inverted: #fff !important;
  --is-transparent: false !important;
}

.common-room-modal.default-modal .button-comp.outline:hover,
.common-room-modal.default-modal .button-comp.outline:focus,
.common-room-modal.default-modal button.button-comp.outline:hover,
.common-room-modal.default-modal button.button-comp.outline:focus,
.polemica-av-gate .button-comp:hover,
.polemica-av-gate .button-comp:focus {
  background: #4096ff !important;
  background-color: #4096ff !important;
  background-image: none !important;
  border: 0 !important;
  border-color: transparent !important;
  color: #fff !important;
  filter: none !important;
  opacity: 1 !important;
}

.common-room-modal.default-modal .button-comp.inverted,
.common-room-modal.default-modal button.button-comp.inverted {
  background: rgba(255, 255, 255, 0.06) !important;
  background-color: rgba(255, 255, 255, 0.06) !important;
  color: #e8eef6 !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  width: 100% !important;
}

.common-room-modal.default-modal .button-comp:active,
.polemica-av-gate .button-comp:active {
  transform: scale(0.985) !important;
  opacity: 1 !important;
}

/* AV-specific gate plate */
.common-room-modal.default-modal.polemica-av-gate {
  padding-top: 22px !important;
  gap: 12px !important;
}

.polemica-av-gate__icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 56px !important;
  height: 56px !important;
  margin: 0 0 2px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(22, 119, 255, 0.35) !important;
  background: rgba(22, 119, 255, 0.12) !important;
  color: #1677ff !important;
  flex: 0 0 auto !important;
}

.polemica-av-gate__icon svg {
  display: block !important;
}
`
