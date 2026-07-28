import { Lock, LoaderCircle, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { getConnectionInfo, type ConnectionSecurity } from '../../lib/connectionSecurity'
import './UrlPill.css'

interface Props {
  url: string
  isLoading: boolean
}

export function UrlPill({ url, isLoading }: Props) {
  const connection = getConnectionInfo(url)

  return (
    <div className="url-pill" title={url}>
      <span className={`url-pill__security url-pill__security--${connection.security}`} aria-hidden>
        <SecurityIcon security={connection.security} />
      </span>
      <span className="url-pill__name">{connection.label}</span>
      {isLoading && (
        <LoaderCircle size={14} strokeWidth={2.2} className="url-pill__spinner" aria-label="Загрузка" />
      )}
    </div>
  )
}

function SecurityIcon({ security }: { security: ConnectionSecurity }) {
  const props = { size: 14, strokeWidth: 2.2, 'aria-hidden': true as const }

  switch (security) {
    case 'secure':
      return <Lock {...props} />
    case 'insecure':
      return <ShieldAlert {...props} />
    default:
      return <ShieldQuestion {...props} />
  }
}
