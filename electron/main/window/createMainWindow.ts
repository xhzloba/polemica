import { BrowserWindow, shell, app } from 'electron'
import { join } from 'node:path'
import { APP_NAME, WINDOW } from '@shared/config'
import {
  attachGameView,
  detachGameView,
  getGameView
} from '../views/GameBrowserView'
import { bindAuthWindow, getAuthState, relayoutAuth } from '../auth/authService'
import { bindLiveStatsWindow } from '../live/liveStatsService'
import { bindBanStatusWindow } from '../ban/banStatusService'

const isDev = !app.isPackaged

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: APP_NAME,
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 22 },
    backgroundColor: '#0b0f14',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  attachGameView(win)
  bindAuthWindow(win)
  bindLiveStatsWindow(win)
  bindBanStatusWindow(win)

  const relayout = (): void => relayoutAuth(win)
  win.on('resize', relayout)
  win.on('enter-full-screen', relayout)
  win.on('leave-full-screen', relayout)
  win.once('ready-to-show', relayout)
  relayout()

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    const openGameDevTools = (): void => {
      if (getAuthState().phase !== 'app') return
      getGameView()?.webContents.openDevTools({ mode: 'right' })
    }

    win.webContents.once('did-finish-load', () => {
      setTimeout(openGameDevTools, 300)
    })

    const toggle = (): void => {
      const game = getGameView()?.webContents
      if (!game || game.isDestroyed()) return
      if (game.isDevToolsOpened()) game.closeDevTools()
      else game.openDevTools({ mode: 'right' })
    }

    win.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase()
      const open =
        (input.meta && input.alt && key === 'i') ||
        (input.control && input.shift && key === 'i') ||
        key === 'f12'
      if (open && input.type === 'keyDown') {
        event.preventDefault()
        toggle()
      }
    })
  }

  win.on('closed', () => {
    detachGameView(win)
  })

  return win
}
