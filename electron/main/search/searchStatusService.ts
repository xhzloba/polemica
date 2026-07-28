import type { BrowserWindow, WebContents } from 'electron'
import { IpcChannels, type SearchMode, type SearchStatus } from '@shared/ipc'
import { getGameView, gameSetLobbyTab } from '../views/GameBrowserView'

/** Timer / queue counts update often. */
const POLL_MS = 1_000

const SCRAPE_SEARCH_JS = `
(() => {
  const path = (location.pathname || '').replace(/\\/$/, '') || '/';
  const onPlayPage = path === '/game-search' || path === '/';

  const tabs = Array.from(document.querySelectorAll('.p-play__tab'));
  const watchTab = tabs.find((el) => (el.textContent || '').includes('Смотреть'));
  const onWatchTab = Boolean(watchTab?.classList.contains('p-play__tab--active'));
  const onPlayTab = onPlayPage && !onWatchTab;

  const walk = (vm, fn) => {
    if (!vm) return false;
    if (fn(vm)) return true;
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) {
      if (walk(kids[i], fn)) return true;
    }
    return false;
  };

  const stripHtml = (s) =>
    String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

  const scrapeModes = () => {
    const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
    let modes = [];
    if (app) {
      walk(app, (vm) => {
        if (Array.isArray(vm.censorshipModes) && Array.isArray(vm.selectedCensorshipModes)) {
          modes = vm.censorshipModes.map((m) => ({
            mode: String(m.mode || ''),
            title: String(m.title || ''),
            count: Number(m.count) || 0,
            countTarget: Number(m.countTarget) || 10,
            available: m.available !== false,
            selected: vm.selectedCensorshipModes.includes(m.mode),
            description: stripHtml(m.description)
          }));
          return true;
        }
        return false;
      });
    }
    if (modes.length) return modes;

    // DOM fallback
    return Array.from(document.querySelectorAll('.p-play__profile-modes-item')).map((label, idx) => {
      const name = (label.querySelector('.p-play__profile-modes-name')?.textContent || '').trim();
      const amount = (label.querySelector('.p-play__profile-modes-amount')?.textContent || '').replace(/\\s+/g, '');
      const [countStr, targetStr] = amount.split('/');
      const input = label.querySelector('input.p-play__profile-modes-input');
      const disabled = Boolean(
        label.querySelector('.p-play__profile-modes-checkbox__disabled')
      );
      const key = name.includes('Рейтинг')
        ? 'polite'
        : name.includes('Prime')
          ? 'prime'
          : name.includes('Обычн')
            ? 'standard'
            : 'mode-' + idx;
      return {
        mode: key,
        title: name,
        count: Number(countStr) || 0,
        countTarget: Number(targetStr) || 10,
        available: !disabled,
        selected: Boolean(input && input.checked),
        description: ''
      };
    });
  };

  const ban = document.querySelector('.p-play__profile-game--ban');
  const search = document.querySelector('.p-play__profile-game--search');
  const modes = scrapeModes();

  const measureInset = () => {
    const el =
      document.querySelector('.p-play__lobby-table-row') ||
      document.querySelector('.p-play__lobby-table') ||
      document.querySelector('.p-play__lobby') ||
      document.querySelector('.p-play__center') ||
      document.querySelector('.p-play');
    if (!el) return 24;
    const left = Math.round(el.getBoundingClientRect().left);
    return Number.isFinite(left) && left >= 0 ? left : 24;
  };

  const insetLeft = measureInset();

  if (ban || !onPlayTab) {
    return {
      active: false,
      visible: false,
      playVisible: false,
      loading: false,
      title: '',
      time: '',
      delay: '',
      canCancel: false,
      modes: [],
      insetLeft
    };
  }

  if (search) {
    const loading = search.classList.contains('p-play__profile-game-loader-gradient')
      || search.classList.contains('p-play__profile-game-loader');

    const title = (search.querySelector('.p-play__profile-game-search-title')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const time = (search.querySelector('.p-play__profile-game-search-time')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const delay = (search.querySelector('.p-play__profile-game-search-delay')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const canCancel = Boolean(search.querySelector('.p-play__profile-game-search-close'));

    return {
      active: true,
      visible: true,
      playVisible: false,
      loading,
      title: title || (loading ? 'Подключение…' : 'Идёт поиск игры'),
      time,
      delay,
      canCancel,
      modes,
      insetLeft
    };
  }

  return {
    active: false,
    visible: false,
    playVisible: true,
    loading: false,
    title: '',
    time: '',
    delay: '',
    canCancel: false,
    modes,
    insetLeft
  };
})()
`

