import { BrowserWindow, session } from 'electron'
import {
  BAN_BANNER_HEIGHT,
  CHROME_HEIGHT,
  GAME_START_URL,
  SEARCH_PLAY_BANNER_HEIGHT,
  SIDE_MENU_OFFSET,
  TRAFFIC_LIGHTS
} from '@shared/config'
import type { AuthPhase, AuthState, UserProfile } from '@shared/ipc'
import { IpcChannels } from '@shared/ipc'
import { importPolemicaCookiesFromChrome } from './chromeCookies'
import { clearCachedProfile, loadCachedProfile, scrapeProfileFromPage } from './profile'
import {
  getGameView,
  layoutGameView,
  loadGameUrl,
  loadGameUrlReliable,
  prepareGameViewUnderChrome,
  setGameViewVisible,
  setSessionWatch
} from '../views/GameBrowserView'
import {
  startLiveStatsPolling,
  stopLiveStatsPolling,
  unbindLiveStatsWindow
} from '../live/liveStatsService'
import {
  getBanStatus,
  onBanStatusChange,
  startBanStatusPolling,
  stopBanStatusPolling,
  unbindBanStatusWindow
} from '../ban/banStatusService'
import {
  getSearchStatus,
  onSearchStatusChange,
  refreshSearchStatus,
  startSearchStatusPolling,
  stopSearchStatusPolling,
  unbindSearchStatusWindow
} from '../search/searchStatusService'
import { closeLivePlayersMenu, destroyLivePlayersMenu, prewarmLivePlayersMenu } from '../chrome/livePlayersPopup'
import { closePlayActionMenu, destroyPlayActionMenu } from '../chrome/playActionMenuPopup'

let phase: AuthPhase = 'splash'
let profile: UserProfile | null = null
let error: string | null = null
let busy = false
let hostWindow: BrowserWindow | null = null
let chromeOverlay = false

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.AUTH_STATE, getAuthState())
}

export function getAuthState(): AuthState {
  return { phase, profile, error, busy }
}

export function bindAuthWindow(win: BrowserWindow): void {
  hostWindow = win
  profile = loadCachedProfile()
  phase = 'splash'
  error = null
  busy = false
  chromeOverlay = false

  if (process.platform === 'darwin') {
    win.setWindowButtonPosition(TRAFFIC_LIGHTS.default)
  }

  setSessionWatch({
    shouldWatch: () => phase === 'app' && !busy,
    onLogout: () => {
      void logout()
    }
  })

  onBanStatusChange(() => {
    if (!hostWindow || hostWindow.isDestroyed()) return
    if (phase === 'app') layoutForPhase(hostWindow)
  })

  onSearchStatusChange(() => {
    if (!hostWindow || hostWindow.isDestroyed()) return
    if (phase === 'app') layoutForPhase(hostWindow)
  })

  layoutForPhase(win)
  emit()
}

/** Release window-bound services without clearing the cached login profile. */
export function disposeAuthWindow(win: BrowserWindow): void {
  if (hostWindow !== win) return

  phase = 'splash'
  busy = false
  chromeOverlay = false
  setSessionWatch(null)
  onBanStatusChange(null)
  onSearchStatusChange(null)
  stopLiveStatsPolling()
  stopBanStatusPolling()
  stopSearchStatusPolling()
  closeLivePlayersMenu()
  destroyLivePlayersMenu()
  closePlayActionMenu()
  destroyPlayActionMenu()
  unbindLiveStatsWindow(win)
  unbindBanStatusWindow(win)
  unbindSearchStatusWindow(win)
  hostWindow = null
}

function chromeHeightForApp(): number {
  const search = getSearchStatus()
  let h = CHROME_HEIGHT
  if (getBanStatus().visible) h += BAN_BANNER_HEIGHT
  else if (search.visible || search.playVisible || search.noticeTitle || search.noticeText) {
    h += SEARCH_PLAY_BANNER_HEIGHT
  }
  return h
}

function layoutForPhase(win: BrowserWindow): void {
  if (phase === 'app') {
    layoutGameView(
      win,
      chromeHeightForApp(),
      chromeOverlay ? SIDE_MENU_OFFSET : 0,
      chromeOverlay
    )
  } else {
    chromeOverlay = false
    if (process.platform === 'darwin') {
      win.setWindowButtonPosition(TRAFFIC_LIGHTS.default)
    }
    layoutGameView(win, win.getContentSize()[1])
  }
}

