import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Typography } from 'antd'
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
        <Badge status="default" />
        <Typography.Text type="secondary">офлайн</Typography.Text>
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
      <Button
        ref={triggerRef}
        type="text"
        className="live-online__people"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
      >
        <Badge status="success" />
        <span className={playersClass}>{players}</span>
        <Typography.Text type="secondary" className="live-online__label">
          онлайн
        </Typography.Text>
      </Button>
      <span className="live-online__sep" aria-hidden />
      <Typography.Text className={lobbiesClass}>{lobbies} лобби</Typography.Text>
    </div>
  )
}
