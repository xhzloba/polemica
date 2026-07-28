import { ChromeBar } from './components/ChromeBar/ChromeBar'
import { Splash } from './components/Splash/Splash'
import { Greeting } from './components/Splash/Greeting'
import { useNavState } from './hooks/useNavState'
import { useAuthState } from './hooks/useAuthState'

export function App() {
  const nav = useNavState()
  const auth = useAuthState()

  if (auth.phase === 'splash') {
    return (
      <div className="app-shell app-shell--full">
        <Splash
          busy={auth.busy}
          error={auth.error}
          cachedProfile={auth.profile}
          onLoginChrome={() => void auth.loginWithChrome()}
          onResume={() => void auth.resumeSession()}
        />
      </div>
    )
  }

  if (auth.phase === 'greeting' && auth.profile) {
    return (
      <div className="app-shell app-shell--full">
        <Greeting
          username={auth.profile.username}
          avatarUrl={auth.profile.avatarUrl}
          onContinue={() => void auth.enterApp()}
        />
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--chrome">
      <ChromeBar
        nav={nav}
        profile={auth.profile}
        onLogout={() => void auth.logout()}
      />
    </div>
  )
}
