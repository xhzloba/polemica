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
          accounts={auth.accounts}
          onLoginChrome={() => void auth.loginWithChrome()}
          onResume={(id) => void auth.resumeSession(id)}
          onRemoveAccount={(id) => void auth.removeAccount(id)}
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
