import { createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { session, type Cookie } from 'electron'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { GAME_ORIGIN } from '@shared/config'

const nodeRequire = createRequire(__filename)
const COOKIE_DOMAIN = 'polemicagame.com'
const PARTITION = 'persist:polemica-game'

let sqlPromise: Promise<SqlJsStatic> | null = null

function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    // exports only allow "." and "./dist/*" — resolve wasm directly
    const wasmPath = nodeRequire.resolve('sql.js/dist/sql-wasm.wasm')
    const distDir = dirname(wasmPath)
    sqlPromise = initSqlJs({
      locateFile: (file) => join(distDir, file)
    })
  }
  return sqlPromise
}

function chromeUserDataPath(): string {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library/Application Support/Google/Chrome')
  }
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data')
  }
  return join(homedir(), '.config/google-chrome')
}

function resolveChromeProfileDir(userData: string): string {
  const localStatePath = join(userData, 'Local State')
  if (existsSync(localStatePath)) {
    try {
      const localState = JSON.parse(readFileSync(localStatePath, 'utf8')) as {
        profile?: { last_used?: string }
      }
      const last = localState.profile?.last_used
      if (last && existsSync(join(userData, last, 'Cookies'))) {
        return join(userData, last)
      }
    } catch {
      /* fall through */
    }
  }
  return join(userData, 'Default')
}

function getChromeSafeStoragePassword(): string {
  if (process.platform !== 'darwin') {
    throw new Error('Импорт cookies из Chrome пока поддерживается только на macOS')
  }
  try {
    return execFileSync(
      'security',
      ['find-generic-password', '-w', '-s', 'Chrome Safe Storage', '-a', 'Chrome'],
      { encoding: 'utf8' }
    ).trim()
  } catch {
    throw new Error(
      'Не удалось прочитать ключ Chrome из Keychain. Разреши доступ к «Chrome Safe Storage».'
    )
  }
}

