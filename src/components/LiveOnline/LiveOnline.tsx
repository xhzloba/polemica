import { useEffect, useRef, useState } from 'react'
import type { LiveStats } from '@shared/ipc'
import './LiveOnline.css'

interface Props {
  stats: LiveStats
}

type Flash = 'up' | 'down' | null

function useAnimatedInt(value: number, durationMs = 780): number {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)
  const frameRef = useRef(0)

  useEffect(() => {
    const from = displayRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    cancelAnimationFrame(frameRef.current)

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs)
      // smooth ease-in-out
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      const next = Math.round(from + (to - from) * eased)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
      else displayRef.current = to
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, durationMs])

  return display
}

function useFlashDirection(value: number): Flash {
  const [flash, setFlash] = useState<Flash>(null)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    const dir: Flash = value > prev.current ? 'up' : 'down'
    prev.current = value
    setFlash(dir)
    const t = window.setTimeout(() => setFlash(null), 900)
    return () => window.clearTimeout(t)
  }, [value])

  return flash
}

export function LiveOnline({ stats }: Props) {
  const players = useAnimatedInt(stats.players)
  const lobbies = useAnimatedInt(stats.lobbies)
  const playersFlash = useFlashDirection(stats.players)
  const lobbiesFlash = useFlashDirection(stats.lobbies)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  if (!stats.updatedAt) {
    return (
      <div className="live-online live-online--empty" title="Онлайн в лобби">
        <span className="live-online__dot live-online__dot--off" aria-hidden />
        <span>офлайн</span>
      </div>
    )
  }

  const title = [
    `${stats.players} человек онлайн в лобби`,
    `${stats.lobbies} лобби`,
    `${stats.playing} идут`,
    `${stats.recruiting} набор`
  ].join(' · ')

  const playersClass = [
    'live-online__players',
    playersFlash === 'up' && 'live-online__players--up',
    playersFlash === 'down' && 'live-online__players--down'
  ]
    .filter(Boolean)
    .join(' ')

  const lobbiesClass = [
    'live-online__lobbies',
    lobbiesFlash === 'up' && 'live-online__lobbies--up',
    lobbiesFlash === 'down' && 'live-online__lobbies--down'
  ]
    .filter(Boolean)
    .join(' ')

  const openMenu = (): void => {
    if (!window.polemica) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setOpen(true)
    void window.polemica
      .openLivePlayersMenu({
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom
      })
      .finally(() => setOpen(false))
  }

  return (
    <div className={`live-online${open ? ' live-online--open' : ''}`} title={title}>
      <button
        ref={triggerRef}
        type="button"
        className="live-online__people"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
      >
        <span className="live-online__dot" aria-hidden>
          <span className="live-online__dot-core" />
          <span className="live-online__dot-ping" />
        </span>
        <span className={playersClass}>{players}</span>
        <span className="live-online__label">онлайн</span>
      </button>
      <span className="live-online__sep" aria-hidden />
      <span className={lobbiesClass}>{lobbies} лобби</span>
    </div>
  )
}
