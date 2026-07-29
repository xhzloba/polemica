import { Alert, Avatar, Button, List, Space, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
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
          <img className="splash__logo" src={polemicaLogo} alt="" width={56} height={56} />
          <div className="splash__titles">
            <Typography.Title level={2} className="splash__brand">
              Polemica
            </Typography.Title>
            <Typography.Text className="splash__product">Unofficial Client</Typography.Text>
            <Typography.Text type="secondary" className="splash__version">
              Version {APP_VERSION}
            </Typography.Text>
          </div>
        </div>

        <Typography.Paragraph type="secondary" className="splash__lead">
          {accounts.length
            ? 'Выбери сохранённый аккаунт или добавь новый через Chrome.'
            : 'Войди через Chrome — профиль и токен сохраним локально.'}
        </Typography.Paragraph>

        {accounts.length > 0 ? (
          <List
            className="splash__accounts"
            itemLayout="horizontal"
            dataSource={accounts}
            renderItem={(acc) => (
              <List.Item
                className="splash__account"
                actions={[
                  <Button
                    key="remove"
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    disabled={busy}
                    aria-label={`Удалить ${acc.username}`}
                    onClick={() => onRemoveAccount(acc.id)}
                  />
                ]}
              >
                <Button
                  type="text"
                  className="splash__account-main"
                  disabled={busy || !acc.hasToken}
                  block
                  onClick={() => onResume(acc.id)}
                >
                  <Space size={12} align="center">
                    <Avatar src={acc.avatarUrl} size={36} />
                    <span className="splash__account-meta">
                      <Typography.Text strong className="splash__account-name">
                        {acc.username}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="splash__account-hint">
                        {busy
                          ? 'Вход…'
                          : acc.hasToken
                            ? 'Нажми, чтобы продолжить'
                            : 'Нужен повторный вход через Chrome'}
                      </Typography.Text>
                    </span>
                  </Space>
                </Button>
              </List.Item>
            )}
          />
        ) : null}

        <Space direction="vertical" size={12} className="splash__actions">
          <Button
            type={accounts.length ? 'default' : 'primary'}
            size="large"
            block
            loading={busy}
            onClick={onLoginChrome}
          >
            {accounts.length ? 'Добавить через Chrome' : 'Войти через Chrome'}
          </Button>
        </Space>

        {error ? (
          <Alert className="splash__error" type="error" showIcon message={error} />
        ) : null}

        <Typography.Text type="secondary" className="splash__hint">
          Новый аккаунт: залогинься на polemicagame.com в Chrome, потом «Добавить через Chrome»
        </Typography.Text>
      </div>
    </div>
  )
}
