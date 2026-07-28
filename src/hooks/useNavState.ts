import { useEffect, useState, useEffectEvent } from 'react'
import type { NavState } from '@shared/ipc'
import { GAME_START_URL } from '@shared/config'

const INITIAL: NavState = {
  url: GAME_START_URL,
  title: 'Polemica',
  canGoBack: false,
  canGoForward: false,
  isLoading: true,
  progress: 0
}

export function useNavState(): NavState {
  const [nav, setNav] = useState<NavState>(INITIAL)

  const onState = useEffectEvent((state: NavState) => {
    setNav(state)
  })

  useEffect(() => {
    const api = window.polemica
    if (!api) return

    void api.getNavState().then(onState)
    return api.onNavState(onState)
  }, [])

  return nav
}
