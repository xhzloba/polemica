import { ipcMain, BrowserWindow, type BrowserWindow as BW } from 'electron'
import { IpcChannels } from '@shared/ipc'
import {
  gameClickCreateLobby,
  gameGoBack,
  gameGoForward,
  gameGoHome,
  gameGoto,
  gameReload,
  gameSetLobbySearch,
  gameSetLobbyTab,
  gameStop,
  getGameNavState
} from '../views/GameBrowserView'
import {
  enterApp,
  getAuthState,
  loginWithChrome,
  logout,
  resumeSession,
  setChromeOverlay
} from '../auth/authService'
import { getLiveStats } from '../live/liveStatsService'
import { getBanStatus, refreshBanStatus } from '../ban/banStatusService'
import {
  acceptGameSearch,
  cancelGameSearch,
  dismissSearchNotice,
  getSearchStatus,
  quitActiveGame,
  refreshSearchStatus,
  returnToGame,
  startGameSearch,
  toggleSearchMode
} from '../search/searchStatusService'
import { popupProfileMenu } from '../chrome/profileMenu'

type WindowGetter = () => BW | null

export function registerIpcHandlers(getWindow: WindowGetter): void {
  ipcMain.handle(IpcChannels.NAV_BACK, async () => gameGoBack())
  ipcMain.handle(IpcChannels.NAV_FORWARD, async () => gameGoForward())
  ipcMain.handle(IpcChannels.NAV_RELOAD, async () => gameReload())
  ipcMain.handle(IpcChannels.NAV_HOME, async () => gameGoHome())
  ipcMain.handle(IpcChannels.NAV_STOP, async () => gameStop())
  ipcMain.handle(IpcChannels.NAV_GOTO, async (_e, url: string) => gameGoto(url))
  ipcMain.handle(IpcChannels.CREATE_LOBBY, async () => gameClickCreateLobby())
  ipcMain.handle(IpcChannels.LOBBY_SEARCH, async (_e, query: string) =>
    gameSetLobbySearch(String(query ?? ''))
  )
  ipcMain.handle(IpcChannels.LOBBY_TAB, async (_e, tab: string) => {
    const ok = await gameSetLobbyTab(tab === 'watch' ? 'watch' : 'play')
    refreshBanStatus()
    refreshSearchStatus()
    return ok
  })
  ipcMain.handle(IpcChannels.GET_NAV_STATE, async () => getGameNavState())

  ipcMain.handle(IpcChannels.AUTH_GET_STATE, async () => getAuthState())
  ipcMain.handle(IpcChannels.AUTH_LOGIN_CHROME, async () => loginWithChrome())
  ipcMain.handle(IpcChannels.AUTH_RESUME, async () => resumeSession())
  ipcMain.handle(IpcChannels.AUTH_ENTER_APP, async () => enterApp())
  ipcMain.handle(IpcChannels.AUTH_LOGOUT, async () => logout())
  ipcMain.handle(IpcChannels.LIVE_STATS_GET, async () => getLiveStats())
  ipcMain.handle(IpcChannels.BAN_STATUS_GET, async () => getBanStatus())
  ipcMain.handle(IpcChannels.SEARCH_STATUS_GET, async () => getSearchStatus())
  ipcMain.handle(IpcChannels.SEARCH_CANCEL, async () => cancelGameSearch())
  ipcMain.handle(IpcChannels.SEARCH_START, async () => startGameSearch())
  ipcMain.handle(IpcChannels.SEARCH_TOGGLE_MODE, async (_e, mode: string) =>
    toggleSearchMode(String(mode ?? ''))
  )
  ipcMain.handle(IpcChannels.SEARCH_ACCEPT, async () => acceptGameSearch())
  ipcMain.handle(IpcChannels.SEARCH_RETURN_GAME, async () => returnToGame())
  ipcMain.handle(IpcChannels.SEARCH_QUIT_GAME, async () => quitActiveGame())
  ipcMain.handle(IpcChannels.SEARCH_DISMISS_NOTICE, async () => {
    dismissSearchNotice()
  })
  ipcMain.handle(IpcChannels.CHROME_OVERLAY, async (_e, open: boolean) => {
    setChromeOverlay(Boolean(open))
  })
  ipcMain.handle(
    IpcChannels.PROFILE_MENU,
    async (
      event,
      anchor?: { x: number; y: number; width?: number; height?: number }
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? getWindow()
      if (!win) return null
      return popupProfileMenu(win, anchor)
    }
  )

  ipcMain.handle(IpcChannels.WINDOW_MINIMIZE, async () => {
    getWindow()?.minimize()
  })

  ipcMain.handle(IpcChannels.WINDOW_MAXIMIZE, async () => {
    const win = getWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle(IpcChannels.WINDOW_CLOSE, async () => {
    getWindow()?.close()
  })
}
