import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, session } from 'electron'
import { GAME_ORIGIN } from '@shared/config'
import type { UserProfile } from '@shared/ipc'

function profilePath(): string {
  return join(app.getPath('userData'), 'auth-profile.json')
}

export function loadCachedProfile(): UserProfile | null {
  const path = profilePath()
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as UserProfile
    if (!data?.username || !data?.avatarUrl) return null
    return data
  } catch {
    return null
  }
}

export function saveCachedProfile(profile: UserProfile): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(profilePath(), JSON.stringify(profile, null, 2), 'utf8')
}

export function clearCachedProfile(): void {
  const path = profilePath()
  if (!existsSync(path)) return
  try {
    unlinkSync(path)
  } catch {
    /* ignore */
  }
}

const SCRAPE_PROFILE_JS = `
(() => {
  const username = document.querySelector('.p-header__userCont-user-username')?.textContent?.trim() || '';
  const avatarEl = document.querySelector('.p-header__userCont-user-avatar');
  let avatarUrl = avatarEl?.currentSrc || avatarEl?.getAttribute('src') || '';
  avatarUrl = avatarUrl.replace(/&amp;/g, '&');
  if (avatarUrl && avatarUrl.startsWith('/')) {
    avatarUrl = location.origin + avatarUrl;
  }
  const profileHref = document.querySelector('.p-header__userCont-dropdown a[href^="/profile/"]')?.getAttribute('href') || '';
  const profileUrl = profileHref
    ? (profileHref.startsWith('http') ? profileHref : location.origin + profileHref)
    : '';
  const loggedIn = Boolean(username && avatarUrl);
  return { loggedIn, username, avatarUrl, profileUrl };
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
  if (!raw?.loggedIn || !raw.username || !raw.avatarUrl) {
    throw new Error(
      'Сессия из Chrome не подхватилась. Убедись, что ты залогинен на polemicagame.com в Chrome.'
    )
  }

  const remoteAvatar = raw.avatarUrl.startsWith('http')
    ? raw.avatarUrl
    : `${GAME_ORIGIN}${raw.avatarUrl.startsWith('/') ? '' : '/'}${raw.avatarUrl}`

  const dataUrl = await avatarToDataUrl(remoteAvatar)

  const profile: UserProfile = {
    username: raw.username,
    avatarUrl: dataUrl || remoteAvatar,
    profileUrl: raw.profileUrl || undefined,
    syncedAt: Date.now()
  }
  saveCachedProfile(profile)
  return profile
}
