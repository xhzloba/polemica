/** Typed IPC contract between main ↔ preload ↔ renderer. */

export const IpcChannels = {
  // renderer → main
  NAV_BACK: 'nav:back',
  NAV_FORWARD: 'nav:forward',
  NAV_RELOAD: 'nav:reload',
  NAV_HOME: 'nav:home',
  NAV_STOP: 'nav:stop',
  NAV_GOTO: 'nav:goto',
  CREATE_LOBBY: 'nav:create-lobby',
  LOBBY_SEARCH: 'nav:lobby-search',
  LOBBY_TAB: 'nav:lobby-tab',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  GET_NAV_STATE: 'nav:get-state',

  AUTH_GET_STATE: 'auth:get-state',
  AUTH_LOGIN_CHROME: 'auth:login-chrome',
  AUTH_RESUME: 'auth:resume',
  AUTH_ENTER_APP: 'auth:enter-app',
  AUTH_LOGOUT: 'auth:logout',
  LIVE_STATS_GET: 'live:stats-get',
  LIVE_STATS_REFRESH: 'live:stats-refresh',
  BAN_STATUS_GET: 'ban:status-get',
  SEARCH_STATUS_GET: 'search:status-get',
  SEARCH_CANCEL: 'search:cancel',
  SEARCH_START: 'search:start',
  SEARCH_TOGGLE_MODE: 'search:toggle-mode',
  SEARCH_ACCEPT: 'search:accept',
  SEARCH_RETURN_GAME: 'search:return-game',
  SEARCH_QUIT_GAME: 'search:quit-game',
  SEARCH_DISMISS_NOTICE: 'search:dismiss-notice',
  SEARCH_PLAY_ACCEPT_SOUND: 'search:play-accept-sound',
  PROFILE_MENU: 'chrome:profile-menu',
  CHROME_OVERLAY: 'chrome:overlay',
  LIVE_PLAYERS_MENU: 'chrome:live-players-menu',
  PLAY_ACTION_MENU: 'chrome:play-action-menu',

  // main → renderer
  NAV_STATE: 'nav:state',
  LOAD_PROGRESS: 'nav:progress',
  PAGE_TITLE: 'nav:title',
  AUTH_STATE: 'auth:state',
  LIVE_STATS: 'live:stats',
  BAN_STATUS: 'ban:status',
  SEARCH_STATUS: 'search:status'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

export interface NavState {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  progress: number
}

export interface UserProfile {
  username: string
  avatarUrl: string
  profileUrl?: string
  syncedAt: number
}

export type AuthPhase = 'splash' | 'greeting' | 'app'

export interface AuthState {
  phase: AuthPhase
  profile: UserProfile | null
  error: string | null
  busy: boolean
}

/** Player currently sitting in a lobby from /current-games/get-current-games */
export interface LivePlayer {
  id: number
  username: string
  avatarUrl: string
  mmr: number | null
  subscription: string
  primeMember: boolean
  quit: boolean
  profileUrl: string
}

/** Aggregated from /current-games/get-current-games */
export interface LiveStats {
  lobbies: number
  /** Sum of playersNumber across lobbies — people currently in rooms */
  players: number
  viewers: number
  playing: number
  recruiting: number
  /** Lobbies with `lobbyInMediaRoom` — available streams */
  streams: number
  /** Deduped player roster across open lobbies */
  onlinePlayers: LivePlayer[]
  updatedAt: number
}

/** Scraped from `.p-play__profile-game--ban` on the site */
export interface BanStatus {
  /** User currently has a search ban on the site */
  active: boolean
  /** Show chrome banner — only on menu «Играть» (game-search play tab) */
  visible: boolean
  title: string
  until: string
  reason: string
  updatedAt: number
}

/** Censorship / queue mode from hidden profile panel */
export interface SearchMode {
  mode: string
  title: string
  count: number
  countTarget: number
  available: boolean
  selected: boolean
  description: string
}

/** Scraped from hidden `.p-play__profile` search / play controls */
export type SearchPhase = 'hidden' | 'idle' | 'searching' | 'accept' | 'launching' | 'inGame'

export interface SearchStatus {
  phase: SearchPhase
  /** Free-search / matchmaking is running on the site */
  active: boolean
  /** Show searching / accept / launch / in-game chrome strip */
  visible: boolean
  /** Show idle «Играть» CTA (game-search play tab, not ban/search) */
  playVisible: boolean
  /** Spinner-only connecting / launching state */
  loading: boolean
  title: string
  time: string
  delay: string
  canCancel: boolean
  /** Match found — waiting for accept (or already accepted) */
  acceptAccepted: boolean
  acceptMode: string
  /** From site break-search modal — shown on the right of the play strip */
  noticeTitle: string
  noticeText: string
  modes: SearchMode[]
  /** px — left edge of lobby table inside game view (align chrome controls) */
  insetLeft: number
  updatedAt: number
}

export interface PolemicaApi {
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  reload: () => Promise<void>
  goHome: () => Promise<void>
  stop: () => Promise<void>
  goto: (url: string) => Promise<void>
  createLobby: () => Promise<boolean>
  setLobbySearch: (query: string) => Promise<boolean>
  setLobbyTab: (tab: 'play' | 'watch') => Promise<boolean>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  getNavState: () => Promise<NavState>
  onNavState: (cb: (state: NavState) => void) => () => void
  onProgress: (cb: (progress: number) => void) => () => void
  onTitle: (cb: (title: string) => void) => () => void
  getAuthState: () => Promise<AuthState>
  loginWithChrome: () => Promise<AuthState>
  resumeSession: () => Promise<AuthState>
  enterApp: () => Promise<AuthState>
  logout: () => Promise<AuthState>
  onAuthState: (cb: (state: AuthState) => void) => () => void
  getLiveStats: () => Promise<LiveStats>
  refreshLiveStats: () => Promise<LiveStats>
  onLiveStats: (cb: (stats: LiveStats) => void) => () => void
  getBanStatus: () => Promise<BanStatus>
  onBanStatus: (cb: (status: BanStatus) => void) => () => void
  getSearchStatus: () => Promise<SearchStatus>
  onSearchStatus: (cb: (status: SearchStatus) => void) => () => void
  cancelGameSearch: () => Promise<boolean>
  startGameSearch: () => Promise<boolean>
  toggleSearchMode: (mode: string) => Promise<boolean>
  acceptGameSearch: () => Promise<boolean>
  playAcceptReminderSound: () => Promise<boolean>
  returnToGame: () => Promise<boolean>
  quitActiveGame: () => Promise<boolean>
  dismissSearchNotice: () => Promise<void>
  openProfileMenu: (anchor?: {
    x: number
    y: number
    width?: number
    height?: number
  }) => Promise<'profile' | 'settings' | 'logout' | null>
  setChromeOverlay: (open: boolean) => { viewX: number }
  openLivePlayersMenu: (anchor: {
    x: number
    y: number
    right: number
    bottom: number
  }) => Promise<void>
  openPlayActionMenu: (
    anchor: {
      x: number
      y: number
      right: number
      bottom: number
    },
    opts: { autoAccept: boolean }
  ) => Promise<{ autoAccept: boolean } | null>
}
