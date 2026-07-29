import { net, type BrowserWindow, type WebContents } from 'electron'
import { IpcChannels, type SearchMode, type SearchStatus } from '@shared/ipc'
import { getBanStatus } from '../ban/banStatusService'
import { getGameView, gameSetLobbyTab } from '../views/GameBrowserView'

/** Timer / queue counts update often. */
const POLL_MS = 1_000
/** Ignore sub-pixel / mid-reflow lobby left noise — table CSS doesn't move that much. */
const INSET_DEADZONE_PX = 12
const SEARCH_QUEUE_URL = 'https://game.polemicagame.com/api/search'
const SEARCH_QUEUE_TIMEOUT_MS = 1_500

const SCRAPE_SEARCH_JS = `
(() => {
  const path = (location.pathname || '').replace(/\\/$/, '') || '/';
  const onPlayPage = path === '/game-search' || path === '/';
  // /game and /game/<id> — not /game-search
  const onGameRoomPath = path === '/game' || path.startsWith('/game/');
  const onGameRoom = onGameRoomPath || Boolean(document.querySelector('.game-room'));

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

  const readStoreInGame = () => {
    try {
      const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
      if (!app) return { ready: false, inGame: false };
      const store = app.$store || (app.$root && app.$root.$store);
      if (!store || !store.state || !store.state.userInGame) return { ready: false, inGame: false };
      const v = store.state.userInGame.value;
      return {
        ready: true,
        inGame: v != null && v !== false && v !== '' && v !== 0
      };
    } catch (e) {
      return { ready: false, inGame: false };
    }
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
  const searchEl = document.querySelector('.p-play__profile-game--search');
  const acceptEl = document.querySelector('.p-play__profile-accept');
  const decideEl = document.querySelector('.p-play__profile-game--decide');
  const modes = scrapeModes();

  const measureInset = () => {
    const el =
      document.querySelector('.p-play__lobby-table') ||
      document.querySelector('.p-play__lobby') ||
      document.querySelector('.p-play__center') ||
      document.querySelector('.p-play');
    if (!el) return 24;
    const left = Math.round(el.getBoundingClientRect().left);
    return Number.isFinite(left) && left >= 0 ? left : 24;
  };

  const insetLeft = measureInset();

  const scrapeBreakNotice = () => {
    const header = document.querySelector('.modal-break-search__header');
    if (!header) return { noticeTitle: '', noticeText: '' };
    const noticeTitle = (header.querySelector('span')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const noticeText = (header.querySelector('p')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    try {
      const vueApp = document.querySelector('#app') && document.querySelector('#app').__vue__;
      const root = vueApp && vueApp.$root;
      if (root && typeof root.hideModal === 'function') {
        root.hideModal('break-search');
      } else {
        const exit = document.querySelector('.modal-break-search__exit');
        if (exit) {
          exit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      }
    } catch (e) {}
    return { noticeTitle, noticeText };
  };

  const notice = scrapeBreakNotice();
  const wrap = (row) => Object.assign(row, notice);

  const empty = (phase) =>
    wrap({
      phase,
      active: false,
      visible: false,
      playVisible: false,
      loading: false,
      title: '',
      time: '',
      delay: '',
      canCancel: false,
      acceptAccepted: false,
      acceptMode: '',
      modes: phase === 'hidden' ? [] : modes,
      insetLeft
    });

  const inGamePayload = (opts) =>
    wrap({
      phase: 'inGame',
      active: false,
      // Show continue/quit only when off the room page.
      visible: !opts || !opts.inRoom,
      playVisible: false,
      loading: false,
      title: 'Вы в игре',
      time: '',
      delay: '',
      canCancel: false,
      acceptAccepted: false,
      acceptMode: '',
      modes: [],
      insetLeft,
      onGameRoom: Boolean(opts && opts.inRoom)
    });

  // Ban chrome only on Играть tab — elsewhere keep Play strip available.
  if (ban && onPlayTab) return empty('hidden');

  const storeInGameState = readStoreInGame();
  const storeInGame = storeInGameState.inGame;

  // Already inside the room UI — remember session, hide continue/quit strip.
  if (onGameRoom) return inGamePayload({ inRoom: true });
  if (storeInGame) return inGamePayload();

  const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
  let panel = null;
  if (app) {
    walk(app, (vm) => {
      if (
        vm &&
        (typeof vm.acceptGame === 'function' || typeof vm.toggleSearch === 'function') &&
        (vm.searchState !== undefined || Array.isArray(vm.selectedCensorshipModes))
      ) {
        panel = vm;
        return true;
      }
      return false;
    });
  }

  // Broader fallback: live search/accept state may survive on another Vue vm after route change
  if (!panel && app) {
    walk(app, (vm) => {
      if (
        vm &&
        (vm.isActiveSearch ||
          (vm.searchState && vm.searchState.group) ||
          (vm.acceptingPhase && vm.acceptingPhase.processing) ||
          vm.userInGame)
      ) {
        panel = vm;
        return true;
      }
      return false;
    });
  }

  // Any vm still flagged in-game (profile strip is display:none but Vue state lives).
  let vmInGame = Boolean(panel && panel.userInGame);
  if (!vmInGame && app) {
    walk(app, (vm) => {
      if (vm && vm.userInGame) {
        vmInGame = true;
        return true;
      }
      return false;
    });
  }
  if (vmInGame || storeInGame) return inGamePayload();

  // Panel missing (other routes / watch / cold load).
  // Main process keeps sticky searching/accept UI when panelMissing.
  if (!panel) {
    return wrap({
      phase: 'idle',
      active: false,
      visible: false,
      playVisible: true,
      loading: false,
      title: '',
      time: '',
      delay: '',
      canCancel: false,
      acceptAccepted: false,
      acceptMode: '',
      modes,
      insetLeft,
      panelMissing: true
    });
  }

  const stopwatch = String(panel.stopwatch != null ? panel.stopwatch : '').trim();
  const launching =
    Boolean(panel && panel.acceptingPhase && panel.acceptingPhase.processing) ||
    Boolean(
      document.querySelector('.p-play__profile-game-loader') &&
        (document.querySelector('.p-play__profile-game-loader')?.textContent || '').includes('запускается')
    );
  const group = panel && panel.searchState && panel.searchState.group;
  const accepted = Boolean(panel && panel.isGameAccepted);
  const inGame = Boolean(panel && panel.userInGame) || Boolean(decideEl) || vmInGame || storeInGame;
  const searching =
    Boolean(panel && panel.isActiveSearch) ||
    Boolean(searchEl && !searchEl.classList.contains('p-play__profile-game-loader'));

  // Site render order: ban → userInGame(decide) → processing → group(accept) → search → idle
  if (inGame) {
    return inGamePayload();
  }

  if (launching) {
    return wrap({
      phase: 'launching',
      active: true,
      visible: true,
      playVisible: false,
      loading: true,
      title: 'Игра запускается',
      time: stopwatch,
      delay: '',
      canCancel: false,
      acceptAccepted: accepted,
      acceptMode: '',
      modes: [],
      insetLeft
    });
  }

  if (group || acceptEl) {
    let modeLabel = '';
    if (panel && typeof panel.getCensorshipTitle === 'function' && group && group.censorship != null) {
      modeLabel = 'Режим: ' + String(panel.getCensorshipTitle(group.censorship) || '');
    } else if (acceptEl) {
      const spans = Array.from(acceptEl.querySelectorAll('span'));
      const modeSpan = spans.find((s) => (s.textContent || '').includes('Режим'));
      modeLabel = modeSpan ? (modeSpan.textContent || '').replace(/\\s+/g, ' ').trim() : '';
    }
    const readyCount =
      group && group.accepted != null ? Number(group.accepted) : NaN;
    const title = accepted
      ? 'Готовы: ' + (Number.isFinite(readyCount) ? readyCount : '?') + '/10'
      : 'Принять игру';
    const time =
      stopwatch ||
      (acceptEl?.querySelector('.p-play__profile-accept-timer')?.textContent || '')
        .replace(/\\s+/g, ' ')
        .trim();

    return wrap({
      phase: 'accept',
      active: true,
      visible: true,
      playVisible: false,
      loading: false,
      title,
      time,
      delay: modeLabel,
      canCancel: false,
      acceptAccepted: accepted,
      acceptMode: modeLabel,
      modes: [],
      insetLeft
    });
  }

  if (searching || searchEl) {
    const loading =
      Boolean(searchEl && (
        searchEl.classList.contains('p-play__profile-game-loader-gradient') ||
        searchEl.classList.contains('p-play__profile-game-loader')
      )) || Boolean(panel && panel.isSearchBtnLoading);

    const title = (searchEl?.querySelector('.p-play__profile-game-search-title')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const time =
      stopwatch ||
      (searchEl?.querySelector('.p-play__profile-game-search-time')?.textContent || '')
        .replace(/\\s+/g, ' ')
        .trim();
    const delay = (searchEl?.querySelector('.p-play__profile-game-search-delay')?.textContent || '')
      .replace(/\\s+/g, ' ')
      .trim();
    const canCancel = Boolean(searchEl?.querySelector('.p-play__profile-game-search-close'));

    return wrap({
      phase: 'searching',
      active: true,
      visible: true,
      playVisible: false,
      loading,
      title: title || (loading ? 'Подключение…' : 'Идёт поиск игры'),
      time,
      delay,
      canCancel,
      acceptAccepted: false,
      acceptMode: '',
      modes,
      insetLeft
    });
  }

  return wrap({
    phase: 'idle',
    active: false,
    visible: false,
    playVisible: true,
    loading: false,
    title: '',
    time: '',
    delay: '',
    canCancel: false,
    acceptAccepted: false,
    acceptMode: '',
    modes,
    insetLeft,
    // Store hydrated and empty → safe to drop sticky continue/quit.
    leftGame: Boolean(onPlayPage && storeInGameState.ready && !storeInGame && !vmInGame && !decideEl)
  });
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

const ACCEPT_GAME_JS = `
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
  if (app) {
    let done = false;
    walk(app, (vm) => {
      if (typeof vm.acceptGame === 'function') {
        if (vm.isGameAccepted || (vm.acceptingPhase && vm.acceptingPhase.processing)) {
          done = true;
          return true;
        }
        vm.acceptGame();
        done = true;
        return true;
      }
      return false;
    });
    if (done) return true;
  }
  const el = document.querySelector('.p-play__profile-accept.cursor-pointer');
  if (el) {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  return false;
})()
`

const PLAY_ACCEPT_SOUND_JS = `
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
  const replay = (audio) => {
    if (!audio) return false;
    try {
      audio.currentTime = 0;
      audio.volume = 0.7;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    } catch (_) {
      return false;
    }
  };
  const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
  if (app) {
    let done = false;
    walk(app, (vm) => {
      if (typeof vm.playStartGameSignal === 'function') {
        if (vm.startGameSignal) replay(vm.startGameSignal);
        else vm.playStartGameSignal();
        done = true;
        return true;
      }
      if (vm.startGameSignal) {
        done = replay(vm.startGameSignal);
        return done;
      }
      return false;
    });
    if (done) return true;
  }
  const a = document.createElement('audio');
  a.src = '/bundle/sounds/start-game-signal.mp3';
  a.volume = 0.7;
  const p = a.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  return true;
})()
`

const RETURN_TO_GAME_JS = `
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
  if (app) {
    let done = false;
    walk(app, (vm) => {
      if (typeof vm.returnToGame === 'function' && vm.userInGame) {
        vm.returnToGame();
        done = true;
        return true;
      }
      return false;
    });
    if (done) return true;
  }
  const btn = document.querySelector('.p-play__profile-agree');
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  return false;
})()
`

const QUIT_GAME_JS = `
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
  if (app) {
    let done = false;
    walk(app, (vm) => {
      if (typeof vm.quitGame === 'function' && vm.userInGame) {
        // true = skip site confirm modal (profile is hidden in chrome)
        vm.quitGame(true);
        done = true;
        return true;
      }
      return false;
    });
    if (done) return true;
  }
  const btn = document.querySelector('.p-play__profile-quit');
  if (btn) {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  }
  return false;
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
    phase: 'hidden',
    active: false,
    visible: false,
    playVisible: false,
    loading: false,
    title: '',
    time: '',
    delay: '',
    canCancel: false,
    acceptAccepted: false,
    acceptMode: '',
    noticeTitle: '',
    noticeText: '',
    modes: [],
    insetLeft: 24,
    updatedAt: 0
  }
}

