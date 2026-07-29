import type { ClientPrefs } from '@shared/ipc'

let cache: ClientPrefs | null = null
let loadPromise: Promise<ClientPrefs> | null = null

export function getCachedPrefs(): ClientPrefs | null {
  return cache
}

export function setCachedPrefs(prefs: ClientPrefs): void {
  cache = prefs
}

/** Warm / refresh prefs cache from main. Safe to call multiple times. */
export function loadClientPrefs(): Promise<ClientPrefs> {
  const api = window.polemica
  if (!api?.getPrefs) {
    const fallback: ClientPrefs = { cameraOffOnLobbyEnter: false, autoAccept: false }
    cache = fallback
    return Promise.resolve(fallback)
  }
  if (!loadPromise) {
    loadPromise = api
      .getPrefs()
      .then((prefs) => {
        cache = prefs
        return prefs
      })
      .catch(() => {
        const fallback: ClientPrefs = { cameraOffOnLobbyEnter: false, autoAccept: false }
        cache = fallback
        return fallback
      })
      .finally(() => {
        loadPromise = null
      })
  }
  return loadPromise
}
