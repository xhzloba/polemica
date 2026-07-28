import type { BrowserWindow, WebContents } from 'electron'
import { IpcChannels, type BanStatus } from '@shared/ipc'
import { getGameView } from '../views/GameBrowserView'

const POLL_MS = 2_000

/** Ban DOM + only visible on «Играть» (game-search, not Смотреть tab). */
const SCRAPE_BAN_JS = `
(() => {
  const path = (location.pathname || '').replace(/\\/$/, '') || '/';
  const onPlayPage =
    path === '/game-search' ||
    path === '/' ||
    (path.startsWith('/game') && !path.startsWith('/stream'));

  const tabs = Array.from(document.querySelectorAll('.p-play__tab'));
  const watchTab = tabs.find((el) => (el.textContent || '').includes('Смотреть'));
  const onWatchTab = Boolean(watchTab?.classList.contains('p-play__tab--active'));

  const ban = document.querySelector('.p-play__profile-game--ban');
  if (!ban) {
    return { active: false, visible: false, title: '', until: '', reason: '' };
  }

  const titleRoot = ban.querySelector('.p-play__profile-game-ban-title');
  let title = '';
  if (titleRoot) {
    for (const node of titleRoot.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) title += node.textContent || '';
    }
    title = title.trim();
    if (!title) {
      title = (titleRoot.textContent || '').replace(/\\s+/g, ' ').trim();
      const hint = titleRoot.querySelector('.tooltip, .ban-tooltip');
      if (hint?.textContent) {
        title = title.replace(hint.textContent.replace(/\\s+/g, ' ').trim(), '').trim();
      }
    }
  }

  const until = (ban.querySelector('.p-play__profile-game-ban-players')?.textContent || '')
    .replace(/\\s+/g, ' ')
    .trim();

  const reason = (
    ban.querySelector('.tooltip__hint')?.textContent ||
    ban.querySelector('.ban-tooltip .tooltip__hint')?.textContent ||
    ''
  ).replace(/\\s+/g, ' ').trim();

  return {
    active: true,
    visible: onPlayPage && !onWatchTab,
    title: title || 'Поиск временно ограничен',
    until,
    reason
  };
})()
`

function emptyBan(): BanStatus {
  return { active: false, visible: false, title: '', until: '', reason: '', updatedAt: 0 }
}

let hostWindow: BrowserWindow | null = null
let timer: ReturnType<typeof setInterval> | null = null
let last: BanStatus = emptyBan()
let running = false
let onChange: ((status: BanStatus) => void) | null = null

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.BAN_STATUS, last)
}

function sameBan(a: BanStatus, b: BanStatus): boolean {
  return (
    a.active === b.active &&
    a.visible === b.visible &&
    a.title === b.title &&
    a.until === b.until &&
    a.reason === b.reason
  )
}

async function tick(): Promise<void> {
  const view = getGameView()
  const wc = view?.webContents
  if (!wc || wc.isDestroyed()) {
    if (last.active || last.visible) {
      last = emptyBan()
      emit()
      onChange?.(last)
    }
    return
  }

  try {
    const url = wc.getURL()
    if (!url.includes('polemicagame.com')) {
      if (last.active || last.visible) {
        last = emptyBan()
        emit()
        onChange?.(last)
      }
      return
    }

    const raw = (await wc.executeJavaScript(SCRAPE_BAN_JS, true)) as {
      active: boolean
      visible: boolean
      title: string
      until: string
      reason: string
    }

    const next: BanStatus = {
      active: Boolean(raw?.active),
      visible: Boolean(raw?.active && raw?.visible),
      title: String(raw?.title || ''),
      until: String(raw?.until || ''),
      reason: String(raw?.reason || ''),
      updatedAt: Date.now()
    }

    if (sameBan(last, next)) return

    const wasVisible = last.visible
    last = next
    emit()
    if (wasVisible !== next.visible) onChange?.(next)
  } catch (err) {
    console.warn('[ban] scrape failed', err)
  }
}

export function getBanStatus(): BanStatus {
  return last
}

export function bindBanStatusWindow(win: BrowserWindow): void {
  hostWindow = win
}

export function onBanStatusChange(cb: (status: BanStatus) => void): void {
  onChange = cb
}

export function refreshBanStatus(): void {
  if (!running) return
  void tick()
}

function bindNavigationRefresh(): void {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return
  if ((wc as WebContents & { __banNavBound?: boolean }).__banNavBound) return
  ;(wc as WebContents & { __banNavBound?: boolean }).__banNavBound = true

  const refresh = (): void => {
    refreshBanStatus()
  }
  wc.on('did-navigate', refresh)
  wc.on('did-navigate-in-page', refresh)
  wc.on('did-finish-load', refresh)
}

export function startBanStatusPolling(): void {
  if (running) return
  running = true
  bindNavigationRefresh()
  void tick()
  timer = setInterval(() => {
    void tick()
  }, POLL_MS)
}

export function stopBanStatusPolling(): void {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  last = emptyBan()
  emit()
  onChange?.(last)
}
