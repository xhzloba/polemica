import { Alert } from 'antd'
import type { BanStatus } from '@shared/ipc'
import './BanBanner.css'

interface Props {
  ban: BanStatus
}

export function BanBanner({ ban }: Props) {
  if (!ban.visible) return null

  return (
    <div className="ban-banner" role="status">
      <Alert
        className="ban-banner__card"
        type="warning"
        showIcon
        message={ban.title}
        description={
          ban.until || ban.reason
            ? [ban.until, ban.reason].filter(Boolean).join(' · ')
            : undefined
        }
      />
    </div>
  )
}