const CANCEL_SEARCH_JS = `
(() => {
  const btn = document.querySelector('.p-play__profile-game-search-close');
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  const walk = (vm, fn) => {
    if (!vm) return false;
    if (fn(vm)) return true;
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) {
      if (walk(kids[i], fn)) return true;
    }
    return false;
  };
  const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
  let done = false;
  if (app) {
    walk(app, (vm) => {
      if (typeof vm.toggleSearch === 'function' && vm.isSearching) {
        vm.toggleSearch();
        done = true;
        return true;
      }
      if (typeof vm.breakSearch === 'function' && vm.isSearching) {
        vm.breakSearch();
        done = true;
        return true;
      }
      return false;
    });
  }
  return done;
})()
`

const START_SEARCH_JS = `
(() => {
  const walk = (vm, fn) => {
    if (!vm) return false;
    if (fn(vm)) return true;
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) {
      if (walk(kids[i], fn)) return true;
    }
    return false;
  };

  const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
  let panel = null;
  if (app) {
    walk(app, (vm) => {
      if (typeof vm.toggleSearch === 'function' && Array.isArray(vm.selectedCensorshipModes)) {
        panel = vm;
        return true;
      }
      return false;
    });
  }

  if (!panel) return false;
  if (panel.isBanned || panel.searchDisabled) return false;
  if (panel.isSearching || panel.isIniSearch) return true;
  if (!panel.selectedCensorshipModes.length) return false;

  panel.toggleSearch();
  return true;
})()
`

function toggleModeJs(mode: string): string {
  return `
(() => {
  const mode = ${JSON.stringify(mode)};
  const walk = (vm, fn) => {
    if (!vm) return false;
    if (fn(vm)) return true;
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) {
      if (walk(kids[i], fn)) return true;
    }
    return false;
  };
  const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
  let done = false;
  if (app) {
    walk(app, (vm) => {
      if (typeof vm.censorshipModeClicked === 'function' && Array.isArray(vm.censorshipModes)) {
        const entry = vm.censorshipModes.find((m) => m && m.mode === mode);
        if (!entry) return false;
        vm.censorshipModeClicked(entry);
        done = true;
        return true;
      }
      return false;
    });
  }
  return done;
})()
`
}

function emptySearch(): SearchStatus {
  return {
    active: false,
    visible: false,
    playVisible: false,
    loading: false,
    title: '',
    time: '',
    delay: '',
    canCancel: false,
    modes: [],
    insetLeft: 24,
    updatedAt: 0
  }
}

let hostWindow: BrowserWindow | null = null
let timer: ReturnType<typeof setInterval> | null = null
let last: SearchStatus = emptySearch()
let running = false
let onChange: ((status: SearchStatus) => void) | null = null

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.SEARCH_STATUS, last)
}

function layoutFlag(s: SearchStatus): boolean {
  return s.visible || s.playVisible
}

function modesKey(modes: SearchMode[]): string {
  return modes
    .map((m) => `${m.mode}:${m.selected ? 1 : 0}:${m.count}:${m.available ? 1 : 0}`)
    .join('|')
}

function sameSearch(a: SearchStatus, b: SearchStatus): boolean {
  return (
    a.active === b.active &&
    a.visible === b.visible &&
    a.playVisible === b.playVisible &&
    a.loading === b.loading &&
    a.title === b.title &&
    a.time === b.time &&
    a.delay === b.delay &&
    a.canCancel === b.canCancel &&
    a.insetLeft === b.insetLeft &&
    modesKey(a.modes) === modesKey(b.modes)
  )
}

