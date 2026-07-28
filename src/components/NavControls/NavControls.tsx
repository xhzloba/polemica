import { ChevronLeft, ChevronRight, RotateCw, Home } from 'lucide-react'
import './NavControls.css'

interface Props {
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

const iconProps = { size: 20, strokeWidth: 2 } as const

export function NavControls({ canGoBack, canGoForward, isLoading }: Props) {
  const api = window.polemica

  return (
    <nav className="nav" aria-label="Навигация">
      <button
        type="button"
        className="nav__btn"
        disabled={!canGoBack}
        title="Назад"
        onClick={() => void api?.goBack()}
      >
        <ChevronLeft {...iconProps} aria-hidden />
      </button>
      <button
        type="button"
        className="nav__btn"
        disabled={!canGoForward}
        title="Вперёд"
        onClick={() => void api?.goForward()}
      >
        <ChevronRight {...iconProps} aria-hidden />
      </button>
      <button
        type="button"
        className="nav__btn"
        title={isLoading ? 'Остановить' : 'Обновить'}
        onClick={() => void (isLoading ? api?.stop() : api?.reload())}
      >
        <RotateCw
          {...iconProps}
          className={isLoading ? 'nav__spin' : undefined}
          aria-hidden
        />
      </button>
      <button type="button" className="nav__btn" title="Поиск игр" onClick={() => void api?.goHome()}>
        <Home {...iconProps} aria-hidden />
      </button>
    </nav>
  )
}
