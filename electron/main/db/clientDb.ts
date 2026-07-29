import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { app } from 'electron'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'

const nodeRequire = createRequire(__filename)

let SQL: SqlJsStatic | null = null
let db: Database | null = null
let ready: Promise<void> | null = null

/** Directory for SQLite files — `db/` next to the installed app (or project root in dev). */
export function resolveDbDir(): string {
  if (!app.isPackaged) {
    return join(process.cwd(), 'db')
  }

  const exe = app.getPath('exe')
  if (process.platform === 'darwin') {
    // .../Polemica Client.app/Contents/MacOS/<bin> → sibling folder next to .app
    let cur = dirname(exe)
    while (cur !== dirname(cur)) {
      if (cur.endsWith('.app')) {
        return join(dirname(cur), 'db')
      }
      cur = dirname(cur)
    }
  }

  // Windows / Linux: next to the executable
  return join(dirname(exe), 'db')
}

export function clientDbPath(): string {
  return join(resolveDbDir(), 'client.sqlite')
}

async function loadSql(): Promise<SqlJsStatic> {
  if (SQL) return SQL
  const wasmPath = nodeRequire.resolve('sql.js/dist/sql-wasm.wasm')
  const distDir = dirname(wasmPath)
  SQL = await initSqlJs({
    locateFile: (file) => join(distDir, file)
  })
  return SQL
}

function persist(): void {
  if (!db) return
  const dir = resolveDbDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(clientDbPath(), Buffer.from(db.export()))
}

function ensureSchema(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS prefs (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `)
}

export function ensureClientDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = await loadSql()
      const path = clientDbPath()
      mkdirSync(resolveDbDir(), { recursive: true })
      if (existsSync(path)) {
        db = new sql.Database(readFileSync(path))
      } else {
        db = new sql.Database()
      }
      ensureSchema(db)
      persist()
    })().catch((err) => {
      ready = null
      db = null
      throw err
    })
  }
  return ready
}

export function dbGetPref(key: string): string | null {
  if (!db) return null
  const stmt = db.prepare('SELECT value FROM prefs WHERE key = ?')
  stmt.bind([key])
  let value: string | null = null
  if (stmt.step()) {
    const row = stmt.getAsObject() as { value?: string }
    value = row.value != null ? String(row.value) : null
  }
  stmt.free()
  return value
}

export function dbSetPref(key: string, value: string): void {
  if (!db) throw new Error('client db not ready')
  db.run('INSERT INTO prefs(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value
  ])
  persist()
}

export function dbGetAllPrefs(): Record<string, string> {
  if (!db) return {}
  const out: Record<string, string> = {}
  const stmt = db.prepare('SELECT key, value FROM prefs')
  while (stmt.step()) {
    const row = stmt.getAsObject() as { key?: string; value?: string }
    if (row.key != null) out[String(row.key)] = String(row.value ?? '')
  }
  stmt.free()
  return out
}
