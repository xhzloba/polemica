import { session, type Cookie } from 'electron'
import { createHash } from 'node:crypto'
import { GAME_ORIGIN } from '@shared/config'
import type { SavedAccount, UserProfile } from '@shared/ipc'
import { dbGetPref, dbSetPref, dbRun, dbAll, dbGet, ensureClientDb } from '../db/clientDb'

const COOKIE_DOMAIN = 'polemicagame.com'
const PARTITION = 'persist:polemica-game'
const ACTIVE_KEY = 'activeAccountId'

export interface StoredCookie {
  name: string
  value: string
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  expirationDate?: number
  sameSite?: Cookie['sameSite']
}

export interface AccountRow {
  id: string
  username: string
  avatarUrl: string
  profileUrl?: string
  cookies: StoredCookie[]
  syncedAt: number
  lastUsedAt: number
}

function accountIdFromProfile(profile: UserProfile): string {
  const href = String(profile.profileUrl || '')
  const m = href.match(/\/profile\/(\d+)/)
  if (m?.[1]) return `u${m[1]}`
  const key = profile.username.trim().toLowerCase()
  return `n${createHash('sha1').update(key).digest('hex').slice(0, 12)}`
}

function toSaved(row: AccountRow): SavedAccount {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    profileUrl: row.profileUrl,
    syncedAt: row.syncedAt,
    lastUsedAt: row.lastUsedAt,
    hasToken: row.cookies.some((c) => c.name === 'access-token' && Boolean(c.value))
  }
}

function parseCookies(raw: string): StoredCookie[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((c): c is StoredCookie => Boolean(c && typeof c === 'object' && (c as StoredCookie).name))
      .map((c) => ({
        name: String(c.name),
        value: String(c.value ?? ''),
        domain: c.domain ? String(c.domain) : undefined,
        path: c.path ? String(c.path) : '/',
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        expirationDate:
          typeof c.expirationDate === 'number' && Number.isFinite(c.expirationDate)
            ? c.expirationDate
            : undefined,
        sameSite: c.sameSite
      }))
      .filter((c) => c.name && c.value)
  } catch {
    return []
  }
}

function rowFromDb(r: Record<string, unknown>): AccountRow | null {
  const id = String(r.id || '').trim()
  const username = String(r.username || '').trim()
  if (!id || !username) return null
  return {
    id,
    username,
    avatarUrl:
      String(r.avatar_url || '').trim() || `${GAME_ORIGIN}/image/user-avatar?size=100x`,
    profileUrl: r.profile_url ? String(r.profile_url) : undefined,
    cookies: parseCookies(String(r.cookies_json || '[]')),
    syncedAt: Number(r.synced_at) || Date.now(),
    lastUsedAt: Number(r.last_used_at) || Date.now()
  }
}

/** Dump polemica cookies from Electron partition. */
export async function exportPartitionCookies(): Promise<StoredCookie[]> {
  const ses = session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({})
  return cookies
    .filter((c) => (c.domain || '').includes(COOKIE_DOMAIN) && c.value)
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
      expirationDate: c.expirationDate,
      sameSite: c.sameSite
    }))
}

/** Clear polemica cookies in partition. */
export async function clearPartitionCookies(): Promise<void> {
  const ses = session.fromPartition(PARTITION)
  const cookies = await ses.cookies.get({})
  await Promise.all(
    cookies
      .filter((c) => (c.domain || '').includes(COOKIE_DOMAIN))
      .map((c) => {
        const host = (c.domain || COOKIE_DOMAIN).replace(/^\./, '')
        return ses.cookies.remove(`https://${host}${c.path || '/'}`, c.name)
      })
  )
}

