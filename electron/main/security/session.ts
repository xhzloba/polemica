import { session, app } from 'electron'
import { ALLOWED_ORIGINS } from '@shared/config'

/**
 * Harden default + game partitions:
 * - block permission prompts that don't make sense for a game shell
 * - keep cookies/localStorage for auth via persist:polemica-game
 */
export function hardenSession(): void {
  const partitions = [session.defaultSession, session.fromPartition('persist:polemica-game')]

  for (const ses of partitions) {
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      const allow = permission === 'notifications' || permission === 'media' || permission === 'clipboard-sanitized-write'
      callback(allow)
    })

    ses.webRequest.onBeforeRequest((details, callback) => {
      // Allow everything for the game origin; block nothing here by default.
      // Hook point for future ad/tracker filtering.
      void details
      callback({})
    })
  }

  // Refuse navigation to unexpected protocols in any window
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => {
      // We don't use <webview> tags — deny if something injects one
      event.preventDefault()
    })

    contents.setWindowOpenHandler(({ url }) => {
      try {
        const { origin } = new URL(url)
        if ((ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
          return { action: 'allow' }
        }
      } catch {
        /* ignore */
      }
      return { action: 'deny' }
    })
  })
}
