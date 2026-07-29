import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen, ChevronLeft, LoaderCircle, Menu, Plus, Radio, Search, Swords } from 'lucide-react'
import { GAME_ORIGIN } from '@shared/config'
import type { LiveStats, SearchStatus } from '@shared/ipc'
import './SideMenu.css'

type MenuItem = {
  label: string
  icon: typeof Swords
  path?: string
  action?: 'create-lobby' | 'play' | 'streams'
  accent?: boolean
  liveDot?: boolean
}

const ITEMS: MenuItem[] = [
  { label: 'Создать лобби', icon: Plus, action: 'create-lobby', accent: true },
  { label: 'Играть', path: '/game-search', icon: Swords, action: 'play' },
  { label: 'Трансляции', path: '/game-search', icon: Radio, action: 'streams', liveDot: true },
  { label: 'Правила', path: '/rules', icon: BookOpen }
]

interface Props {
  currentUrl: string
  open: boolean
  onOpenChange: (open: boolean) => void
  live: LiveStats
  search: SearchStatus
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, '') || '/'
  } catch {
    return ''
  }
}

function playItemMeta(search: SearchStatus): string {
  if (search.phase === 'searching') {
    const parts = [search.title || 'Идёт поиск', search.time].filter(Boolean)
    return parts.join(' · ')
  }
  if (search.phase === 'accept') {
    const parts = [search.acceptAccepted ? 'Матч принят' : 'Найден матч', search.time].filter(Boolean)
    return parts.join(' · ')
  }
  if (search.phase === 'launching') {
    const parts = [search.title || 'Запуск игры', search.time].filter(Boolean)
    return parts.join(' · ')
  }
  if (search.phase === 'inGame') {
    return 'Можно продолжить игру'
  }
  return ''
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
      {open ? (
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      ) : (
        <Menu size={20} strokeWidth={2.2} aria-hidden />
      )}
    </button>
  )
}

export function SideMenuPanel({ currentUrl, open, onOpenChange, live, search }: Props) {
  const [query, setQuery] = useState('')
  const [lobbyTab, setLobbyTab] = useState<'play' | 'watch'>('play')
  const [tabBusy, setTabBusy] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePath = pathFromUrl(currentUrl)
  const onGameSearch = activePath === '/game-search' || activePath === '/'

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

  const switchLobbyTab = (next: 'play' | 'watch'): void => {
    if (tabBusy) return
    if (onGameSearch && lobbyTab === next) return
    setLobbyTab(next)
    setTabBusy(true)
    void window.polemica.setLobbyTab(next).finally(() => setTabBusy(false))
  }

  if (!open) return null

  const onItem = (item: MenuItem): void => {
    if (item.action === 'create-lobby') {
      void window.polemica.createLobby()
      return
    }
    if (item.action === 'play') {
      switchLobbyTab('play')
      return
    }
    if (item.action === 'streams') {
      switchLobbyTab('watch')
      return
    }
    if (item.path) void window.polemica.goto(`${GAME_ORIGIN}${item.path}`)
  }

  const primary = ITEMS.filter((i) => i.accent)
  const rest = ITEMS.filter((i) => !i.accent)

  const renderItem = (item: MenuItem): ReactNode => {
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
    const meta = item.action === 'play' ? playItemMeta(search) : ''
    const itemBusy =
      tabBusy &&
      ((item.action === 'play' && lobbyTab === 'play') ||
        (item.action === 'streams' && lobbyTab === 'watch'))

    return (
      <button
        key={item.label}
        type="button"
        className={[
          'side-menu__item',
          active && 'side-menu__item--active',
          item.accent && 'side-menu__item--accent',
          itemBusy && 'side-menu__item--busy'
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => onItem(item)}
        disabled={tabBusy && (item.action === 'play' || item.action === 'streams')}
        title={
          item.action === 'streams' && live.streams > 0
            ? `${live.streams} трансляц.`
            : undefined
        }
      >
        <span className="side-menu__icon" aria-hidden>
          {itemBusy ? (
            <LoaderCircle size={22} strokeWidth={2.2} className="side-menu__spinner" />
          ) : (
            <>
              {showLive ? <span className="side-menu__live-dot" /> : null}
              <Icon size={22} strokeWidth={2} />
            </>
          )}
        </span>
        <span className="side-menu__text">
          <span className="side-menu__label">{item.label}</span>
          {meta ? <span className="side-menu__meta">{meta}</span> : null}
        </span>
      </button>
    )
  }

  return (
    <aside className="side-menu__panel" aria-label="Меню">
      <div className="side-menu__traffic-spacer" aria-hidden />

      <label className="side-menu__search">
        <Search size={15} strokeWidth={2.2} aria-hidden />
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
        {primary.length ? <div className="side-menu__group">{primary.map(renderItem)}</div> : null}
        <div className="side-menu__group">{rest.map(renderItem)}</div>
      </nav>
    </aside>
  )
}
