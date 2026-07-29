import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannels,
  type AuthState,
  type BanStatus,
  type LiveStats,
  type NavState,
  type PolemicaApi,
  type SearchStatus
} from '@shared/ipc'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: PolemicaApi = {
  goBack: () => ipcRenderer.invoke(IpcChannels.NAV_BACK),
  goForward: () => ipcRenderer.invoke(IpcChannels.NAV_FORWARD),
  reload: () => ipcRenderer.invoke(IpcChannels.NAV_RELOAD),
  goHome: () => ipcRenderer.invoke(IpcChannels.NAV_HOME),
  stop: () => ipcRenderer.invoke(IpcChannels.NAV_STOP),
  goto: (url: string) => ipcRenderer.invoke(IpcChannels.NAV_GOTO, url),
  createLobby: () => ipcRenderer.invoke(IpcChannels.CREATE_LOBBY),
  setLobbySearch: (query: string) => ipcRenderer.invoke(IpcChannels.LOBBY_SEARCH, query),
  setLobbyTab: (tab: 'play' | 'watch') => ipcRenderer.invoke(IpcChannels.LOBBY_TAB, tab),
  minimize: () => ipcRenderer.invoke(IpcChannels.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IpcChannels.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.invoke(IpcChannels.WINDOW_CLOSE),
  getNavState: () => ipcRenderer.invoke(IpcChannels.GET_NAV_STATE),
  onNavState: (cb) => subscribe<NavState>(IpcChannels.NAV_STATE, cb),
  onProgress: (cb) => subscribe<number>(IpcChannels.LOAD_PROGRESS, cb),
  onTitle: (cb) => subscribe<string>(IpcChannels.PAGE_TITLE, cb),
  getAuthState: () => ipcRenderer.invoke(IpcChannels.AUTH_GET_STATE),
  loginWithChrome: () => ipcRenderer.invoke(IpcChannels.AUTH_LOGIN_CHROME),
  resumeSession: () => ipcRenderer.invoke(IpcChannels.AUTH_RESUME),
  enterApp: () => ipcRenderer.invoke(IpcChannels.AUTH_ENTER_APP),
  logout: () => ipcRenderer.invoke(IpcChannels.AUTH_LOGOUT),
  onAuthState: (cb) => subscribe<AuthState>(IpcChannels.AUTH_STATE, cb),
  getLiveStats: () => ipcRenderer.invoke(IpcChannels.LIVE_STATS_GET),
  refreshLiveStats: () => ipcRenderer.invoke(IpcChannels.LIVE_STATS_REFRESH),
  onLiveStats: (cb) => subscribe<LiveStats>(IpcChannels.LIVE_STATS, cb),
  getBanStatus: () => ipcRenderer.invoke(IpcChannels.BAN_STATUS_GET),
  onBanStatus: (cb) => subscribe<BanStatus>(IpcChannels.BAN_STATUS, cb),
  getSearchStatus: () => ipcRenderer.invoke(IpcChannels.SEARCH_STATUS_GET),
  onSearchStatus: (cb) => subscribe<SearchStatus>(IpcChannels.SEARCH_STATUS, cb),
  cancelGameSearch: () => ipcRenderer.invoke(IpcChannels.SEARCH_CANCEL),
  startGameSearch: () => ipcRenderer.invoke(IpcChannels.SEARCH_START),
  toggleSearchMode: (mode: string) => ipcRenderer.invoke(IpcChannels.SEARCH_TOGGLE_MODE, mode),
  acceptGameSearch: () => ipcRenderer.invoke(IpcChannels.SEARCH_ACCEPT),
  returnToGame: () => ipcRenderer.invoke(IpcChannels.SEARCH_RETURN_GAME),
  quitActiveGame: () => ipcRenderer.invoke(IpcChannels.SEARCH_QUIT_GAME),
  dismissSearchNotice: () => ipcRenderer.invoke(IpcChannels.SEARCH_DISMISS_NOTICE),
  openProfileMenu: (anchor?: { x: number; y: number; width?: number; height?: number }) =>
    ipcRenderer.invoke(IpcChannels.PROFILE_MENU, anchor),
  setChromeOverlay: (open: boolean) =>
    ipcRenderer.sendSync(IpcChannels.CHROME_OVERLAY, open) as { viewX: number },
  openLivePlayersMenu: (anchor) => ipcRenderer.invoke(IpcChannels.LIVE_PLAYERS_MENU, anchor)
}

contextBridge.exposeInMainWorld('polemica', api)
