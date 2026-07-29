import type { SavedAccount } from '@shared/ipc'
import { APP_VERSION } from '@shared/config'
import polemicaLogo from '../../assets/polemica-logo.svg'
import './Splash.css'

interface SplashProps {
  busy: boolean
  error: string | null
  accounts: SavedAccount[]
  onLoginChrome: () => void
  onResume: (accountId: string) => void
  onRemoveAccount: (accountId: string) => void
}

export function Splash({
  busy,
  error,
  accounts,
  onLoginChrome,
  onResume,
  onRemoveAccount
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
          {accounts.length
            ? 'Выбери сохранённый аккаунт или добавь новый через Chrome.'
            : 'Войди через Chrome — профиль и токен сохраним локально.'}
        </p>

        {accounts.length > 0 ? (
          <div className="splash__accounts" role="list" aria-label="Сохранённые аккаунты">
            {accounts.map((acc) => (
              <div key={acc.id} className="splash__account" role="listitem">
                <button
                  type="button"
                  className="splash__account-main"
                  disabled={busy || !acc.hasToken}
                  title={
                    acc.hasToken
                      ? `Войти как ${acc.username}`
                      : 'Нет сохранённого токена — добавь через Chrome'
                  }
                  onClick={() => onResume(acc.id)}
                >
                  <img
                    className="splash__account-avatar"
                    src={acc.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                  />
                  <span className="splash__account-meta">
                    <span className="splash__account-name">{acc.username}</span>
                    <span className="splash__account-hint">
                      {busy
                        ? 'Вход…'
                        : acc.hasToken
                          ? 'Нажми, чтобы продолжить'
                          : 'Нужен повторный вход через Chrome'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="splash__account-remove"
                  disabled={busy}
                  aria-label={`Удалить ${acc.username}`}
                  title="Удалить аккаунт"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveAccount(acc.id)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="splash__actions">
          <button
            type="button"
            className={accounts.length ? 'splash__cta splash__cta--ghost' : 'splash__cta'}
            disabled={busy}
            onClick={onLoginChrome}
          >
            {busy ? 'Синхронизация…' : accounts.length ? 'Добавить через Chrome' : 'Войти через Chrome'}
          </button>
        </div>

        {error ? <p className="splash__error">{error}</p> : null}

        <p className="splash__hint">
          Новый аккаунт: залогинься на polemicagame.com в Chrome, потом «Добавить через Chrome»
        </p>
      </div>
    </div>
  )
}
