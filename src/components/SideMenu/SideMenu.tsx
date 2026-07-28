import { useEffect, useRef, useState } from 'react'
import { BookOpen, Crown, Menu, Plus, Radio, Search, Swords, Trophy, X } from 'lucide-react'
import { GAME_ORIGIN } from '@shared/config'
import { useLiveStats } from '../../hooks/useLiveStats'
import './SideMenu.css'

type MenuItem = {
  label: string
  icon: typeof Swords
  path?: string
  action?: 'create-lobby' | 'play' | 'streams'
  pro?: boolean
  accent?: boolean
  liveDot?: boolean
}

const ITEMS: MenuItem[] = [
  { label: 'Создать лобби', icon: Plus, action: 'create-lobby', accent: true },
  { label: 'Играть', path: '/game-search', icon: Swords, action: 'play' },
  { label: 'Трансляции', path: '/game-search', icon: Radio, action: 'streams', liveDot: true },
  { label: 'Правила', path: '/rules', icon: BookOpen },
  { label: 'Лидеры', path: '/ratings', icon: Trophy },
  { label: 'Подписка', path: '/subscription', icon: Crown, pro: true }
]

interface Props {
  currentUrl: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, '') || '/'
  } catch {
    return ''
  }
}

export function SideMenuToggle({
  open,
  onToggle
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`side-menu__toggle${open ? ' side-menu__toggle--open' : ''}`}
      aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      aria-expanded={open}
      onClick={onToggle}
    >
      {open ? <X size={20} strokeWidth={2.2} aria-hidden /> : <Menu size={20} strokeWidth={2.2} aria-hidden />}
    </button>
  )
}

export function SideMenuPanel({ currentUrl, open, onOpenChange }: Props) {
  const live = useLiveStats()
  const [query, setQuery] = useState('')
  const [lobbyTab, setLobbyTab] = useState<'play' | 'watch'>('play')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePath = pathFromUrl(currentUrl)
  const onGameSearch =
    activePath === '/game-search' || activePath === '/' || activePath.startsWith('/game')

  useEffect(() => {
    if (!onGameSearch) setLobbyTab('play')
  }, [onGameSearch])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const syncSearch = (value: string): void => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void window.polemica.setLobbySearch(value)
    }, 160)
  }

  if (!open) return null

  const onItem = (item: MenuItem): void => {
    if (item.action === 'create-lobby') {
      void window.polemica.createLobby()
      return
    }
    if (item.action === 'play') {
      setLobbyTab('play')
      void window.polemica.setLobbyTab('play')
      return
    }
    if (item.action === 'streams') {
      setLobbyTab('watch')
      void window.polemica.setLobbyTab('watch')
      return
    }
    if (item.path) void window.polemica.goto(`${GAME_ORIGIN}${item.path}`)
  }

  return (
    <aside className="side-menu__panel" aria-label="Меню">
      <div className="side-menu__traffic-spacer" aria-hidden />

      <label className="side-menu__search">
        <Search size={14} strokeWidth={2.2} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Найти игру..."
          onChange={(e) => syncSearch(e.target.value)}
          onFocus={() => {
            if (!currentUrl.includes('/game-search')) {
              void window.polemica.goto(`${GAME_ORIGIN}/game-search`)
            }
          }}
        />
      </label>

      <nav className="side-menu__nav" aria-label="Разделы сайта">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const normalized = (item.path || '').replace(/\/$/, '')
          let active = false
          if (item.action === 'play') {
            active = onGameSearch && lobbyTab === 'play'
          } else if (item.action === 'streams') {
            active = onGameSearch && lobbyTab === 'watch'
          } else if (normalized) {
            active = activePath === normalized
          }

          const showLive = Boolean(item.liveDot && live.streams > 0)

          return (
            <button
              key={item.label}
              type="button"
              className={[
                'side-menu__item',
                active && 'side-menu__item--active',
                item.pro && 'side-menu__item--pro',
                item.accent && 'side-menu__item--accent'
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onItem(item)}
              title={
                item.action === 'streams' && live.streams > 0
                  ? `${live.streams} трансляц.`
                  : undefined
              }
            >
              <span className="side-menu__icon" aria-hidden>
                {showLive ? <span className="side-menu__live-dot" /> : null}
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="side-menu__label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
