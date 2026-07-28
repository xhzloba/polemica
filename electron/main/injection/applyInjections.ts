import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { WebContents } from 'electron'
import { scriptsForUrl, stylesForUrl } from '../../injection/registry'

const cssReady = new WeakSet<WebContents>()

function log(msg: string): void {
  const line = `[injection] ${new Date().toISOString()} ${msg}\n`
  try {
    appendFileSync(join(app.getPath('userData'), 'injection.log'), line)
  } catch {
    /* ignore */
  }
  console.log(line.trimEnd())
}

/**
 * Applies registered CSS/JS patches to the game WebContents.
 */
export async function applyInjections(wc: WebContents, reason: string): Promise<void> {
  if (wc.isDestroyed()) return

  const url = wc.getURL()
  if (!url || url === 'about:blank') return

  log(`${reason} url=${url}`)

  if (!cssReady.has(wc) || reason === 'dom-ready' || reason === 'did-finish-load') {
    for (const style of stylesForUrl(url)) {
      try {
        // 'user' origin beats site author styles (including their !important)
        await wc.insertCSS(style.css, { cssOrigin: 'user' })
        log(`css ok: ${style.id}`)
      } catch (err) {
        log(`css failed: ${style.id} ${String(err)}`)
      }
    }
    cssReady.add(wc)
  }

  for (const script of scriptsForUrl(url, 'document-end')) {
    try {
      await wc.executeJavaScript(script.code, false)
      log(`js ok: ${script.id}`)
    } catch (err) {
      log(`script failed: ${script.id} ${String(err)}`)
    }
  }

  try {
    const stats = (await wc.executeJavaScript(
      `({
        footers: document.querySelectorAll('footer.p-footer, .p-footer').length,
        styleTag: !!document.getElementById('polemica-client-css'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
      })`,
      false
    )) as { footers: number; styleTag: boolean; display: string[] }
    log(`stats ${JSON.stringify(stats)}`)
  } catch (err) {
    log(`stats failed ${String(err)}`)
  }
}

export function bindInjections(wc: WebContents): void {
  const run = (reason: string) => (): void => {
    void applyInjections(wc, reason)
  }

  wc.on('dom-ready', run('dom-ready'))
  wc.on('did-finish-load', run('did-finish-load'))
  wc.on('did-navigate-in-page', run('did-navigate-in-page'))

  wc.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) cssReady.delete(wc)
  })
}
