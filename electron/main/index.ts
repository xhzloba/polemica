import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window/createMainWindow'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { hardenSession } from './security/session'

let mainWindow: BrowserWindow | null = null

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    hardenSession()
    try {
      const { initClientPrefs } = await import('./prefs/clientPrefs')
      await initClientPrefs()
    } catch (err) {
      console.warn('[prefs] db init failed', err)
    }
    registerIpcHandlers(() => mainWindow)
    mainWindow = createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      } else {
        mainWindow?.show()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