function normalizeModes(raw: unknown): SearchMode[] {
  if (!Array.isArray(raw)) return []
  return raw.map((m) => {
    const row = (m || {}) as Partial<SearchMode>
    return {
      mode: String(row.mode || ''),
      title: String(row.title || ''),
      count: Number(row.count) || 0,
      countTarget: Number(row.countTarget) || 10,
      available: Boolean(row.available),
      selected: Boolean(row.selected),
      description: String(row.description || '')
    }
  })
}

async function tick(): Promise<void> {
  const view = getGameView()
  const wc = view?.webContents
  if (!wc || wc.isDestroyed()) {
    if (layoutFlag(last)) {
      last = emptySearch()
      emit()
      onChange?.(last)
    }
    return
  }

  try {
    const url = wc.getURL()
    if (!url.includes('polemicagame.com')) {
      if (layoutFlag(last)) {
        last = emptySearch()
        emit()
        onChange?.(last)
      }
      return
    }

    const raw = (await wc.executeJavaScript(SCRAPE_SEARCH_JS, true)) as {
      active: boolean
      visible: boolean
      playVisible: boolean
      loading: boolean
      title: string
      time: string
      delay: string
      canCancel: boolean
      modes: SearchMode[]
      insetLeft: number
    }

    const next: SearchStatus = {
      active: Boolean(raw?.active),
      visible: Boolean(raw?.visible),
      playVisible: Boolean(raw?.playVisible),
      loading: Boolean(raw?.loading),
      title: String(raw?.title || ''),
      time: String(raw?.time || ''),
      delay: String(raw?.delay || ''),
      canCancel: Boolean(raw?.canCancel),
      modes: normalizeModes(raw?.modes),
      insetLeft: Math.max(0, Math.round(Number(raw?.insetLeft) || 24)),
      updatedAt: Date.now()
    }

    if (sameSearch(last, next)) return

    const wasLayout = layoutFlag(last)
    last = next
    emit()
    if (wasLayout !== layoutFlag(next)) onChange?.(next)
  } catch (err) {
    console.warn('[search] scrape failed', err)
  }
}

export function getSearchStatus(): SearchStatus {
  return last
}

export function bindSearchStatusWindow(win: BrowserWindow): void {
  hostWindow = win
}

export function onSearchStatusChange(cb: (status: SearchStatus) => void): void {
  onChange = cb
}

export function refreshSearchStatus(): void {
  if (!running) return
  void tick()
}

export async function cancelGameSearch(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    const ok = Boolean(await wc.executeJavaScript(CANCEL_SEARCH_JS, true))
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] cancel failed', err)
    return false
  }
}

export async function startGameSearch(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false

  try {
    if (!wc.getURL().includes('/game-search')) {
      await gameSetLobbyTab('play')
    }

    const ok = Boolean(await wc.executeJavaScript(START_SEARCH_JS, true))
    setTimeout(() => refreshSearchStatus(), 200)
    setTimeout(() => refreshSearchStatus(), 800)
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] start failed', err)
    return false
  }
}

export async function toggleSearchMode(mode: string): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  const key = String(mode || '')
  if (!key) return false
  try {
    const ok = Boolean(await wc.executeJavaScript(toggleModeJs(key), true))
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] toggle mode failed', err)
    return false
  }
}

function bindNavigationRefresh(): void {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return
  if ((wc as WebContents & { __searchNavBound?: boolean }).__searchNavBound) return
  ;(wc as WebContents & { __searchNavBound?: boolean }).__searchNavBound = true

  const refresh = (): void => {
    refreshSearchStatus()
  }
  wc.on('did-navigate', refresh)
  wc.on('did-navigate-in-page', refresh)
  wc.on('did-finish-load', refresh)
}

export function startSearchStatusPolling(): void {
  if (running) return
  running = true
  bindNavigationRefresh()
  void tick()
  timer = setInterval(() => {
    void tick()
  }, POLL_MS)
}

export function stopSearchStatusPolling(): void {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  last = emptySearch()
  emit()
  onChange?.(last)
}
