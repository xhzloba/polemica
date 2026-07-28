/** Connection security derived from the embedded page URL. */

export type ConnectionSecurity = 'secure' | 'insecure' | 'unknown'

export interface ConnectionInfo {
  security: ConnectionSecurity
  host: string
  label: string
}

export function getConnectionInfo(url: string): ConnectionInfo {
  try {
    const parsed = new URL(url)
    const host = parsed.host || parsed.hostname
    const security: ConnectionSecurity =
      parsed.protocol === 'https:' ? 'secure' : parsed.protocol === 'http:' ? 'insecure' : 'unknown'

    return {
      security,
      host,
      label: host || 'polemicagame.com'
    }
  } catch {
    return {
      security: 'unknown',
      host: '',
      label: 'polemicagame.com'
    }
  }
}
