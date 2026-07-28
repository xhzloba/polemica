import {
  WebContentsView,
  BrowserWindow,
  shell,
  type WebContents
} from 'electron'
import { join } from 'node:path'
import { ALLOWED_ORIGINS, APP_BG, GAME_START_URL, SIDE_MENU_INSET } from '@shared/config'
import { IpcChannels, type NavState } from '@shared/ipc'
import { bindInjections } from '../injection/applyInjections'

let gameView: WebContentsView | null = null
let hostWindow: BrowserWindow | null = null
let loadProgress = 0
let progressTimer: ReturnType<typeof setInterval> | null = null

type SessionWatch = {
  shouldWatch: () => boolean
  onLogout: () => void
}

let sessionWatch: SessionWatch | null = null

/** Auth layer hooks site logout → splash. */
export function setSessionWatch(watch: SessionWatch | null): void {
  sessionWatch = watch
}

function clearProgressTimer(): void {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function publishProgress(wc: WebContents, value: number): void {
  loadProgress = Math.max(0, Math.min(1, value))
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.LOAD_PROGRESS, loadProgress)
  emitNavState(wc)
}

function beginLoadProgress(wc: WebContents): void {
  clearProgressTimer()
  publishProgress(wc, 0.1)
  progressTimer = setInterval(() => {
    if (loadProgress >= 0.9) return
    publishProgress(wc, loadProgress + (0.9 - loadProgress) * 0.12)
  }, 180)
}

function finishLoadProgress(wc: WebContents): void {
  clearProgressTimer()
  publishProgress(wc, 1)
  setTimeout(() => {
    if (!gameView || gameView.webContents.isDestroyed()) return
    if (gameView.webContents.isLoading()) return
    loadProgress = 0
    if (!hostWindow || hostWindow.isDestroyed()) return
    hostWindow.webContents.send(IpcChannels.LOAD_PROGRESS, 0)
    emitNavState(wc)
  }, 280)
}

function isAllowedUrl(url: string): boolean {
  try {
    const { origin, protocol } = new URL(url)
    if (protocol === 'about:' || protocol === 'blob:' || protocol === 'data:') return true
    return (ALLOWED_ORIGINS as readonly string[]).includes(origin)
  } catch {
    return false
  }
}

/** Site stream viewer (`/stream/:id`) + Twitch — open in system browser, not in-app. */
function isExternalWatchUrl(url: string): boolean {
  try {
    const parsed = new URL(url, GAME_START_URL)
    if (parsed.hostname.includes('twitch.tv')) return true
    if (
      (ALLOWED_ORIGINS as readonly string[]).includes(parsed.origin) &&
      parsed.pathname.startsWith('/stream')
    ) {
      return true
    }
    return false
  } catch {
    return /twitch\.tv|\/stream(?:\/|$|\?)/i.test(url)
  }
}

function openExternalWatch(url: string): void {
  try {
    const href = new URL(url, GAME_START_URL).href
    void shell.openExternal(href)
  } catch {
    void shell.openExternal(url)
  }
}

function isSiteLogoutUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    return pathname.includes('/registration/logout') || pathname === '/logout'
  } catch {
    return /\/registration\/logout(?:\/|$|\?)|\/logout(?:\/|$|\?)/i.test(url)
  }
}

