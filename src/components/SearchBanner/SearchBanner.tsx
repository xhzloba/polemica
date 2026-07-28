import { LoaderCircle, X } from 'lucide-react'
import type { SearchStatus } from '@shared/ipc'
import './SearchBanner.css'

interface Props {
  search: SearchStatus
}

export function SearchBanner({ search }: Props) {
  if (!search.visible && !search.playVisible) return null

  const searching = search.visible
  const canPlay = search.modes.some((m) => m.selected && m.available)

  return (
    <div
      className="search-banner search-banner--play"
      role={searching ? 'status' : 'region'}
      aria-label="Поиск игры"
      aria-live={searching ? 'polite' : undefined}
      style={{ paddingLeft: Math.max(0, search.insetLeft || 24) }}
    >
      <div className="search-banner__card search-banner__card--play">
        {search.modes.length > 0 ? (
          <div className="search-banner__modes" role="group" aria-label="Режимы поиска">
            {search.modes.map((mode) => (
              <button
                key={mode.mode}
                type="button"
                className={[
                  'search-banner__mode',
                  mode.selected && 'search-banner__mode--on',
                  !mode.available && 'search-banner__mode--off'
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!mode.available}
                title={mode.description || mode.title}
                onClick={() => void window.polemica.toggleSearchMode(mode.mode)}
              >
                <span className="search-banner__mode-check" aria-hidden />
                <span className="search-banner__mode-name">{mode.title}</span>
                <span className="search-banner__mode-count">
                  {mode.count}/{mode.countTarget}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {searching ? (
          <div
            className={`search-banner__status${search.loading ? ' search-banner__status--loading' : ''}`}
          >
            {search.loading ? (
              <LoaderCircle
                size={20}
                strokeWidth={2.2}
                className="search-banner__spinner"
                aria-label="Загрузка"
              />
            ) : (
              <>
                {search.time ? <div className="search-banner__time">{search.time}</div> : null}
                <div className="search-banner__center">
                  <div className="search-banner__title">{search.title}</div>
                  {search.delay ? <div className="search-banner__delay">{search.delay}</div> : null}
                </div>
                {search.canCancel ? (
                  <button
                    type="button"
                    className="search-banner__close"
                    aria-label="Отменить поиск"
                    title="Отменить поиск"
                    onClick={() => void window.polemica.cancelGameSearch()}
                  >
                    <X size={14} strokeWidth={2.4} aria-hidden />
                  </button>
                ) : (
                  <span className="search-banner__close-spacer" aria-hidden />
                )}
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="search-banner__play"
            disabled={!canPlay}
            onClick={() => void window.polemica.startGameSearch()}
          >
            Играть
          </button>
        )}
      </div>
    </div>
  )
}
