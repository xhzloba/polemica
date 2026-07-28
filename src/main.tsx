import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')

const platform = /Mac/i.test(navigator.platform)
  ? 'mac'
  : /Win/i.test(navigator.platform)
    ? 'win'
    : 'linux'
document.body.classList.add(`platform-${platform}`)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
