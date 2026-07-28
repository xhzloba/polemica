import { useEffect, useState } from 'react'
import type { LiveStats } from '@shared/ipc'

const empty: LiveStats = {
  lobbies: 0,
  players: 0,
  viewers: 0,
  playing: 0,
  recruiting: 0,
  streams: 0,
  updatedAt: 0
}

export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>(empty)

  useEffect(() => {
    const api = window.polemica
    if (!api) return

    void api.getLiveStats().then(setStats)
    return api.onLiveStats(setStats)
  }, [])

  return stats
}
