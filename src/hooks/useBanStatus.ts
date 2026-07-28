import { useEffect, useState } from 'react'
import type { BanStatus } from '@shared/ipc'

const empty: BanStatus = {
  active: false,
  visible: false,
  title: '',
  until: '',
  reason: '',
  updatedAt: 0
}

export function useBanStatus(): BanStatus {
  const [status, setStatus] = useState<BanStatus>(empty)

  useEffect(() => {
    const api = window.polemica
    if (!api) return

    void api.getBanStatus().then(setStatus)
    return api.onBanStatus(setStatus)
  }, [])

  return status
}
