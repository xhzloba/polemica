import type { BrowserWindow } from 'electron'
import { IpcChannels, type LiveStats } from '@shared/ipc'
import { emptyLiveStats, fetchLiveStats } from './currentGames'

const POLL_MS = 15_000

let hostWindow: BrowserWindow | null = null
let timer: ReturnType<typeof setInterval> | null = null
let last: LiveStats = emptyLiveStats()
let running = false

function emit(): void {
  if (!hostWindow || hostWindow.isDestroyed()) return
  hostWindow.webContents.send(IpcChannels.LIVE_STATS, last)
}

async function tick(): Promise<void> {
  try {
    last = await fetchLiveStats()
    emit()
  } catch (err) {
    console.warn('[live] fetch failed', err)
  }
}

export function getLiveStats(): LiveStats {
  return last
}

export function bindLiveStatsWindow(win: BrowserWindow): void {
  hostWindow = win
}

export function unbindLiveStatsWindow(win: BrowserWindow): void {
  if (hostWindow === win) hostWindow = null
}

export function startLiveStatsPolling(): void {
  if (running) {
    void tick()
    return
  }
  running = true
  void tick()
  timer = setInterval(() => {
    void tick()
  }, POLL_MS)
}

export function stopLiveStatsPolling(): void {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  last = emptyLiveStats()
  emit()
}