function decryptChromeValue(encrypted: Uint8Array, password: string, stripHashPrefix: boolean): string {
  if (!encrypted.length) return ''

  const buf = Buffer.from(encrypted)
  const prefix = buf.subarray(0, 3).toString('utf8')

  if (prefix !== 'v10' && prefix !== 'v11') {
    return buf.toString('utf8')
  }

  const key = pbkdf2Sync(password, 'saltysalt', 1003, 16, 'sha1')
  const iv = Buffer.alloc(16, ' ')
  const decipher = createDecipheriv('aes-128-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(buf.subarray(3)), decipher.final()])

  // Cookie DB v24+ prepends 32-byte SHA-256 of the host_key
  if (stripHashPrefix && decrypted.length > 32) {
    return decrypted.subarray(32).toString('utf8')
  }
  return decrypted.toString('utf8')
}

function chromeExpiryToUnix(expiresUtc: number | bigint): number | undefined {
  const n = typeof expiresUtc === 'bigint' ? expiresUtc : BigInt(Math.trunc(expiresUtc))
  if (n <= BigInt(0)) return undefined
  // Chrome stores µs since 1601-01-01
  const unix = Number((n - BigInt('11644473600000000')) / BigInt(1000000))
  if (!Number.isFinite(unix) || unix <= 0) return undefined
  return unix
}

function mapSameSite(value: number): Cookie['sameSite'] {
  // Chromium CookieSameSite: -1 unspecified, 0 none, 1 lax, 2 strict
  if (value === 0) return 'no_restriction'
  if (value === 1) return 'lax'
  if (value === 2) return 'strict'
  return 'unspecified'
}

function copyCookiesDb(src: string): string {
  const dir = join(tmpdir(), `polemica-chrome-cookies-${process.pid}`)
  mkdirSync(dir, { recursive: true })
  const dst = join(dir, 'Cookies')
  copyFileSync(src, dst)
  for (const suffix of ['-wal', '-shm', '-journal'] as const) {
    const side = `${src}${suffix}`
    if (existsSync(side)) copyFileSync(side, `${dst}${suffix}`)
  }
  return dst
}

export interface ChromeImportResult {
  imported: number
  profileDir: string
  hasAccessToken: boolean
}

/** Pull polemicagame.com cookies from local Google Chrome into Electron partition. */
export async function importPolemicaCookiesFromChrome(): Promise<ChromeImportResult> {
  const userData = chromeUserDataPath()
  if (!existsSync(userData)) {
    throw new Error('Google Chrome не найден. Установи Chrome и войди на polemicagame.com')
  }

  const profileDir = resolveChromeProfileDir(userData)
  const cookiesPath = join(profileDir, 'Cookies')
  if (!existsSync(cookiesPath)) {
    throw new Error(`Не найден файл Cookies: ${cookiesPath}`)
  }

  const copied = copyCookiesDb(cookiesPath)
  const password = getChromeSafeStoragePassword()
  const SQL = await loadSql()
  const db = new SQL.Database(readFileSync(copied))

  let stripHashPrefix = true
  try {
    const meta = db.exec(`SELECT value FROM meta WHERE key = 'version'`)
    const version = Number(meta[0]?.values?.[0]?.[0] ?? 24)
    stripHashPrefix = version >= 24
  } catch {
    stripHashPrefix = true
  }

  const query = `
    SELECT host_key, name, value, encrypted_value, path, expires_utc,
           is_secure, is_httponly, samesite
    FROM cookies
    WHERE host_key LIKE '%${COOKIE_DOMAIN}%'
  `
  const result = db.exec(query)
  db.close()

  try {
    rmSync(dirname(copied), { recursive: true, force: true })
  } catch {
    /* ignore */
  }

  if (!result.length) {
    throw new Error('В Chrome нет cookies для polemicagame.com. Открой сайт и войди в аккаунт.')
  }

  const rows = result[0].values
  const ses = session.fromPartition(PARTITION)

  const existing = await ses.cookies.get({})
  await Promise.all(
    existing
      .filter((c) => (c.domain || '').includes(COOKIE_DOMAIN))
      .map((c) => {
        const host = (c.domain || COOKIE_DOMAIN).replace(/^\./, '')
        return ses.cookies.remove(`https://${host}${c.path || '/'}`, c.name)
      })
  )

  let imported = 0
  let hasAccessToken = false

  for (const row of rows) {
    const hostKey = String(row[0] ?? '')
    const name = String(row[1] ?? '')
    const plain = String(row[2] ?? '')
    const encrypted = row[3] as Uint8Array
    const path = String(row[4] || '/')
    const expiresUtc = row[5] as number
    const isSecure = Boolean(row[6])
    const isHttpOnly = Boolean(row[7])
    const sameSite = mapSameSite(Number(row[8] ?? 0))

    let value = plain
    if (!value && encrypted?.length) {
      try {
        value = decryptChromeValue(encrypted, password, stripHashPrefix)
      } catch (err) {
        console.warn('[auth] decrypt failed for', name, err)
        continue
      }
    }
    if (!value) continue

    if (name === 'access-token') hasAccessToken = true

    const domain = hostKey.startsWith('.') ? hostKey : undefined
    const urlHost = hostKey.replace(/^\./, '') || COOKIE_DOMAIN
    const url = `${isSecure ? 'https' : 'http'}://${urlHost}${path.startsWith('/') ? path : `/${path}`}`

    try {
      await ses.cookies.set({
        url,
        name,
        value,
        path,
        domain,
        secure: isSecure,
        httpOnly: isHttpOnly,
        expirationDate: chromeExpiryToUnix(expiresUtc),
        sameSite
      })
      imported += 1
    } catch (err) {
      console.warn('[auth] cookie set failed', name, err)
    }
  }

  await ses.cookies.flushStore()

  if (!hasAccessToken) {
    throw new Error(
      'В Chrome нет access-token. Залогинься на polemicagame.com в Chrome и нажми ещё раз.'
    )
  }

  console.log(`[auth] imported ${imported} cookies from ${profileDir} → ${GAME_ORIGIN}`)
  return { imported, profileDir, hasAccessToken }
}
