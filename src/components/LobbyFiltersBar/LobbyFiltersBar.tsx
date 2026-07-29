import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const api = window.polemica
    if (!api?.getLobbyFilter) return
    void api.getLobbyFilter().then((id) => {
      if (LOBBY_FILTERS.some((f) => f.id === id)) setLobbyFilter(id as LobbyFilterId)
    })
  }, [])

  const applyLobbyFilter = (id: LobbyFilterId): void => {
    setLobbyFilter(id)
    void window.polemica?.setLobbyFilter?.(id).then((next) => {
      if (LOBBY_FILTERS.some((f) => f.id === next)) setLobbyFilter(next as LobbyFilterId)
    })
  }

  return (
    <div className="lobby-filters-bar" role="group" aria-label="Фильтр лобби">
      <div className="lobby-filters-bar__tabs" role="tablist" aria-label="Фильтры лобби">
        {LOBBY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className={`lobby-filters-bar__tab${lobbyFilter === f.id ? ' lobby-filters-bar__tab--on' : ''}`}
            aria-selected={lobbyFilter === f.id}
            onClick={() => applyLobbyFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