const NOTICE_TTL_MS = 60_000

const DEFAULT_SEARCH_MODES: SearchMode[] = [
  {
    mode: 'standard',
    title: 'Обычный',
    count: 0,
    countTarget: 10,
    available: true,
    selected: true,
    description: ''
  },
  {
    mode: 'polite',
    title: 'Рейтинг',
    count: 0,
    countTarget: 10,
    available: true,
    selected: false,
    description: ''
  },
  {
    mode: 'prime',
    title: 'Prime',
    count: 0,
    countTarget: 10,
    available: true,
    selected: false,
    description: ''
  }
]

let hostWindow: BrowserWindow | null = null
let timer: ReturnType<typeof setInterval> | null = null
let last: SearchStatus = emptySearch()
let running = false
let tickInFlight: Promise<void> | null = null
let tickQueued = false
let pollGeneration = 0
let onChange: ((status: SearchStatus) => void) | null = null
let stickyNotice: { title: string; text: string; until: number } | null = null
/** Last modes scraped from the play panel — reused off-page when Vue panel is unmounted. */
let stickyModes: SearchMode[] = DEFAULT_SEARCH_MODES

type ActiveSearchPhase = 'searching' | 'accept' | 'launching' | 'inGame'

type StickyActiveSearch = {
  phase: ActiveSearchPhase
  title: string
  delay: string
  canCancel: boolean
  acceptAccepted: boolean
  acceptMode: string
  loading: boolean
  /** Last known clock string from site (e.g. "1:23"). */
  clockValue: string
  /** Wall time when clockValue was observed. */
  clockAt: number
  /** Wall time when this phase snapshot was observed. */
  phaseAt: number
  /** searching counts up; accept counts down. */
  clockDir: 'up' | 'down' | 'freeze'
}

