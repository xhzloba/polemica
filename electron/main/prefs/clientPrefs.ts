import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { IpcChannels, type ClientPrefs } from '@shared/ipc'
import {
  dbGetAllPrefs,
  dbSetPref,
  ensureClientDb
} from '../db/clientDb'

export const DEFAULT_CLIENT_PREFS: ClientPrefs = {
  cameraOffOnLobbyEnter: false,
  autoAccept: false
}

const KEY_CAMERA_OFF = 'cameraOffOnLobbyEnter'
const KEY_AUTO_ACCEPT = 'autoAccept'

let cache: ClientPrefs = { ...DEFAULT_CLIENT_PREFS }
let booted = false

function normalize(raw: unknown): ClientPrefs {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    cameraOffOnLobbyEnter: Boolean(obj.cameraOffOnLobbyEnter),
    autoAccept: Boolean(obj.autoAccept)
  }
}

function readBool(all: Record<string, string>, key: string): boolean {
  const v = all[key]
  return v === '1' || v === 'true'
}

function prefsFromDb(): ClientPrefs {
  const all = dbGetAllPrefs()
  return normalize({
    cameraOffOnLobbyEnter: readBool(all, KEY_CAMERA_OFF),
    autoAccept: readBool(all, KEY_AUTO_ACCEPT)
  })
}

function writePrefsToDb(prefs: ClientPrefs): void {
  dbSetPref(KEY_CAMERA_OFF, prefs.cameraOffOnLobbyEnter ? '1' : '0')
  dbSetPref(KEY_AUTO_ACCEPT, prefs.autoAccept ? '1' : '0')
}

function emitPrefs(prefs: ClientPrefs): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send(IpcChannels.PREFS_CHANGED, prefs)
  }
}

function legacyJsonPath(): string {
  return join(app.getPath('userData'), 'client-prefs.json')
}

function migrateLegacyJson(): void {
  const path = legacyJsonPath()
  if (!existsSync(path)) return
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<ClientPrefs>
    const migrated = normalize({ ...DEFAULT_CLIENT_PREFS, ...raw })
    writePrefsToDb(migrated)
    cache = migrated
    try {
      unlinkSync(path)
    } catch {
      /* keep legacy file if delete fails */
    }
  } catch (err) {
    console.warn('[prefs] legacy json migrate failed', err)
  }
}

/** Open SQLite under ./db, migrate old JSON once. Call from app.whenReady. */
export async function initClientPrefs(): Promise<ClientPrefs> {
  await ensureClientDb()
  const existing = dbGetAllPrefs()
  if (!existing[KEY_CAMERA_OFF] && !existing[KEY_AUTO_ACCEPT] && Object.keys(existing).length === 0) {
    migrateLegacyJson()
  }
  cache = prefsFromDb()
  // Ensure rows exist after first launch / schema growth.
  writePrefsToDb(cache)
  booted = true
  return { ...cache }
}

export function getClientPrefs(): ClientPrefs {
  return { ...cache }
}

export function setClientPrefs(patch: Partial<ClientPrefs>): ClientPrefs {
  const next = normalize({ ...cache, ...patch })
  cache = next
  if (booted) {
    try {
      writePrefsToDb(next)
    } catch (err) {
      console.warn('[prefs] sqlite write failed', err)
    }
  }
  emitPrefs(next)
  if (Object.prototype.hasOwnProperty.call(patch, 'cameraOffOnLobbyEnter')) {
    void syncCameraOffPrefToGame(next.cameraOffOnLobbyEnter)
  }
  return { ...next }
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
