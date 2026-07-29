import { useEffect, useState } from 'react'
import { Button, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import './LobbyFiltersBar.css'

const LOBBY_FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'lobby', label: 'Обычные' },
  { id: 'league', label: 'Рейтинг' },
  { id: 'prime', label: 'Прайм+' },
  { id: 'live', label: 'Трансляции' }
] as const

type LobbyFilterId = (typeof LOBBY_FILTERS)[number]['id']

export function LobbyFiltersBar(): React.ReactElement {
  const [lobbyFilter, setLobbyFilter] = useState<LobbyFilterId>('all')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const api = window.polemica
    if (!api?.getLobbyFilter) return
    void api.getLobbyFilter().then((id) => {
      if (LOBBY_FILTERS.some((f) => f.id === id)) setLobbyFilter(id as LobbyFilterId)
    })
  }, [])

  const applyLobbyFilter = (id: string): void => {
    const next = (LOBBY_FILTERS.some((f) => f.id === id) ? id : 'all') as LobbyFilterId
    setLobbyFilter(next)
    void window.polemica?.setLobbyFilter?.(next).then((saved) => {
      if (LOBBY_FILTERS.some((f) => f.id === saved)) setLobbyFilter(saved as LobbyFilterId)
    })
  }

  const onCreateLobby = (): void => {
    if (!window.polemica?.createLobby || creating) return
    setCreating(true)
    void window.polemica.createLobby().finally(() => setCreating(false))
  }

  return (
    <div className="lobby-filters-bar" aria-label="Фильтры и создание лобби">
      <Tabs
        className="lobby-filters-bar__tabs"
        size="small"
        activeKey={lobbyFilter}
        onChange={applyLobbyFilter}
        items={LOBBY_FILTERS.map((f) => ({
          key: f.id,
          label: f.label
        }))}
      />

      <Button
        type="text"
        className="lobby-filters-bar__create"
        icon={<PlusOutlined />}
        loading={creating}
        onClick={onCreateLobby}
      >
        Создать лобби
      </Button>
    </div>
  )
}