let stickyActive: StickyActiveSearch | null = null

function isActivePhase(phase: SearchStatus['phase']): phase is ActiveSearchPhase {
  return phase === 'searching' || phase === 'accept' || phase === 'launching' || phase === 'inGame'
}

function parseClockSeconds(value: string): number | null {
  const m = String(value || '')
    .trim()
    .match(/^(\d+):(\d{2})$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function formatClockSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

function liveStickyTime(row: StickyActiveSearch): string {
  if (row.clockDir === 'freeze' || !row.clockValue) return row.clockValue
  const base = parseClockSeconds(row.clockValue)
  if (base == null) return row.clockValue
  const delta = (Date.now() - row.clockAt) / 1000
  if (row.clockDir === 'up') return formatClockSeconds(base + delta)
  return formatClockSeconds(base - delta)
}

function rememberStickyActive(status: SearchStatus): void {
  if (!isActivePhase(status.phase)) {
    stickyActive = null
    return
  }
  const clockDir: StickyActiveSearch['clockDir'] =
    status.phase === 'searching' ? 'up' : status.phase === 'accept' ? 'down' : 'freeze'
  const prev = stickyActive
  const sameClock = prev && prev.clockValue === status.time && prev.phase === status.phase
  stickyActive = {
    phase: status.phase,
    title: status.title,
    delay: status.delay,
    canCancel: status.canCancel,
    acceptAccepted: status.acceptAccepted,
    acceptMode: status.acceptMode,
    loading: status.loading,
    clockValue: status.time,
    // Keep wall anchor if site re-emits the same clock string every poll
    clockAt: sameClock && prev ? prev.clockAt : Date.now(),
    phaseAt: prev && prev.phase === status.phase ? prev.phaseAt : Date.now(),
    clockDir
  }
}

function statusFromStickyActive(insetLeft: number, notice: { title: string; text: string }): SearchStatus {
  const row = stickyActive!
  let phase = row.phase
  let title = row.title
  let active = row.phase !== 'inGame'
  let loading = row.loading

  // Off-page the site often stops exposing the launch->inGame transition.
  // After a short launching window, switch sticky chrome to in-game actions.
  if (row.phase === 'launching' && Date.now() - row.phaseAt >= 6_000) {
    phase = 'inGame'
    title = 'Вы в игре'
    active = false
    loading = false
  }

  return {
    phase,
    active,
    visible: true,
    playVisible: false,
    loading,
    title,
    time: phase === 'inGame' ? '' : liveStickyTime(row),
    delay: row.delay,
    canCancel: row.canCancel,
    acceptAccepted: row.acceptAccepted,
    acceptMode: row.acceptMode,
    noticeTitle: notice.title,
    noticeText: notice.text,
    modes: phase === 'searching' ? stickyModes : [],
    insetLeft,
    updatedAt: Date.now()
  }
}

function clearStickyNotice(): void {
  stickyNotice = null
}

function rememberNotice(title: string, text: string): void {
  const t = title.trim()
  const b = text.trim()
  if (!t && !b) return
  stickyNotice = {
    title: t,
    text: b,
    until: Date.now() + NOTICE_TTL_MS
  }
}

function activeNotice(): { title: string; text: string } {
  if (!stickyNotice) return { title: '', text: '' }
  if (Date.now() > stickyNotice.until) {
    stickyNotice = null
    return { title: '', text: '' }
  }
  return { title: stickyNotice.title, text: stickyNotice.text }
}

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.SEARCH_STATUS, last)
}

