import { BrowserWindow } from 'electron'
import {
  BAN_BANNER_HEIGHT,
  CHROME_HEIGHT,
  GAME_START_URL,
  LOBBY_FILTERS_ROW_HEIGHT,
  SEARCH_PLAY_BANNER_HEIGHT,
  SIDE_MENU_OFFSET,
  TRAFFIC_LIGHTS
} from '@shared/config'
import type { AuthPhase, AuthState, UserProfile } from '@shared/ipc'
import { IpcChannels } from '@shared/ipc'
import { importPolemicaCookiesFromChrome } from './chromeCookies'
import {
  accountToUserProfile,
  clearPartitionCookies,
  getAccount,
  getActiveAccountId,
  listAccounts,
  migrateLegacyProfile,
  persistCurrentSession,
  removeAccount as removeAccountRow,
  restorePartitionCookies,
  touchAccount
} from './accounts'
import {
  clearCachedProfile,
  hasElectronAccessToken,
  loadCachedProfile,
  saveCachedProfile,
  scrapeProfileFromPage
} from './profile'
import {
  getGameView,
  layoutGameView,
  loadGameUrl,
  loadGameUrlReliable,
  prepareGameViewUnderChrome,
  setGameViewVisible,
  setSessionWatch,
  waitForGameLoad
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
let migrated = false

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.AUTH_STATE, getAuthState())
}

export function getAuthState(): AuthState {
  return {
    phase,
    profile,
    accounts: listAccounts(),
    error,
    busy
  }
}

async function ensureMigrated(): Promise<void> {
  if (migrated) return
  migrated = true
  const cached = loadCachedProfile()
  await migrateLegacyProfile(cached)
  if (!profile) {
    const activeId = getActiveAccountId()
    const active = activeId ? getAccount(activeId) : null
    if (active) profile = accountToUserProfile(active)
    else if (cached) profile = cached
  }
}

export function bindAuthWindow(win: BrowserWindow): void {
  hostWindow = win
  profile = loadCachedProfile()
  phase = 'splash'
  error = null
  busy = false
  chromeOverlay = false
  migrated = false

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
  void ensureMigrated().then(() => emit())
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
  if (getBanStatus().visible) {
    h += BAN_BANNER_HEIGHT
  } else {
    if (search.visible || search.playVisible || search.noticeTitle || search.noticeText) {
      h += SEARCH_PLAY_BANNER_HEIGHT
    }
    h += LOBBY_FILTERS_ROW_HEIGHT
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

  prepareGameViewUnderChrome(hostWindow)

  await loadGameUrlReliable(GAME_START_URL, 4)
  try {
    await waitForGameLoad(25_000)
  } catch (err) {
    console.warn('[auth] waitForGameLoad soft-fail', err)
  }

  let lastError: Error | null = null
  for (let i = 0; i < 20; i++) {
    try {
      const scraped = await scrapeProfileFromPage((code) =>
        view.webContents.executeJavaScript(code, true)
      )
      await persistCurrentSession(scraped)
      return scraped
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      await new Promise((r) => setTimeout(r, 350))
    }
  }
  throw lastError ?? new Error('Не удалось прочитать профиль')
}

export async function loginWithChrome(): Promise<AuthState> {
  if (busy) {
    error = 'Уже выполняется вход…'
    emit()
    return getAuthState()
  }
  busy = true
  error = null
  emit()

  try {
    await ensureMigrated()
    await importPolemicaCookiesFromChrome()
    profile = await applySessionAndScrape()
    phase = 'greeting'
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    if (listAccounts().length > 0) {
      error = `${error} Можно выбрать сохранённый аккаунт ниже.`
    }
    phase = 'splash'
    console.error('[auth] loginWithChrome failed', err)
  } finally {
    busy = false
    if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
    emit()
  }

  return getAuthState()
}

export async function resumeSession(accountId?: string): Promise<AuthState> {
  if (busy) {
    error = 'Уже выполняется вход…'
    emit()
    return getAuthState()
  }

  await ensureMigrated()

  const id = String(accountId || getActiveAccountId() || '').trim()
  const row = id ? getAccount(id) : null
  const accounts = listAccounts()

  if (row) {
    profile = accountToUserProfile(row)
    saveCachedProfile(profile)
    touchAccount(row.id)

    const ok = await restorePartitionCookies(row.cookies)
    if (!ok) {
      error = `Нет сохранённого access-token для ${row.username}. Залогинься этим аккаунтом в Chrome и нажми «Добавить через Chrome».`
      phase = 'splash'
      emit()
      return getAuthState()
    }

    error = null
    busy = false
    phase = 'greeting'
    if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
    emit()
    void warmSessionInBackground(false)
    return getAuthState()
  }

  profile = profile ?? loadCachedProfile()
  if (!profile && accounts[0]) {
    return resumeSession(accounts[0].id)
  }
  if (!profile) {
    error = 'Нет сохранённого аккаунта'
    emit()
    return getAuthState()
  }

  error = null
  busy = false
  phase = 'greeting'
  if (hostWindow && !hostWindow.isDestroyed()) layoutForPhase(hostWindow)
  emit()
  void warmSessionInBackground(true)
  return getAuthState()
}

async function warmSessionInBackground(allowChromeImport: boolean): Promise<void> {
  try {
    if (!(await hasElectronAccessToken())) {
      if (!allowChromeImport) return
      await importPolemicaCookiesFromChrome()
      if (profile) await persistCurrentSession(profile)
    }
    if (!hostWindow || hostWindow.isDestroyed()) return
    prepareGameViewUnderChrome(hostWindow)
    await loadGameUrlReliable(GAME_START_URL, 3)
    if (profile && (await hasElectronAccessToken())) {
      await persistCurrentSession(profile)
    }
  } catch (err) {
    console.warn('[auth] background session warm failed', err)
  }
}

export async function enterApp(): Promise<AuthState> {
  if (!profile) {
    error = 'Сначала войди через Chrome'
    emit()
    return getAuthState()
  }

  phase = 'app'
  error = null
  if (await hasElectronAccessToken()) {
    try {
      await persistCurrentSession(profile)
    } catch (err) {
      console.warn('[auth] persist on enterApp failed', err)
    }
  }
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
        try {
          await loadGameUrl(GAME_START_URL)
        } catch (err) {
          console.warn('[auth] enterApp load failed', err)
          // Don't block chrome — retry quietly in background
          void loadGameUrlReliable(GAME_START_URL, 3).catch((e) =>
            console.warn('[auth] enterApp retry load failed', e)
          )
        }
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
    if (profile) {
      try {
        await persistCurrentSession(profile)
      } catch (err) {
        console.warn('[auth] persist on logout failed', err)
      }
    }
    await clearPartitionCookies()
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

export async function removeAccount(accountId: string): Promise<AuthState> {
  const id = String(accountId || '').trim()
  if (!id) return getAuthState()
  removeAccountRow(id)
  if (profile) {
    const still = listAccounts().find(
      (a) => a.username.toLowerCase() === profile!.username.toLowerCase()
    )
    if (!still && phase !== 'app') {
      profile = null
      clearCachedProfile()
    }
  }
  emit()
  return getAuthState()
}
