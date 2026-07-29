import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { app, session } from 'electron'
import { GAME_ORIGIN } from '@shared/config'
import type { UserProfile } from '@shared/ipc'
import { dbGetPref, dbSetPref, ensureClientDb } from '../db/clientDb'

const PREF_KEY = 'authProfile'

function legacyProfilePath(): string {
  return join(app.getPath('userData'), 'auth-profile.json')
}

function normalizeProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<UserProfile>
  const username = String(data.username || '').trim()
  if (!username) return null
  return {
    username,
    avatarUrl:
      String(data.avatarUrl || '').trim() || `${GAME_ORIGIN}/image/user-avatar?size=100x`,
    profileUrl: data.profileUrl ? String(data.profileUrl) : undefined,
    syncedAt: Number(data.syncedAt) || Date.now()
  }
}

function readLegacyJson(): UserProfile | null {
  const path = legacyProfilePath()
  if (!existsSync(path)) return null
  try {
    return normalizeProfile(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

function clearLegacyJson(): void {
  const path = legacyProfilePath()
  if (!existsSync(path)) return
  try {
    unlinkSync(path)
  } catch {
    /* ignore */
  }
}

/** Load profile from SQLite (migrate old auth-profile.json once). */
export function loadCachedProfile(): UserProfile | null {
  try {
    const raw = dbGetPref(PREF_KEY)
    if (raw != null) {
      if (!String(raw).trim()) return null
      const parsed = normalizeProfile(JSON.parse(raw))
      if (parsed) return parsed
    }
  } catch {
    /* fall through to legacy */
  }

  const legacy = readLegacyJson()
  if (legacy) {
    try {
      saveCachedProfile(legacy)
      clearLegacyJson()
    } catch (err) {
      console.warn('[auth] migrate profile to sqlite failed', err)
    }
    return legacy
  }
  return null
}

export function saveCachedProfile(profile: UserProfile): void {
  const normalized = normalizeProfile(profile)
  if (!normalized) return
  // DB may not be ready in theory — ensure sync write path used after initClientPrefs
  try {
    dbSetPref(PREF_KEY, JSON.stringify(normalized))
  } catch (err) {
    console.warn('[auth] save profile to sqlite failed', err)
  }
  clearLegacyJson()
}

export function clearCachedProfile(): void {
  try {
    dbSetPref(PREF_KEY, '')
  } catch {
    /* ignore */
  }
  clearLegacyJson()
}

/** Ensure DB is up then return profile (startup). */
export async function loadCachedProfileAsync(): Promise<UserProfile | null> {
  try {
    await ensureClientDb()
  } catch {
    /* ignore */
  }
  return loadCachedProfile()
}

const SCRAPE_PROFILE_JS = `
(() => {
  const text = (el) => (el && (el.textContent || '').trim()) || '';
  const username =
    text(document.querySelector('.p-header__userCont-user-username')) ||
    text(document.querySelector('.p-header__userCont-user-name')) ||
    text(document.querySelector('[class*="userCont-user-username"]')) ||
    text(document.querySelector('.p-header__userCont-user span'));

  const avatarEl =
    document.querySelector('.p-header__userCont-user-avatar') ||
    document.querySelector('.p-header__userCont img') ||
    document.querySelector('[class*="userCont-user-avatar"]');
  let avatarUrl = '';
  if (avatarEl) {
    avatarUrl =
      avatarEl.currentSrc ||
      avatarEl.getAttribute('src') ||
      avatarEl.getAttribute('data-src') ||
      '';
  }
  avatarUrl = String(avatarUrl || '').replace(/&amp;/g, '&');
  if (avatarUrl && avatarUrl.startsWith('/')) avatarUrl = location.origin + avatarUrl;

  const profileHref =
    document.querySelector('.p-header__userCont-dropdown a[href^="/profile/"]')?.getAttribute('href') ||
    document.querySelector('a[href^="/profile/"]')?.getAttribute('href') ||
    '';
  const profileUrl = profileHref
    ? profileHref.startsWith('http')
      ? profileHref
      : location.origin + profileHref
    : '';

  let vueUser = null;
  const walk = (vm, depth) => {
    if (!vm || depth > 12 || vueUser) return;
    const u = vm.$store && vm.$store.state && (vm.$store.state.auth || vm.$store.state.user || vm.$store.state.profile);
    const candidate =
      (u && (u.user || u.profile || u.data || u)) ||
      vm.user ||
      vm.currentUser ||
      vm.profile;
    if (candidate && (candidate.username || candidate.name || candidate.login)) {
      vueUser = candidate;
      return;
    }
    const kids = vm.$children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i], depth + 1);
  };
  try {
    const app = document.querySelector('#app') && document.querySelector('#app').__vue__;
    if (app) walk(app, 0);
  } catch (e) {}

  const vueName = vueUser
    ? String(vueUser.username || vueUser.name || vueUser.login || '').trim()
    : '';
  const vueAvatar = vueUser
    ? String(vueUser.avatar_url || vueUser.avatarUrl || vueUser.avatar || '').trim()
    : '';

  const finalName = username || vueName;
  let finalAvatar = avatarUrl || vueAvatar;
  if (finalAvatar && finalAvatar.startsWith('/')) finalAvatar = location.origin + finalAvatar;

  return {
    loggedIn: Boolean(finalName),
    username: finalName,
    avatarUrl: finalAvatar,
    profileUrl
  };
})()
`

export interface ScrapedProfile {
  loggedIn: boolean
  username: string
  avatarUrl: string
  profileUrl: string
}

async function avatarToDataUrl(url: string): Promise<string | null> {
  try {
    const ses = session.fromPartition('persist:polemica-game')
    const res = await ses.fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/webp'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch (err) {
    console.warn('[auth] avatar fetch failed', err)
    return null
  }
}

export async function scrapeProfileFromPage(
  executeJavaScript: (code: string) => Promise<unknown>
): Promise<UserProfile> {
  const raw = (await executeJavaScript(SCRAPE_PROFILE_JS)) as ScrapedProfile
  if (!raw?.loggedIn || !raw.username) {
    throw new Error(
      'Сессия из Chrome не подхватилась. Убедись, что ты залогинен на polemicagame.com в Chrome.'
    )
  }

  const fallbackAvatar = `${GAME_ORIGIN}/image/user-avatar?size=100x`
  const remoteAvatar = raw.avatarUrl
    ? raw.avatarUrl.startsWith('http') || raw.avatarUrl.startsWith('data:')
      ? raw.avatarUrl
      : `${GAME_ORIGIN}${raw.avatarUrl.startsWith('/') ? '' : '/'}${raw.avatarUrl}`
    : fallbackAvatar

  const dataUrl =
    remoteAvatar.startsWith('data:') ? remoteAvatar : await avatarToDataUrl(remoteAvatar)

  const profile: UserProfile = {
    username: raw.username,
    avatarUrl: dataUrl || remoteAvatar || fallbackAvatar,
    profileUrl: raw.profileUrl || undefined,
    syncedAt: Date.now()
  }
  saveCachedProfile(profile)
  return profile
}

/** True if Electron partition already has site access-token. */
export async function hasElectronAccessToken(): Promise<boolean> {
  try {
    const ses = session.fromPartition('persist:polemica-game')
    const cookies = await ses.cookies.get({ domain: 'polemicagame.com' })
    return cookies.some((c) => c.name === 'access-token' && Boolean(c.value))
  } catch {
    return false
  }
}
