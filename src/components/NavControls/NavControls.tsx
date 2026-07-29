import { RotateCw, Home } from 'lucide-react'
import './NavControls.css'

interface Props {
  isLoading: boolean
}

const iconProps = { size: 20, strokeWidth: 2 } as const

export function NavControls({ isLoading }: Props) {
  const api = window.polemica

  return (
    <nav className="nav" aria-label="Навигация">
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
