import { ReloadOutlined, HomeOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import './NavControls.css'

interface Props {
  isLoading: boolean
}

export function NavControls({ isLoading }: Props) {
  const api = window.polemica

  return (
    <nav className="nav" aria-label="Навигация">
      <Button
        type="text"
        className="nav__btn"
        title={isLoading ? 'Остановить' : 'Обновить'}
        icon={<ReloadOutlined spin={isLoading} />}
        onClick={() => void (isLoading ? api?.stop() : api?.reload())}
      />
      <Button
        type="text"
        className="nav__btn"
        title="Поиск игр"
        icon={<HomeOutlined />}
        onClick={() => void api?.goHome()}
      />
    </nav>
  )
}
