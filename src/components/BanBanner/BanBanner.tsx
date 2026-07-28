import { Info } from 'lucide-react'
import type { BanStatus } from '@shared/ipc'
import './BanBanner.css'

interface Props {
  ban: BanStatus
}

export function BanBanner({ ban }: Props) {
  if (!ban.visible) return null

  return (
    <div className="ban-banner" role="status">
      <div className="ban-banner__card">
        <div className="ban-banner__title-row">
          <span className="ban-banner__title">{ban.title}</span>
          {ban.reason ? (
            <span className="ban-banner__hint">
              <Info size={14} strokeWidth={2.2} aria-hidden />
              <span className="ban-banner__tooltip" role="tooltip">
                {ban.reason}
              </span>
            </span>
          ) : null}
        </div>
        {ban.until ? <div className="ban-banner__until">{ban.until}</div> : null}
      </div>
    </div>
  )
}
