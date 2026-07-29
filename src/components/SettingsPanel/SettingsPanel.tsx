import { useEffect, useState } from 'react'
import { Button, List, Switch, Typography } from 'antd'
import { LeftOutlined, ThunderboltOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { ClientPrefs } from '@shared/ipc'
import {
  getCachedPrefs,
  loadClientPrefs,
  setCachedPrefs
} from '../../lib/clientPrefsCache'
import './SettingsPanel.css'

interface Props {
  open: boolean
  onBack: () => void
  onClose: () => void
}

export function SettingsPanel({ open, onBack, onClose }: Props) {
  const [prefs, setPrefs] = useState<ClientPrefs | null>(() => getCachedPrefs())
  const [busyKey, setBusyKey] = useState<keyof ClientPrefs | null>(null)

  useEffect(() => {
    if (!open) return
    const api = window.polemica
    void loadClientPrefs().then(setPrefs)
    return api?.onPrefs?.((next) => {
      setCachedPrefs(next)
      setPrefs(next)
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const toggle = (key: keyof ClientPrefs): void => {
    if (!prefs || busyKey || !window.polemica?.setPrefs) return
    setBusyKey(key)
    const next = !prefs[key]
    const optimistic = { ...prefs, [key]: next }
    setPrefs(optimistic)
    setCachedPrefs(optimistic)
    void window.polemica
      .setPrefs({ [key]: next })
      .then((saved) => {
        setCachedPrefs(saved)
        setPrefs(saved)
      })
      .catch(() => {
        const reverted = { ...prefs, [key]: !next }
        setPrefs(reverted)
        setCachedPrefs(reverted)
      })
      .finally(() => setBusyKey(null))
  }

  return (
    <aside className="settings-panel" aria-label="Настройки">
      <div className="settings-panel__traffic-spacer" aria-hidden />

      <div className="settings-panel__head">
        <Button
          type="text"
          className="settings-panel__back"
          icon={<LeftOutlined />}
          aria-label="Назад в меню"
          onClick={onBack}
        />
        <Typography.Title level={4} className="settings-panel__title">
          Настройки
        </Typography.Title>
      </div>

      {prefs ? (
        <List
          className="settings-panel__list"
          itemLayout="horizontal"
          dataSource={[
            {
              key: 'autoAccept' as const,
              icon: <ThunderboltOutlined />,
              label: 'Автопринятие матча',
              hint: 'По умолчанию выкл. Когда вкл — сразу Accept в кнопке «Играть»'
            },
            {
              key: 'cameraOffOnLobbyEnter' as const,
              icon: <VideoCameraOutlined />,
              label: 'Камера выкл в лобби',
              hint: 'В лобби камера сразу выкл; тумблер сразу жмёт кнопку камеры'
            }
          ]}
          renderItem={(item) => (
            <List.Item
              className="settings-panel__row"
              actions={[
                <Switch
                  key="sw"
                  checked={Boolean(prefs[item.key])}
                  loading={busyKey === item.key}
                  disabled={busyKey !== null && busyKey !== item.key}
                  onChange={() => toggle(item.key)}
                />
              ]}
            >
              <List.Item.Meta
                avatar={<span className="settings-panel__row-icon">{item.icon}</span>}
                title={item.label}
                description={item.hint}
              />
            </List.Item>
          )}
        />
      ) : (
        <div className="settings-panel__list settings-panel__list--loading" aria-hidden>
          <div className="settings-panel__row settings-panel__row--skeleton" />
          <div className="settings-panel__row settings-panel__row--skeleton" />
        </div>
      )}
    </aside>
  )
}