function emitNavState(wc: WebContents): void {
  if (!hostWindow || hostWindow.isDestroyed()) return

  const loading = wc.isLoading()
  const state: NavState = {
    url: wc.getURL(),
    title: wc.getTitle(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
    isLoading: loading,
    progress: loading ? Math.max(loadProgress, 0.08) : loadProgress
  }

  hostWindow.webContents.send(IpcChannels.NAV_STATE, state)
  hostWindow.webContents.send(IpcChannels.PAGE_TITLE, state.title)
}

function triggerSiteLogout(reason: string): void {
  if (!sessionWatch?.shouldWatch()) return
  console.log('[auth] site logout detected:', reason)
  sessionWatch.onLogout()
}

async function checkLoggedInHeader(wc: WebContents): Promise<void> {
  if (!sessionWatch?.shouldWatch() || wc.isDestroyed()) return
  if (!wc.getURL().includes('polemicagame.com')) return

  try {
    const loggedIn = (await wc.executeJavaScript(
      `Boolean(document.querySelector('.p-header__userCont-user-username')?.textContent?.trim())`,
      true
    )) as boolean
    if (!loggedIn) triggerSiteLogout('header without profile')
  } catch {
    /* page may be mid-navigation */
  }
}

export function attachGameView(win: BrowserWindow): WebContentsView {
  hostWindow = win

  const view = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/game.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox off: reliable DOM patching from game preload
      sandbox: false,
      partition: 'persist:polemica-game',
      devTools: true
    }
  })

  win.contentView.addChildView(view)
  gameView = view
  view.setBackgroundColor(APP_BG)
  // Hidden until enterApp — never flash site under splash/greeting
  view.setVisible(false)

  const { webContents: wc } = view

  wc.setWindowOpenHandler(({ url }) => {
    if (isExternalWatchUrl(url)) {
      openExternalWatch(url)
      return { action: 'deny' }
    }
    if (isAllowedUrl(url)) {
      wc.loadURL(url)
    } else {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  wc.on('will-navigate', (event, url) => {
    if (isExternalWatchUrl(url)) {
      event.preventDefault()
      openExternalWatch(url)
      return
    }
    if (!isAllowedUrl(url)) {
      event.preventDefault()
      shell.openExternal(url)
      return
    }
    if (isSiteLogoutUrl(url)) {
      triggerSiteLogout(url)
    }
  })

  wc.on('will-redirect', (_event, url) => {
    if (isSiteLogoutUrl(url)) triggerSiteLogout(url)
  })

  wc.on('did-start-loading', () => {
    beginLoadProgress(wc)
    emitNavState(wc)
  })
  wc.on('did-stop-loading', () => {
    finishLoadProgress(wc)
    emitNavState(wc)
  })
  wc.on('did-navigate', (_e, url) => {
    emitNavState(wc)
    if (isSiteLogoutUrl(url)) triggerSiteLogout(url)
  })
  wc.on('did-navigate-in-page', (_e, url) => {
    emitNavState(wc)
    if (isSiteLogoutUrl(url)) triggerSiteLogout(url)
  })
  wc.on('page-title-updated', (_e, title) => {
    if (!hostWindow || hostWindow.isDestroyed()) return
    hostWindow.webContents.send(IpcChannels.PAGE_TITLE, title)
    emitNavState(wc)
  })

  wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return // -3 = aborted
    console.error('[game-view] load failed', { errorCode, errorDescription, validatedURL })
    emitNavState(wc)
  })

  wc.on('did-finish-load', () => {
    emitNavState(wc)
    void checkLoggedInHeader(wc)
  })

  bindInjections(wc)

  // Start blank — auth splash imports Chrome session before loading the site
  wc.loadURL('about:blank')
  return view
}

export function loadGameUrl(url: string = GAME_START_URL): Promise<void> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return Promise.reject(new Error('Game view missing'))
  return wc.loadURL(url)
}

