import type { UserProfile } from '@shared/ipc'
import { APP_VERSION } from '@shared/config'
import polemicaLogo from '../../assets/polemica-logo.svg'
import './Splash.css'

interface SplashProps {
  busy: boolean
  error: string | null
  cachedProfile: UserProfile | null
  onLoginChrome: () => void
  onResume: () => void
}

export function Splash({
  busy,
  error,
  cachedProfile,
  onLoginChrome,
  onResume
}: SplashProps) {
  return (
    <div className="splash">
      <div className="splash__glow" aria-hidden />
      <div className="splash__glow splash__glow--soft" aria-hidden />

      <div className="splash__stage">
        <div className="splash__identity">
          <img
            className="splash__logo"
            src={polemicaLogo}
            alt=""
            width={56}
            height={56}
          />
          <div className="splash__titles">
            <p className="splash__brand">Polemica</p>
            <p className="splash__product">Unofficial Client</p>
            <p className="splash__version">Version {APP_VERSION}</p>
          </div>
        </div>

        <p className="splash__lead">
          Войди через Chrome один раз — ник и аватар сохраним локально.
        </p>

        <div className="splash__actions">
          {cachedProfile ? (
            <button
              type="button"
              className="splash__cta"
              disabled={busy}
              onClick={onResume}
            >
              {busy ? 'Проверка…' : `Продолжить как ${cachedProfile.username}`}
            </button>
          ) : null}

          <button
            type="button"
            className={cachedProfile ? 'splash__cta splash__cta--ghost' : 'splash__cta'}
            disabled={busy}
            onClick={onLoginChrome}
          >
            {busy ? 'Синхронизация…' : 'Войти через Chrome'}
          </button>
        </div>

        {error ? <p className="splash__error">{error}</p> : null}

        <p className="splash__hint">Нужна сессия на polemicagame.com в Google Chrome</p>
      </div>
    </div>
  )
}
