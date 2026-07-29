import { Avatar, Button, Typography } from 'antd'
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
        <Avatar src={avatarUrl} size={88} className="greet__avatar" />

        <Typography.Text type="secondary" className="greet__eyebrow">
          Polemica
        </Typography.Text>

        <Typography.Title level={2} className="greet__hello">
          Привет, <span className="greet__name">{username}</span>
        </Typography.Title>

        <Typography.Paragraph type="secondary" className="greet__lead">
          Можно начинать — профиль уже сохранён.
        </Typography.Paragraph>

        <Button type="primary" size="large" className="greet__cta" onClick={onContinue}>
          Продолжить
        </Button>

        <Typography.Text type="secondary" className="greet__version">
          Version {APP_VERSION}
        </Typography.Text>
      </div>
    </div>
  )
}
