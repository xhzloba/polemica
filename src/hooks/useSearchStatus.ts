import { useEffect, useState } from 'react'
import type { SearchStatus } from '@shared/ipc'

const empty: SearchStatus = {
  phase: 'hidden',
  active: false,
  visible: false,
  playVisible: false,
  loading: false,
  title: '',
  time: '',
  delay: '',
  canCancel: false,
  acceptAccepted: false,
  acceptMode: '',
  noticeTitle: '',
  noticeText: '',
  modes: [],
  insetLeft: 24,
  updatedAt: 0
}

export function useSearchStatus(): SearchStatus {
  const [status, setStatus] = useState<SearchStatus>(empty)

  useEffect(() => {
    const api = window.polemica
    if (!api) return

    void api.getSearchStatus().then(setStatus)
    return api.onSearchStatus(setStatus)
  }, [])

  return status
}
