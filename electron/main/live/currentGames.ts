import { session } from 'electron'
import { GAME_ORIGIN } from '@shared/config'
import type { LivePlayer, LiveStats } from '@shared/ipc'

const ENDPOINT = `${GAME_ORIGIN}/current-games/get-current-games`

interface CurrentGamePlayer {
  id?: number
  username?: string
  avatar_url?: string
  mmr?: number
  subscription?: string
  primeMember?: boolean
  quit?: boolean
}

interface CurrentGame {
  gameId: number
  gameIsStarted?: boolean
  playersNumber?: number
  viewersNumber?: number
  maxPlayersNumber?: number
  lobbyInMediaRoom?: boolean
  players?: CurrentGamePlayer[]
}

interface CurrentGamesResponse {
  result?: CurrentGame[]
}

function avatarUrl(fileName: string | undefined): string {
  const raw = String(fileName || '').trim()
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  if (raw) {
    return `${GAME_ORIGIN}/image/user-avatar?file_name=${encodeURIComponent(raw)}&size=100x`
  }
  return `${GAME_ORIGIN}/image/user-avatar?size=100x`
}

function normalizePlayer(raw: CurrentGamePlayer): LivePlayer | null {
  const id = Number(raw.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const username = String(raw.username || '').trim() || `Игрок ${id}`
  const mmrRaw = Number(raw.mmr)
  return {
    id,
    username,
    avatarUrl: avatarUrl(raw.avatar_url),
    mmr: Number.isFinite(mmrRaw) ? mmrRaw : null,
    subscription: String(raw.subscription || '').trim(),
    primeMember: Boolean(raw.primeMember),
    quit: Boolean(raw.quit),
    profileUrl: `${GAME_ORIGIN}/profile/${id}`
  }
}

function collectOnlinePlayers(games: CurrentGame[]): LivePlayer[] {
  const byId = new Map<number, LivePlayer>()

  for (const lobby of games) {
    const rows = Array.isArray(lobby.players) ? lobby.players : []
    for (const row of rows) {
      const player = normalizePlayer(row)
      if (!player) continue
      const prev = byId.get(player.id)
      // Prefer the seated copy over a quit ghost when the same id appears twice.
      if (!prev || (prev.quit && !player.quit)) byId.set(player.id, player)
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.quit !== b.quit) return a.quit ? 1 : -1
    return a.username.localeCompare(b.username, 'ru')
  })
}

export function emptyLiveStats(): LiveStats {
  return {
    lobbies: 0,
    players: 0,
    viewers: 0,
    playing: 0,
    recruiting: 0,
    streams: 0,
    onlinePlayers: [],
    updatedAt: 0
  }
}

export function aggregateLiveStats(games: CurrentGame[]): LiveStats {
  let players = 0
  let viewers = 0
  let playing = 0
  let recruiting = 0
  let streams = 0

  for (const g of games) {
    players += g.playersNumber ?? 0
    viewers += g.viewersNumber ?? 0
    if (g.lobbyInMediaRoom) streams += 1
    if (g.gameIsStarted) playing += 1
    else recruiting += 1
  }

  return {
    lobbies: games.length,
    players,
    viewers,
    playing,
    recruiting,
    streams,
    onlinePlayers: collectOnlinePlayers(games),
    updatedAt: Date.now()
  }
}

/** Public endpoint — use game partition session for cookies if site ever gates it. */
export async function fetchLiveStats(): Promise<LiveStats> {
  const ses = session.fromPartition('persist:polemica-game')
  const res = await ses.fetch(ENDPOINT, {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })

  if (!res.ok) {
    throw new Error(`live stats HTTP ${res.status}`)
  }

  const data = (await res.json()) as CurrentGamesResponse
  return aggregateLiveStats(data.result ?? [])
}
