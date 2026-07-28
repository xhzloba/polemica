import { useEffect, useState } from 'react'
import type { AuthState } from '@shared/ipc'

const idle: AuthState = {
  phase: 'splash',
  profile: null,
  error: null,
  busy: false
}

export function useAuthState(): AuthState & {
  loginWithChrome: () => Promise<void>
  resumeSession: () => Promise<void>
  enterApp: () => Promise<void>
  logout: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>(idle)

  useEffect(() => {
    const api = window.polemica
    if (!api) return

    void api.getAuthState().then(setState)
    return api.onAuthState(setState)
  }, [])

  return {
    ...state,
    loginWithChrome: async () => {
      setState(await window.polemica.loginWithChrome())
    },
    resumeSession: async () => {
      setState(await window.polemica.resumeSession())
    },
    enterApp: async () => {
      setState(await window.polemica.enterApp())
    },
    logout: async () => {
      setState(await window.polemica.logout())
    }
  }
}