function stabilizeInset(next: number, prev: number, deadzone = INSET_DEADZONE_PX): number {
  const n = Math.max(0, Math.round(next))
  if (!Number.isFinite(n)) return prev
  // First real measure / reset from default — always take it.
  if (prev <= 24 && n > 24) return n
  return Math.abs(n - prev) < deadzone ? prev : n
}

function layoutFlag(s: SearchStatus): boolean {
  return s.visible || s.playVisible || Boolean(s.noticeTitle || s.noticeText)
}

function modesKey(modes: SearchMode[]): string {
  return modes
    .map((m) => `${m.mode}:${m.selected ? 1 : 0}:${m.count}:${m.available ? 1 : 0}`)
    .join('|')
}

function sameSearch(a: SearchStatus, b: SearchStatus): boolean {
  return (
    a.phase === b.phase &&
    a.active === b.active &&
    a.visible === b.visible &&
    a.playVisible === b.playVisible &&
    a.loading === b.loading &&
    a.title === b.title &&
    a.time === b.time &&
    a.delay === b.delay &&
    a.canCancel === b.canCancel &&
    a.acceptAccepted === b.acceptAccepted &&
    a.acceptMode === b.acceptMode &&
    a.noticeTitle === b.noticeTitle &&
    a.noticeText === b.noticeText &&
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

function normalizeQueueCounts(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object') return null
  const queues = (raw as { queues?: unknown }).queues
  if (!queues || typeof queues !== 'object' || Array.isArray(queues)) return null

  const counts: Record<string, number> = {}
  for (const [mode, value] of Object.entries(queues)) {
    if (!value || typeof value !== 'object') continue
    const players = (value as { players?: unknown }).players
    const count = Array.isArray(players) ? players.length : Number(players)
    if (Number.isFinite(count) && count >= 0) counts[mode] = Math.floor(count)
  }
  return Object.keys(counts).length ? counts : null
}

async function fetchQueueCounts(): Promise<Record<string, number> | null> {
  try {
    const response = await net.fetch(SEARCH_QUEUE_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(SEARCH_QUEUE_TIMEOUT_MS)
    })
    if (!response.ok) return null
    return normalizeQueueCounts((await response.json()) as unknown)
  } catch {
    // Keep the last known site snapshot while the queue API is unavailable.
    return null
  }
}

function mergeQueueCounts(
  modes: SearchMode[],
  counts: Record<string, number> | null
): SearchMode[] {
  if (!counts) return modes
  return modes.map((mode) =>
    Object.prototype.hasOwnProperty.call(counts, mode.mode)
      ? { ...mode, count: counts[mode.mode] }
      : mode
  )
}

async function tick(generation: number): Promise<void> {
  const view = getGameView()
  const wc = view?.webContents
  if (!wc || wc.isDestroyed()) {
    if (layoutFlag(last)) {
      clearStickyNotice()
      stickyActive = null
      stickyModes = DEFAULT_SEARCH_MODES
      last = emptySearch()
      emit()
      onChange?.(last)
    }
    return
  }

  try {
    const url = wc.getURL()
    if (!url.includes('polemicagame.com')) {
      // Don't wipe Play chrome on about:blank / mid-navigation blips
      if (!wc.isLoading() && layoutFlag(last)) {
        clearStickyNotice()
        stickyActive = null
        stickyModes = DEFAULT_SEARCH_MODES
        last = emptySearch()
        emit()
        onChange?.(last)
      }
      return
    }

    const raw = (await wc.executeJavaScript(SCRAPE_SEARCH_JS, true)) as {
      phase?: SearchStatus['phase']
      active: boolean
      visible: boolean
      playVisible: boolean
      loading: boolean
      title: string
      time: string
      delay: string
      canCancel: boolean
      acceptAccepted?: boolean
      acceptMode?: string
      noticeTitle?: string
      noticeText?: string
      modes: SearchMode[]
      insetLeft: number
      panelMissing?: boolean
      leftGame?: boolean
      onGameRoom?: boolean
    } | null

    if (
      !running ||
      generation !== pollGeneration ||
      wc.isDestroyed() ||
      wc.getURL() !== url
    ) {
      return
    }

    // Page mid-load / SPA tear-down — keep last sticky Play / search strip
    if (!raw || typeof raw !== 'object') return

    rememberNotice(String(raw.noticeTitle || ''), String(raw.noticeText || ''))
    const notice = activeNotice()
    const insetLeft = stabilizeInset(Number(raw.insetLeft) || 24, last.insetLeft)
    const shouldRefreshQueues =
      raw.phase === 'searching' ||
      Boolean(raw.panelMissing && stickyActive?.phase === 'searching')
    const queueCounts = shouldRefreshQueues ? await fetchQueueCounts() : null

    if (
      !running ||
      generation !== pollGeneration ||
      wc.isDestroyed() ||
      wc.getURL() !== url
    ) {
      return
    }

    if (queueCounts) {
      stickyModes = mergeQueueCounts(stickyModes, queueCounts)
    }

    const onGameRoomUrl = (() => {
      try {
        const p = new URL(url).pathname.replace(/\/$/, '') || '/'
        return p === '/game' || p.startsWith('/game/')
      } catch {
        return false
      }
    })()

    // Inside /game room: keep sticky session, but never show continue/quit over the room.
    if (onGameRoomUrl || raw.onGameRoom || (raw.phase === 'inGame' && raw.visible === false)) {
      if (last?.phase !== 'inGame') {
        void import('../prefs/clientPrefs')
          .then(({ syncCameraOffPrefToGame, getClientPrefs }) => {
            if (getClientPrefs().cameraOffOnLobbyEnter) return syncCameraOffPrefToGame(true)
          })
          .catch(() => undefined)
      }
      const next: SearchStatus = {
        phase: 'inGame',
        active: false,
        visible: false,
        playVisible: false,
        loading: false,
        title: 'Вы в игре',
        time: '',
        delay: '',
        canCancel: false,
        acceptAccepted: false,
        acceptMode: '',
        noticeTitle: notice.title,
        noticeText: notice.text,
        modes: [],
        insetLeft,
        updatedAt: Date.now()
      }
      rememberStickyActive({ ...next, visible: true })
      if (sameSearch(last, next)) return
      const wasLayout = layoutFlag(last)
      last = next
      emit()
      if (wasLayout !== layoutFlag(next)) onChange?.(next)
      return
    }

    // Off play page the search Vue panel is gone — keep searching/accept/timer chrome alive
    if (raw.panelMissing && stickyActive) {
      const next = statusFromStickyActive(insetLeft, notice)
      if (sameSearch(last, next)) return
      const wasLayout = layoutFlag(last)
      last = next
      emit()
      if (wasLayout !== layoutFlag(next)) onChange?.(next)
      return
    }

    if (raw.leftGame && stickyActive?.phase === 'inGame') {
      stickyActive = null
    }

    let phase = (['hidden', 'idle', 'searching', 'accept', 'launching', 'inGame'] as const).includes(
      raw.phase as SearchStatus['phase']
    )
      ? (raw.phase as SearchStatus['phase'])
      : raw.visible
        ? 'searching'
        : raw.playVisible
          ? 'idle'
          : 'hidden'

    let playVisible = Boolean(raw.playVisible)
    const banOwnsSlot = getBanStatus().visible

    // Pin Play strip on every site page. Ban banner owns the slot when visible;
    // active search phases use `visible` instead of playVisible.
    if (banOwnsSlot) {
      playVisible = false
      if (phase === 'idle' || phase === 'hidden') phase = 'hidden'
      stickyActive = null
    } else if (phase === 'hidden' || phase === 'idle') {
      // Keep continue/quit after leaving /game via home/menu — site idle scrape
      // would otherwise wipe sticky before (or without) store hydrate.
      if (stickyActive?.phase === 'inGame') {
        const next = statusFromStickyActive(insetLeft, notice)
        if (sameSearch(last, next)) return
        const wasLayout = layoutFlag(last)
        last = next
        emit()
        if (wasLayout !== layoutFlag(next)) onChange?.(next)
        return
      }
      phase = 'idle'
      playVisible = true
      stickyActive = null
    } else {
      playVisible = false
    }

    let modes = mergeQueueCounts(normalizeModes(raw.modes), queueCounts)
    if (modes.length) {
      stickyModes = modes
    } else if (phase === 'idle' || playVisible) {
      modes = stickyModes.length ? stickyModes : DEFAULT_SEARCH_MODES
    }

    const next: SearchStatus = {
      phase,
      active: Boolean(raw.active),
      visible: Boolean(raw.visible) || isActivePhase(phase),
      playVisible,
      loading: Boolean(raw.loading),
      title: String(raw.title || ''),
      time: String(raw.time || ''),
      delay: String(raw.delay || ''),
      canCancel: Boolean(raw.canCancel),
      acceptAccepted: Boolean(raw.acceptAccepted),
      acceptMode: String(raw.acceptMode || ''),
      noticeTitle: notice.title,
      noticeText: notice.text,
      modes,
      insetLeft,
      updatedAt: Date.now()
    }

    if (!banOwnsSlot && isActivePhase(next.phase)) {
      rememberStickyActive(next)
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

function requestTick(): void {
  if (!running) return
  if (tickInFlight) {
    tickQueued = true
    return
  }

  const generation = pollGeneration
  tickInFlight = tick(generation).finally(() => {
    tickInFlight = null
    const rerun = tickQueued || generation !== pollGeneration
    tickQueued = false
    if (running && rerun) requestTick()
  })
}

export function getSearchStatus(): SearchStatus {
  return last
}

export function bindSearchStatusWindow(win: BrowserWindow): void {
  hostWindow = win
}

export function unbindSearchStatusWindow(win: BrowserWindow): void {
  if (hostWindow === win) hostWindow = null
}

export function onSearchStatusChange(cb: ((status: SearchStatus) => void) | null): void {
  onChange = cb
}

export function refreshSearchStatus(): void {
  if (!running) return
  requestTick()
}

export async function cancelGameSearch(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    await ensurePlaySearchReady(wc)
    const ok = Boolean(await wc.executeJavaScript(CANCEL_SEARCH_JS, true))
    if (ok) stickyActive = null
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] cancel failed', err)
    return false
  }
}

async function ensurePlaySearchReady(wc: WebContents): Promise<boolean> {
  const needNav =
    !wc.getURL().includes('/game-search') ||
    Boolean(
      await wc.executeJavaScript(
        `(() => {
          const tabs = Array.from(document.querySelectorAll('.p-play__tab'));
          const watch = tabs.find((el) => (el.textContent || '').includes('Смотреть'));
          return Boolean(watch && watch.classList.contains('p-play__tab--active'));
        })()`,
        true
      )
    )
  if (needNav) {
    await gameSetLobbyTab('play')
  }
  // Wait briefly for search panel Vue vm after tab/nav
  for (let i = 0; i < 25; i++) {
    try {
      const ready = Boolean(
        await wc.executeJavaScript(
          `(() => {
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
            if (!app) return false;
            let ok = false;
            walk(app, (vm) => {
              if (
                vm &&
                (typeof vm.startSearch === 'function' || typeof vm.toggleSearch === 'function') &&
                (vm.searchState !== undefined || Array.isArray(vm.selectedCensorshipModes))
              ) {
                ok = true;
                return true;
              }
              return false;
            });
            return ok;
          })()`,
          true
        )
      )
      if (ready) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  return true
}

export async function startGameSearch(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false

  try {
    clearStickyNotice()
    await ensurePlaySearchReady(wc)

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
    await ensurePlaySearchReady(wc)
    const ok = Boolean(await wc.executeJavaScript(toggleModeJs(key), true))
    if (ok) {
      stickyModes = stickyModes.map((m) =>
        m.mode === key ? { ...m, selected: !m.selected } : m
      )
    }
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] toggle mode failed', err)
    return false
  }
}

export async function acceptGameSearch(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    await ensurePlaySearchReady(wc)
    const ok = Boolean(await wc.executeJavaScript(ACCEPT_GAME_JS, true))
    setTimeout(() => refreshSearchStatus(), 200)
    setTimeout(() => refreshSearchStatus(), 800)
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] accept failed', err)
    return false
  }
}

/** Replay site match-found signal (manual accept, near timer end). */
export async function playAcceptReminderSound(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    return Boolean(await wc.executeJavaScript(PLAY_ACCEPT_SOUND_JS, true))
  } catch (err) {
    console.warn('[search] accept reminder sound failed', err)
    return false
  }
}

