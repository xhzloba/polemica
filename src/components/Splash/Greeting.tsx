import { APP_VERSION } from '@shared/config'
import './Splash.css'

interface GreetingProps {
  username: string
  avatarUrl: string
  onContinue: () => void
}

export function Greeting({ username, avatarUrl, onContinue }: GreetingProps) {
  return (
    <div className="splash splash--greeting">
      <div className="splash__glow" aria-hidden />
      <div className="splash__glow splash__glow--soft" aria-hidden />

      <div className="greet">
        <img className="greet__avatar" src={avatarUrl} alt="" />

        <p className="greet__eyebrow">Polemica</p>

        <h1 className="greet__hello">
          Привет, <span className="greet__name">{username}</span>
        </h1>

        <p className="greet__lead">Профиль подтянут. Можно начинать.</p>

        <button type="button" className="greet__cta" onClick={onContinue}>
          Продолжить
        </button>

        <p className="greet__version">Version {APP_VERSION}</p>
      </div>
    </div>
  )
}
