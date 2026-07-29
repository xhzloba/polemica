import { MinusOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import './WindowControls.css'

export function WindowControls() {
  // macOS uses native traffic lights (hiddenInset). Custom buttons for win/linux.
  if (isMac()) return <div className="win-controls win-controls--mac" />

  const api = window.polemica

  return (
    <div className="win-controls">
      <Button
        type="text"
        className="win-controls__btn"
        title="Свернуть"
        icon={<MinusOutlined />}
        onClick={() => void api?.minimize()}
      />
      <Button
        type="text"
        className="win-controls__btn"
        title="Развернуть"
        icon={<BorderOutlined />}
        onClick={() => void api?.maximize()}
      />
      <Button
        type="text"
        className="win-controls__btn win-controls__btn--close"
        title="Закрыть"
        icon={<CloseOutlined />}
        onClick={() => void api?.close()}
      />
    </div>
  )
}

function isMac(): boolean {
  return navigator.platform.toUpperCase().includes('MAC')
}