export async function returnToGame(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    await ensurePlaySearchReady(wc)
    const ok = Boolean(await wc.executeJavaScript(RETURN_TO_GAME_JS, true))
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] return to game failed', err)
    return false
  }
}

export async function quitActiveGame(): Promise<boolean> {
  const wc = getGameView()?.webContents
  if (!wc || wc.isDestroyed()) return false
  try {
    await ensurePlaySearchReady(wc)
    const ok = Boolean(await wc.executeJavaScript(QUIT_GAME_JS, true))
    if (ok) stickyActive = null
    setTimeout(() => refreshSearchStatus(), 300)
    setTimeout(() => refreshSearchStatus(), 1200)
    refreshSearchStatus()
    return ok
  } catch (err) {
    console.warn('[search] quit game failed', err)
    return false
  }
}

export function dismissSearchNotice(): void {
  clearStickyNotice()
  if (!running) {
    last = { ...last, noticeTitle: '', noticeText: '', updatedAt: Date.now() }
    emit()
    return
  }
  last = { ...last, noticeTitle: '', noticeText: '', updatedAt: Date.now() }
  emit()
  onChange?.(last)
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
  bindNavigationRefresh()
  if (running) {
    requestTick()
    return
  }
  running = true
  pollGeneration += 1
  requestTick()
  timer = setInterval(() => {
    requestTick()
  }, POLL_MS)
}

export function stopSearchStatusPolling(): void {
  running = false
  pollGeneration += 1
  tickQueued = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  clearStickyNotice()
  stickyActive = null
  stickyModes = DEFAULT_SEARCH_MODES
  last = emptySearch()
  emit()
  onChange?.(last)
}