/** Restore cookies into Electron partition (replaces existing polemica cookies). */
export async function restorePartitionCookies(cookies: StoredCookie[]): Promise<boolean> {
  await clearPartitionCookies()
  const ses = session.fromPartition(PARTITION)
  let hasAccessToken = false

  for (const c of cookies) {
    if (!c.name || !c.value) continue
    if (c.name === 'access-token') hasAccessToken = true
    const hostKey = (c.domain || COOKIE_DOMAIN).replace(/^\./, '') || COOKIE_DOMAIN
    const path = c.path || '/'
    const secure = c.secure !== false
    const url = `${secure ? 'https' : 'http'}://${hostKey}${path.startsWith('/') ? path : `/${path}`}`
    try {
      await ses.cookies.set({
        url,
        name: c.name,
        value: c.value,
        path,
        domain: c.domain,
        secure,
        httpOnly: Boolean(c.httpOnly),
        expirationDate: c.expirationDate,
        sameSite: c.sameSite || 'unspecified'
      })
    } catch (err) {
      console.warn('[auth] restore cookie failed', c.name, err)
    }
  }

  await ses.cookies.flushStore()
  return hasAccessToken
}

export function listAccounts(): SavedAccount[] {
  const rows = dbAll(
    `SELECT id, username, avatar_url, profile_url, cookies_json, synced_at, last_used_at
     FROM accounts ORDER BY last_used_at DESC`
  )
  return rows
    .map((r) => rowFromDb(r))
    .filter((r): r is AccountRow => Boolean(r))
    .map(toSaved)
}

export function getAccount(id: string): AccountRow | null {
  const row = dbGet(
    `SELECT id, username, avatar_url, profile_url, cookies_json, synced_at, last_used_at
     FROM accounts WHERE id = ?`,
    [id]
  )
  return row ? rowFromDb(row) : null
}

export function getActiveAccountId(): string | null {
  const raw = dbGetPref(ACTIVE_KEY)
  const id = String(raw || '').trim()
  return id || null
}

export function setActiveAccountId(id: string | null): void {
  dbSetPref(ACTIVE_KEY, id || '')
}

export function upsertAccount(profile: UserProfile, cookies: StoredCookie[]): AccountRow {
  const id = accountIdFromProfile(profile)
  const now = Date.now()
  const existing = getAccount(id)
  const nextCookies = cookies.length ? cookies : existing?.cookies || []
  const row: AccountRow = {
    id,
    username: profile.username.trim(),
    avatarUrl: profile.avatarUrl,
    profileUrl: profile.profileUrl,
    cookies: nextCookies,
    syncedAt: profile.syncedAt || now,
    lastUsedAt: now
  }

  dbRun(
    `INSERT INTO accounts(id, username, avatar_url, profile_url, cookies_json, synced_at, last_used_at)
     VALUES(?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       avatar_url = excluded.avatar_url,
       profile_url = excluded.profile_url,
       cookies_json = excluded.cookies_json,
       synced_at = excluded.synced_at,
       last_used_at = excluded.last_used_at`,
    [
      row.id,
      row.username,
      row.avatarUrl,
      row.profileUrl || null,
      JSON.stringify(row.cookies),
      row.syncedAt,
      row.lastUsedAt
    ]
  )
  setActiveAccountId(row.id)
  return row
}

export function touchAccount(id: string): void {
  dbRun(`UPDATE accounts SET last_used_at = ? WHERE id = ?`, [Date.now(), id])
  setActiveAccountId(id)
}

export function removeAccount(id: string): void {
  dbRun(`DELETE FROM accounts WHERE id = ?`, [id])
  if (getActiveAccountId() === id) setActiveAccountId(null)
}

/** After successful login: snapshot cookies + profile into accounts table. */
export async function persistCurrentSession(profile: UserProfile): Promise<SavedAccount> {
  const cookies = await exportPartitionCookies()
  const row = upsertAccount(profile, cookies)
  return toSaved(row)
}

/** Migrate legacy single authProfile pref into accounts if needed. */
export async function migrateLegacyProfile(profile: UserProfile | null): Promise<void> {
  try {
    await ensureClientDb()
  } catch {
    return
  }
  if (!profile?.username) return
  if (listAccounts().length > 0) return

  let cookies: StoredCookie[] = []
  try {
    cookies = await exportPartitionCookies()
  } catch {
    cookies = []
  }
  upsertAccount(profile, cookies)
}

export function accountToUserProfile(row: AccountRow): UserProfile {
  return {
    username: row.username,
    avatarUrl: row.avatarUrl,
    profileUrl: row.profileUrl,
    syncedAt: row.syncedAt
  }
}