/** Stop in-flight nav and load with retries (site sometimes hits ERR_TIMED_OUT). */
export async function loadGameUrlReliable(
  url: string = GAME_START_URL,
  attempts = 3
): Promise<void> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) throw new Error('Game view missing')

  let lastError: Error | null = null
  for (let i = 0; i < attempts; i++) {
    try {
      if (wc.isLoading()) wc.stop()
      await wc.loadURL(url)
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[game-view] load attempt ${i + 1}/${attempts} failed`, lastError.message)
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw lastError ?? new Error('Не удалось открыть polemicagame.com')
}

/**
 * Size game for a reliable load while splash/greeting chrome stays on top.
 * Game stays invisible so the site never flashes through.
 */
export function prepareGameViewUnderChrome(win: BrowserWindow): void {
  const view = gameView
  if (!view) return

  const [width, height] = win.getContentSize()
  const chromeView = win.contentView.children.find((child) => child !== view)

  // Opaque chrome first — then size the (hidden) game underneath
  if (chromeView) {
    chromeView.setBackgroundColor(APP_BG)
    chromeView.setBounds({ x: 0, y: 0, width, height })
    win.contentView.addChildView(chromeView)
  }

  view.setVisible(false)
  view.setBounds({
    x: 0,
    y: 0,
    width: Math.max(width, 320),
    height: Math.max(height, 240)
  })
}

export function setGameViewVisible(visible: boolean): void {
  gameView?.setVisible(visible)
}

export function waitForGameLoad(timeoutMs = 20_000): Promise<void> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return Promise.reject(new Error('Game view missing'))

  if (!wc.isLoading() && wc.getURL().startsWith('http')) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Таймаут загрузки polemicagame.com'))
    }, timeoutMs)

    const onOk = (): void => {
      cleanup()
      resolve()
    }
    const onFail = (
      _e: Electron.Event,
      errorCode: number,
      errorDescription: string,
      _validatedURL: string,
      isMainFrame: boolean
    ): void => {
      if (!isMainFrame || errorCode === -3) return
      cleanup()
      reject(new Error(`Ошибка загрузки: ${errorDescription}`))
    }

    const cleanup = (): void => {
      clearTimeout(timer)
      wc.removeListener('did-finish-load', onOk)
      wc.removeListener('did-fail-load', onFail)
    }

    wc.once('did-finish-load', onOk)
    wc.on('did-fail-load', onFail)
  })
}

export function layoutGameView(
  win: BrowserWindow,
  chromeHeight: number,
  menuOffset = 0,
  menuInset = false
): void {
  const view = gameView
  if (!view) return

  const [width, height] = win.getContentSize()
  const children = win.contentView.children
  const chromeView = children.find((child) => child !== view)
  const authCover = chromeHeight >= height - 1
  const side = Math.max(0, menuOffset)
  const inset = menuInset ? SIDE_MENU_INSET : 0

  if (authCover) {
    if (chromeView) {
      chromeView.setBackgroundColor(APP_BG)
      chromeView.setBounds({ x: 0, y: 0, width, height: chromeHeight })
      win.contentView.addChildView(chromeView)
    }
    view.setVisible(false)
    view.setBounds({
      x: 0,
      y: height + 8,
      width: Math.max(width, 320),
      height: Math.max(height, 240)
    })
    return
  }

  if (chromeView) {
    chromeView.setBackgroundColor(side > 0 ? APP_BG : '#00000000')
    chromeView.setBounds({
      x: 0,
      y: 0,
      width,
      height: side > 0 ? height : chromeHeight
    })
  }

  // Menu open: inset card on left → game sits in the right padded column
  view.setBounds({
    x: side,
    y: chromeHeight + inset,
    width: Math.max(0, width - side - inset),
    height: Math.max(0, height - chromeHeight - inset * 2)
  })
  view.setVisible(true)

  if (chromeView) win.contentView.addChildView(chromeView)
  win.contentView.addChildView(view)
}

export function getGameView(): WebContentsView | null {
  return gameView
}

export function detachGameView(win: BrowserWindow): void {
  if (!gameView) return
  win.contentView.removeChildView(gameView)
  gameView.webContents.close()
  gameView = null
  sessionWatch = null
}

export function getGameNavState(): NavState {
  const wc = gameView?.webContents
  if (!wc) {
    return {
      url: GAME_START_URL,
      title: '',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      progress: 0
    }
  }

  return {
    url: wc.getURL(),
    title: wc.getTitle(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
    isLoading: wc.isLoading(),
    progress: wc.isLoading() ? Math.max(loadProgress, 0.08) : loadProgress
  }
}

export function gameGoBack(): void {
  gameView?.webContents.navigationHistory.goBack()
}

export function gameGoForward(): void {
  gameView?.webContents.navigationHistory.goForward()
}

export function gameReload(): void {
  gameView?.webContents.reload()
}

export function gameGoHome(): void {
  gameView?.webContents.loadURL(GAME_START_URL)
}

export function gameGoto(url: string): void {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return
  try {
    const parsed = new URL(url, GAME_START_URL)
    if (!isAllowedUrl(parsed.href)) return
    void wc.loadURL(parsed.href)
  } catch {
    /* ignore bad url */
  }
}

/** Trigger site "Создать лобби" button (opens basemodal). */
export async function gameClickCreateLobby(): Promise<boolean> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return false

  const tryClick = async (): Promise<boolean> => {
    try {
      return Boolean(
        await wc.executeJavaScript(
          `(() => {
            const btn = document.querySelector('.p-play__lobby-search-button');
            if (!btn) return false;
            btn.click();
            return true;
          })()`,
          true
        )
      )
    } catch {
      return false
    }
  }

  const onSearch = wc.getURL().includes('/game-search')
  if (!onSearch) {
    await wc.loadURL(GAME_START_URL)
    try {
      await waitForGameLoad(15_000)
    } catch {
      /* still try click */
    }
  }

  for (let i = 0; i < 12; i++) {
    if (await tryClick()) return true
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

/** Sync Electron menu search → site lobby filter input. */
export async function gameSetLobbySearch(query: string): Promise<boolean> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return false

  if (!wc.getURL().includes('/game-search')) {
    await wc.loadURL(GAME_START_URL)
    try {
      await waitForGameLoad(15_000)
    } catch {
      /* still try set */
    }
  }

  const q = String(query ?? '')
  for (let i = 0; i < 12; i++) {
    try {
      const ok = Boolean(
        await wc.executeJavaScript(
          `(() => {
            const input = document.querySelector('.p-play__lobby-search-input');
            if (!input) return false;
            const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            nativeSet?.call(input, ${JSON.stringify(q)});
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          })()`,
          true
        )
      )
      if (ok) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

/** Switch site lobby tabs: Играть | Смотреть (streams). */
export async function gameSetLobbyTab(tab: 'play' | 'watch'): Promise<boolean> {
  const wc = gameView?.webContents
  if (!wc || wc.isDestroyed()) return false

  const needle = tab === 'watch' ? 'Смотреть' : 'Играть'

  if (!wc.getURL().includes('/game-search')) {
    await wc.loadURL(GAME_START_URL)
    try {
      await waitForGameLoad(15_000)
    } catch {
      /* still try click */
    }
  }

  for (let i = 0; i < 16; i++) {
    try {
      const ok = Boolean(
        await wc.executeJavaScript(
          `(() => {
            const tabs = Array.from(document.querySelectorAll('.p-play__tab'));
            const target = tabs.find((el) => (el.textContent || '').includes(${JSON.stringify(needle)}));
            if (!target) return false;
            if (target.classList.contains('p-play__tab--active')) return true;
            target.click();
            return true;
          })()`,
          true
        )
      )
      if (ok) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

export function gameStop(): void {
  gameView?.webContents.stop()
}
