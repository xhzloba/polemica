import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Empty, Input, List, Typography } from 'antd'
import { LeftOutlined, TeamOutlined } from '@ant-design/icons'
import type { LivePlayer, LiveStats } from '@shared/ipc'
import { MMR_TIERS, type MmrTier } from '@shared/mmrTiers'
import { PRIME_ICON, SUBSCRIPTION_ICON } from '@shared/siteMarks'
import './OnlinePanel.css'

interface Props {
  open: boolean
  stats: LiveStats
  onBack: () => void
  onClose: () => void
}

function tierFor(mmr: number | null): MmrTier | null {
  if (mmr == null || !Number.isFinite(mmr)) return null
  let hit: MmrTier | null = null
  for (const t of MMR_TIERS) {
    if (mmr >= t.min) hit = t
  }
  return hit
}

function sortPlayers(list: LivePlayer[]): LivePlayer[] {
  return [...list].sort((a, b) => {
    if (a.quit !== b.quit) return a.quit ? 1 : -1
    const am = a.mmr == null ? -Infinity : Number(a.mmr)
    const bm = b.mmr == null ? -Infinity : Number(b.mmr)
    if (bm !== am) return bm - am
    return a.username.localeCompare(b.username, 'ru')
  })
}

export function OnlinePanel({ open, stats, onBack, onClose }: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    void window.polemica?.refreshLiveStats?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const players = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = sortPlayers(stats.onlinePlayers ?? [])
    if (!q) return base
    return base.filter((p) => p.username.toLowerCase().includes(q))
  }, [stats.onlinePlayers, query])

  if (!open) return null

  const count = stats.onlinePlayers?.length ?? 0
  const subtitle = stats.updatedAt
    ? `${count} в лобби · ${stats.lobbies} комнат`
    : 'Загрузка…'

  return (
    <aside className="online-panel" aria-label="Онлайн">
      <div className="online-panel__traffic-spacer" aria-hidden />

      <div className="online-panel__head">
        <Button
          type="text"
          className="online-panel__back"
          icon={<LeftOutlined />}
          aria-label="Назад в меню"
          onClick={onBack}
        />
        <div className="online-panel__titles">
          <Typography.Title level={4} className="online-panel__title">
            Онлайн
          </Typography.Title>
          <Typography.Text type="secondary" className="online-panel__sub">
            {subtitle}
          </Typography.Text>
        </div>
      </div>

      <Input.Search
        className="online-panel__search"
        allowClear
        value={query}
        placeholder="Найти игрока…"
        onChange={(e) => setQuery(e.target.value)}
      />

      {players.length === 0 ? (
        <div className="online-panel__empty">
          <Empty
            image={<TeamOutlined style={{ fontSize: 28, opacity: 0.35 }} />}
            description={
              query.trim()
                ? 'Никого не найдено'
                : stats.updatedAt
                  ? 'Сейчас никого в лобби'
                  : 'Ждём данные…'
            }
          />
        </div>
      ) : (
        <List
          className="online-panel__list"
          dataSource={players}
          split={false}
          renderItem={(p) => {
            const tier = tierFor(p.mmr)
            return (
              <List.Item
                className={`online-panel__row${p.quit ? ' online-panel__row--quit' : ''}`}
                onClick={() => {
                  if (p.profileUrl) void window.polemica?.goto(p.profileUrl)
                }}
              >
                <Avatar
                  className="online-panel__avatar"
                  size={28}
                  src={p.avatarUrl || undefined}
                >
                  {(p.username || '?').slice(0, 1).toUpperCase()}
                </Avatar>
                <span className="online-panel__meta">
                  <span className="online-panel__name-row">
                    <span className="online-panel__name">{p.username}</span>
                    {p.subscription && !p.primeMember ? (
                      <img
                        className="online-panel__mark"
                        src={SUBSCRIPTION_ICON}
                        alt=""
                        title={p.subscription}
                        draggable={false}
                      />
                    ) : null}
                    {p.primeMember ? (
                      <img
                        className="online-panel__mark online-panel__mark--prime"
                        src={PRIME_ICON}
                        alt=""
                        title="Prime"
                        draggable={false}
                      />
                    ) : null}
                  </span>
                </span>
                {tier && p.mmr != null ? (
                  <span className="online-panel__mmr">
                    <img
                      className="online-panel__mmr-icon"
                      src={tier.image}
                      alt=""
                      draggable={false}
                    />
                    <span className={`online-panel__mmr-text online-panel__mmr-text--${tier.type}`}>
                      {Math.round(Number(p.mmr))}
                    </span>
                  </span>
                ) : null}
              </List.Item>
            )
          }}
        />
      )}
    </aside>
  )
}
