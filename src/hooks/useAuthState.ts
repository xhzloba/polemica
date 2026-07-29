import { useEffect, useState } from 'react'
import type { AuthState } from '@shared/ipc'

const idle: AuthState = {
  phase: 'splash',
  profile: null,
  accounts: [],
  error: null,
  busy: false
}

export function useAuthState(): AuthState & {
  loginWithChrome: () => Promise<void>
  resumeSession: (accountId?: string) => Promise<void>
  enterApp: () => Promise<void>
  logout: () => Promise<void>
  removeAccount: (accountId: string) => Promise<void>
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
    resumeSession: async (accountId?: string) => {
      setState(await window.polemica.resumeSession(accountId))
    },
    enterApp: async () => {
      setState(await window.polemica.enterApp())
    },
    logout: async () => {
      setState(await window.polemica.logout())
    },
    removeAccount: async (accountId: string) => {
      setState(await window.polemica.removeAccount(accountId))
    }
  }
}
