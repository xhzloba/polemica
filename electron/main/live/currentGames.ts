import { session } from 'electron'
import { GAME_ORIGIN } from '@shared/config'
import type { LiveStats } from '@shared/ipc'

const ENDPOINT = `${GAME_ORIGIN}/current-games/get-current-games`

interface CurrentGame {
  gameId: number
  gameIsStarted?: boolean
  playersNumber?: number
  viewersNumber?: number
  maxPlayersNumber?: number
  lobbyInMediaRoom?: boolean
}

interface CurrentGamesResponse {
  result?: CurrentGame[]
}

export function emptyLiveStats(): LiveStats {
  return {
    lobbies: 0,
    players: 0,
    viewers: 0,
    playing: 0,
    recruiting: 0,
    streams: 0,
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
