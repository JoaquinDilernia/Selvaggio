import { useState } from 'react'
import Login from '../pages/Login'

const SESSION_KEY = 'selvaggio_admin'

export default function ProtectedRoute({ children }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'ok')

  const handleLogin = (password) => {
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      setAuthed(true)
      return true
    }
    return false
  }

  if (!authed) return <Login onLogin={handleLogin} />

  return children
}
