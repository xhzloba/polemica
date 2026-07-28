import { useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
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
      <button
        ref={btnRef}
        type="button"
        className="tb-profile__btn"
        aria-haspopup="menu"
        onClick={() => void openMenu()}
      >
        <img className="tb-profile__avatar" src={profile.avatarUrl} alt="" />
        <span className="tb-profile__name">{profile.username}</span>
        <ChevronDown size={14} strokeWidth={2.2} className="tb-profile__chevron" aria-hidden />
      </button>
    </div>
  )
}
