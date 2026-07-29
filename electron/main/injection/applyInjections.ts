import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { WebContents } from 'electron'
import { scriptsForUrl, stylesForUrl } from '../../injection/registry'

type InjectionState = {
  generation: number
  queue: Promise<void>
  cssGeneration: number
  scriptsGeneration: number
  loaderGeneration: number
  cssKeys: Set<string>
}

const injectionStates = new WeakMap<WebContents, InjectionState>()

function stateFor(wc: WebContents): InjectionState {
  let state = injectionStates.get(wc)
  if (!state) {
    state = {
      generation: 0,
      queue: Promise.resolve(),
      cssGeneration: -1,
      scriptsGeneration: -1,
      loaderGeneration: -1,
      cssKeys: new Set()
    }
    injectionStates.set(wc, state)
  }
  return state
}

function log(msg: string): void {
  const line = `[injection] ${new Date().toISOString()} ${msg}\n`
  try {
    appendFileSync(join(app.getPath('userData'), 'injection.log'), line)
  } catch {
    /* ignore */
  }
  console.log(line.trimEnd())
}

async function hideBootLoaderWhenReady(
  wc: WebContents,
  state: InjectionState,
  generation: number
): Promise<void> {
  let stableLobbyTicks = 0
  let prevLobbyState = ''

  for (let i = 0; i < 70; i++) {
    if (wc.isDestroyed() || state.generation !== generation) return
    try {
      const probe = (await wc.executeJavaScript(
        `(() => {
          const styleReady = Boolean(document.getElementById('polemica-client-css'));
          const path = (location.pathname || '').replace(/\\/$/, '') || '/';
          const onGameSearch = path === '/game-search' || path === '/';

          const rows = document.querySelectorAll('.p-play__lobby-table-row').length;
          const customEmptyReady = Boolean(
            document.querySelector('.polemica-lobby-empty[data-polemica-empty-ready="1"]')
          );
          const nativeEmptyReady = Array.from(
            document.querySelectorAll('.p-play__lobby *, .p-play__center *')
          ).some(
            (node) =>
              node instanceof HTMLElement &&
              !node.classList.contains('polemica-lobby-empty') &&
              (node.textContent || '').replace(/\\s+/g, ' ').trim() === 'Сейчас нет открытых лобби'
          );
          const lobbyRoot = Boolean(document.querySelector('.p-play__lobby') || document.querySelector('.p-play__lobby-table'));

          let lobbyState = 'unknown';
          if (rows > 0) {
            lobbyState = 'rows';
          } else if (customEmptyReady || nativeEmptyReady) {
            lobbyState = 'empty';
          } else if (lobbyRoot) {
            lobbyState = 'loading';
          }

          return {
            styleReady,
            onGameSearch,
            lobbyState,
            // Base readiness for non-lobby pages.
            baseReady: styleReady && Boolean(document.querySelector('#app') || document.querySelector('#__nuxt'))
          };
        })()`,
        true
      )) as {
        styleReady: boolean
        onGameSearch: boolean
        lobbyState: string
        baseReady: boolean
      }

      if (!probe.styleReady) {
        stableLobbyTicks = 0
        prevLobbyState = ''
        await new Promise((r) => setTimeout(r, 80))
        continue
      }

      if (!probe.onGameSearch) {
        if (probe.baseReady) break
        await new Promise((r) => setTimeout(r, 80))
        continue
      }

      if (probe.lobbyState === prevLobbyState && (probe.lobbyState === 'rows' || probe.lobbyState === 'empty')) {
        stableLobbyTicks += 1
      } else {
        stableLobbyTicks = 0
      }
      prevLobbyState = probe.lobbyState

      // Need a couple of stable polls to avoid "rows <-> empty" flicker on refresh.
      if (stableLobbyTicks >= 2) break
    } catch {
      /* page may still be navigating */
    }
    await new Promise((r) => setTimeout(r, 80))
  }

  if (wc.isDestroyed() || state.generation !== generation) return
  try {
    await wc.executeJavaScript(
      `(() => {
        document.getElementById('polemica-boot-loader')?.remove();
        document.getElementById('polemica-boot-loader-style')?.remove();
      })()`,
      true
    )
  } catch {
    /* ignore */
  }
}

/**
 * Applies registered CSS/JS patches to the game WebContents.
 */
async function applyInjectionsNow(
  wc: WebContents,
  reason: string,
  state: InjectionState,
  generation: number
): Promise<void> {
  if (wc.isDestroyed() || state.generation !== generation) return
  const url = wc.getURL()
  if (!url || url === 'about:blank') return

  log(`${reason} generation=${generation} url=${url}`)

  if (state.cssGeneration !== generation) {
    for (const style of stylesForUrl(url)) {
      try {
        // 'user' origin beats site author styles (including their !important)
        const key = await wc.insertCSS(style.css, { cssOrigin: 'user' })
        if (wc.isDestroyed()) return
        if (state.generation !== generation) {
          await wc.removeInsertedCSS(key).catch(() => undefined)
          return
        }
        state.cssKeys.add(key)
        log(`css ok: ${style.id}`)
      } catch (err) {
        log(`css failed: ${style.id} ${String(err)}`)
      }
    }
    state.cssGeneration = generation
  }

  if (state.scriptsGeneration !== generation) {
    for (const script of scriptsForUrl(url, 'document-end')) {
      if (wc.isDestroyed() || state.generation !== generation) return
      try {
        await wc.executeJavaScript(script.code, false)
        log(`js ok: ${script.id}`)
      } catch (err) {
        log(`script failed: ${script.id} ${String(err)}`)
      }
    }
    state.scriptsGeneration = generation
  }

  if (wc.isDestroyed() || state.generation !== generation) return
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

  if (state.loaderGeneration !== generation) {
    state.loaderGeneration = generation
    await hideBootLoaderWhenReady(wc, state, generation)
  }
}

export function applyInjections(wc: WebContents, reason: string): Promise<void> {
  if (wc.isDestroyed()) return Promise.resolve()
  const state = stateFor(wc)
  const generation = state.generation

  state.queue = state.queue
    .catch((err) => {
      log(`queue recovered ${String(err)}`)
    })
    .then(() => applyInjectionsNow(wc, reason, state, generation))
  return state.queue
}

function beginNavigation(wc: WebContents, resetCss: boolean): void {
  const state = stateFor(wc)
  state.generation += 1
  state.scriptsGeneration = -1
  state.loaderGeneration = -1
  if (!resetCss) {
    // Same document: keep the currently inserted CSS to avoid a visible flash.
    state.cssGeneration = state.generation
    return
  }

  state.cssGeneration = -1
  const keys = Array.from(state.cssKeys)
  state.cssKeys.clear()

  state.queue = state.queue
    .catch((err) => {
      log(`queue recovered before navigation ${String(err)}`)
    })
    .then(async () => {
      if (wc.isDestroyed()) return
      await Promise.all(keys.map((key) => wc.removeInsertedCSS(key).catch(() => undefined)))
    })
}

export function bindInjections(wc: WebContents): void {
  const run = (reason: string) => (): void => {
    void applyInjections(wc, reason)
  }

  wc.on('dom-ready', run('dom-ready'))
  wc.on('did-finish-load', run('did-finish-load'))
  wc.on('did-navigate-in-page', () => {
    beginNavigation(wc, false)
    void applyInjections(wc, 'did-navigate-in-page')
  })

  wc.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) beginNavigation(wc, true)
  })
}