/** Open left side menu — pushes game, repositions traffic lights into the card. */
export function setChromeOverlay(open: boolean): { viewX: number } {
  chromeOverlay = open && phase === 'app'
  if (!hostWindow || hostWindow.isDestroyed()) {
    return { viewX: 0 }
  }

  if (process.platform === 'darwin') {
    hostWindow.setWindowButtonPosition(chromeOverlay ? TRAFFIC_LIGHTS.menu : TRAFFIC_LIGHTS.default)
  }
  layoutForPhase(hostWindow)

  const viewX = Math.max(0, Math.round(getGameView()?.getBounds().x ?? 0))

  // One deferred scrape after lobby reflows to the new width — avoid burst inset jumps.
  refreshSearchStatus()
  setTimeout(() => refreshSearchStatus(), 220)

  return { viewX }
}

export function relayoutAuth(win: BrowserWindow): void {
  layoutForPhase(win)
}

async function applySessionAndScrape(): Promise<UserProfile> {
  const view = getGameView()
  if (!view) throw new Error('Game view не готов')
  if (!hostWindow || hostWindow.isDestroyed()) throw new Error('Окно не готово')

  // Avoid 0-height WebContentsView while splash is up (can cause ERR_TIMED_OUT)
  prepareGameViewUnderChrome(hostWindow)

  await loadGameUrlReliable(GAME_START_URL, 3)

  // Nuxt may hydrate header after first paint
  let lastError: Error | null = null
  for (let i = 0; i < 12; i++) {
    try {
      return await scrapeProfileFromPage((code) => view.webContents.executeJavaScript(code, true))
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      await new Promise((r) => setTimeout(r, 400))
    }
  }
  throw lastError ?? new Error('Не удалось прочитать профиль')
}

export async function loginWithChrome(): Promise<AuthState> {
  if (busy) return getAuthState()
  busy = true
  error = null
  emit()

  try {
    await importPolemicaCookiesFromChrome()
    profile = await applySessionAndScrape()
    phase = 'greeting'
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    phase = 'splash'
    console.error('[auth] loginWithChrome failed', err)
  } finally {
    busy = false
    // Hide game BEFORE React switches splash → greeting
    if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
    emit()
  }

  return getAuthState()
}

export async function resumeSession(): Promise<AuthState> {
  if (busy) return getAuthState()
  if (!profile) {
    error = 'Нет сохранённого профиля'
    emit()
    return getAuthState()
  }

  busy = true
  error = null
  emit()

  try {
    try {
      profile = await applySessionAndScrape()
    } catch (firstErr) {
      console.warn('[auth] resume with stored cookies failed, re-sync Chrome', firstErr)
      // Stale Electron session / timed-out load → pull fresh cookies from Chrome
      await importPolemicaCookiesFromChrome()
      profile = await applySessionAndScrape()
    }
    phase = 'greeting'
  } catch (err) {
    error =
      err instanceof Error
        ? `${err.message} Попробуй «Войти через Chrome».`
        : String(err)
    phase = 'splash'
    console.error('[auth] resumeSession failed', err)
  } finally {
    busy = false
    if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
    emit()
  }

  return getAuthState()
}

export async function enterApp(): Promise<AuthState> {
  if (!profile) {
    error = 'Сначала войди через Chrome'
    emit()
    return getAuthState()
  }

  phase = 'app'
  error = null
  startLiveStatsPolling()
  startBanStatusPolling()
  startSearchStatusPolling()
  if (hostWindow && !hostWindow.isDestroyed()) {
    layoutForPhase(hostWindow)
    setGameViewVisible(true)
    prewarmLivePlayersMenu(hostWindow)
    const view = getGameView()
    if (view && !view.webContents.isDestroyed()) {
      const url = view.webContents.getURL()
      if (!url.includes('polemicagame.com')) {
        await loadGameUrl(GAME_START_URL)
      }
    }
  }
  emit()
  return getAuthState()
}

export async function logout(): Promise<AuthState> {
  if (busy) return getAuthState()
  if (phase === 'splash' && !profile) return getAuthState()

  busy = true
  emit()
  try {
    const ses = session.fromPartition('persist:polemica-game')
    const cookies = await ses.cookies.get({})
    await Promise.all(
      cookies
        .filter((c) => (c.domain || '').includes('polemicagame.com'))
        .map((c) => {
          const host = (c.domain || 'polemicagame.com').replace(/^\./, '')
          return ses.cookies.remove(`https://${host}${c.path || '/'}`, c.name)
        })
    )
    clearCachedProfile()
    profile = null
    phase = 'splash'
    error = null
    stopLiveStatsPolling()
    stopBanStatusPolling()
    stopSearchStatusPolling()
    const view = getGameView()
    if (view && !view.webContents.isDestroyed()) {
      await view.webContents.loadURL('about:blank')
    }
  } finally {
    busy = false
    if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
    emit()
  }
  return getAuthState()
}
