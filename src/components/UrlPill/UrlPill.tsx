import { LockOutlined, WarningOutlined, QuestionCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { Space, Spin, Typography } from 'antd'
import polemicaLogo from '../../assets/polemica-logo.svg'
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
      <Space size={8} align="center">
        <img className="url-pill__logo" src={polemicaLogo} alt="" draggable={false} />
        <span className={`url-pill__security url-pill__security--${connection.security}`} aria-hidden>
          <SecurityIcon security={connection.security} />
        </span>
        <Typography.Text className="url-pill__name">{connection.label}</Typography.Text>
        {isLoading ? <Spin indicator={<LoadingOutlined spin />} size="small" /> : null}
      </Space>
    </div>
  )
}

function SecurityIcon({ security }: { security: ConnectionSecurity }) {
  switch (security) {
    case 'secure':
      return <LockOutlined />
    case 'insecure':
      return <WarningOutlined />
    default:
      return <QuestionCircleOutlined />
  }
}
