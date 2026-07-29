import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { ClientPrefs } from '@shared/ipc'

export const DEFAULT_CLIENT_PREFS: ClientPrefs = {
  cameraOffOnLobbyEnter: false
}

function prefsPath(): string {
  return join(app.getPath('userData'), 'client-prefs.json')
}

function normalize(raw: unknown): ClientPrefs {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    cameraOffOnLobbyEnter: Boolean(obj.cameraOffOnLobbyEnter)
  }
}

export function getClientPrefs(): ClientPrefs {
  const path = prefsPath()
  if (!existsSync(path)) return { ...DEFAULT_CLIENT_PREFS }
  try {
    return normalize(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return { ...DEFAULT_CLIENT_PREFS }
  }
}

export function setClientPrefs(patch: Partial<ClientPrefs>): ClientPrefs {
  const next = normalize({ ...getClientPrefs(), ...patch })
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(prefsPath(), JSON.stringify(next, null, 2), 'utf8')
  void syncCameraOffPrefToGame(next.cameraOffOnLobbyEnter)
  return next
}

const CAM_ON = '516810fd6c1e38f17335'
const CAM_OFF = 'edf479f3365a51e1beca'

/** Push pref into /game page and force camera to match (off when pref on, on when pref off). */
export async function syncCameraOffPrefToGame(enabled?: boolean): Promise<void> {
  const { getGameView } = await import('../views/GameBrowserView')
  const view = getGameView()
  const wc = view?.webContents
  if (!wc || wc.isDestroyed()) return
  const wantOff = enabled ?? getClientPrefs().cameraOffOnLobbyEnter
  try {
    await wc.executeJavaScript(
      `(() => {
        const wantOff = ${wantOff ? 'true' : 'false'};
        window.__polemicaCameraOffOnLobbyEnter = wantOff;
        if (typeof window.__polemicaSetLobbyCamera === 'function') {
          window.__polemicaSetLobbyCamera(wantOff);
          return 'api';
        }
        if (typeof window.__polemicaApplyCameraOffPref === 'function') {
          window.__polemicaApplyCameraOffPref();
        }
        // Fallback DOM click if inject not ready yet
        const path = (location.pathname || '').replace(/\\/$/, '') || '/';
        if (path !== '/game' && !path.startsWith('/game/')) return 'skip';
        const CAM_ON = ${JSON.stringify(CAM_ON)};
        const CAM_OFF = ${JSON.stringify(CAM_OFF)};
        const buttons = Array.from(
          document.querySelectorAll('.button.preset-1.small.desktop-version, .button.preset-1.small')
        );
        for (const btn of buttons) {
          if (!(btn instanceof HTMLElement)) continue;
          const img = btn.querySelector('img');
          const src = ((img && (img.getAttribute('src') || img.currentSrc)) || '').toLowerCase();
          const isCam = src.indexOf(CAM_ON) !== -1 || src.indexOf(CAM_OFF) !== -1;
          if (!isCam) continue;
          const isOff = src.indexOf(CAM_OFF) !== -1 || btn.classList.contains('off');
          if (isOff !== wantOff) btn.click();
          return 'click';
        }
        return 'no-btn';
      })()`,
      false
    )
  } catch (err) {
    console.warn('[prefs] sync camera failed', err)
  }
}
