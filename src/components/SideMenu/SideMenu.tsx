import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Input, Menu, Spin } from 'antd'
import {
  BookOutlined,
  LeftOutlined,
  MenuOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { GAME_ORIGIN } from '@shared/config'
import type { LiveStats, SearchStatus } from '@shared/ipc'
import './SideMenu.css'

type MenuKey = 'play' | 'streams' | 'online' | 'rules' | 'settings'

interface Props {
  currentUrl: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
  onOpenOnline: () => void
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
    const parts = [search.acceptAccepted ? 'Матч принят' : 'Найден матч', search.time].filter(
      Boolean
    )
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
    <Button
      type="text"
      className={`side-menu__toggle${open ? ' side-menu__toggle--open' : ''}`}
      aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      aria-expanded={open}
      icon={open ? <LeftOutlined /> : <MenuOutlined />}
      onClick={onToggle}
    />
  )
}

export function SideMenuPanel({
  currentUrl,
  open,
  onOpenChange,
  onOpenSettings,
  onOpenOnline,
  live,
  search
}: Props) {
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

  const selectedKeys: MenuKey[] = []
  if (onGameSearch && lobbyTab === 'play') selectedKeys.push('play')
  if (onGameSearch && lobbyTab === 'watch') selectedKeys.push('streams')
  if (activePath === '/rules') selectedKeys.push('rules')

  const playMeta = playItemMeta(search)

  return (
    <aside className="side-menu__panel" aria-label="Меню">
      <div className="side-menu__traffic-spacer" aria-hidden />

      <Input.Search
        className="side-menu__search"
        allowClear
        value={query}
        placeholder="Найти игру..."
        onChange={(e) => syncSearch(e.target.value)}
        onFocus={() => {
          if (!currentUrl.includes('/game-search')) {
            void window.polemica.goto(`${GAME_ORIGIN}/game-search`)
          }
        }}
      />

      <Menu
        className="side-menu__nav"
        mode="inline"
        selectable
        selectedKeys={selectedKeys}
        onClick={({ key }) => {
          const k = key as MenuKey
          if (k === 'play') switchLobbyTab('play')
          else if (k === 'streams') switchLobbyTab('watch')
          else if (k === 'online') onOpenOnline()
          else if (k === 'settings') onOpenSettings()
          else if (k === 'rules') void window.polemica.goto(`${GAME_ORIGIN}/rules`)
        }}
        items={[
          {
            key: 'play',
            disabled: tabBusy,
            icon: tabBusy && lobbyTab === 'play' ? <Spin size="small" /> : <ThunderboltOutlined />,
            label: (
              <span className="side-menu__label-wrap">
                <span>Играть</span>
                {playMeta ? <span className="side-menu__meta">{playMeta}</span> : null}
              </span>
            )
          },
          {
            key: 'streams',
            disabled: tabBusy,
            icon:
              tabBusy && lobbyTab === 'watch' ? (
                <Spin size="small" />
              ) : (
                <Badge dot={live.streams > 0} color="#4096ff">
                  <PlayCircleOutlined />
                </Badge>
              ),
            label: 'Трансляции',
            title: live.streams > 0 ? `${live.streams} трансляц.` : undefined
          },
          {
            key: 'online',
            icon: <TeamOutlined />,
            label: 'Онлайн'
          },
          {
            key: 'rules',
            icon: <BookOutlined />,
            label: 'Правила'
          },
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Настройки'
          }
        ]}
      />
    </aside>
  )
}
