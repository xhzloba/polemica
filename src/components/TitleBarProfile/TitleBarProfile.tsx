import { useCallback, useRef } from 'react'
import { Avatar, Button, Space, Typography } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { UserProfile } from '@shared/ipc'
import { GAME_ORIGIN } from '@shared/config'
import './TitleBarProfile.css'

interface Props {
  profile: UserProfile
  onLogout: () => void
}

export function TitleBarProfile({ profile, onLogout }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  const openMenu = useCallback(async () => {
    const rect = btnRef.current?.getBoundingClientRect()
    const point = rect
      ? { x: Math.round(rect.left), y: Math.round(rect.bottom + 6) }
      : undefined

    const choice = await window.polemica.openProfileMenu(point)
    if (choice === 'profile') {
      void window.polemica.goto(profile.profileUrl || `${GAME_ORIGIN}/`)
    } else if (choice === 'settings') {
      void window.polemica.goto(`${GAME_ORIGIN}/cabinet`)
    } else if (choice === 'logout') {
      onLogout()
    }
  }, [profile.profileUrl, onLogout])

  return (
    <div className="tb-profile">
      <Button
        ref={btnRef}
        type="text"
        className="tb-profile__btn"
        aria-haspopup="menu"
        onClick={() => void openMenu()}
      >
        <Space size={8}>
          <Avatar src={profile.avatarUrl} size={28} />
          <Typography.Text className="tb-profile__name">{profile.username}</Typography.Text>
          <DownOutlined className="tb-profile__chevron" />
        </Space>
      </Button>
    </div>
  )
}
