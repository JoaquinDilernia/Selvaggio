import { useState } from 'react'
import './Login.css'

export default function Login({ onLogin, notice, onLogout }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Si había otra sesión (usuario sin acceso a esta pantalla), se reemplaza.
      if (onLogout) await onLogout()
      await onLogin(email, password)
    } catch (err) {
      setError(err.message || 'No se pudo ingresar')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="login__logo" />
        <h1 className="login__title">Ingresar</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          {notice && <div className="login__error">{notice}</div>}
          {error && <div className="login__error">{error}</div>}
          <input
            className="login__input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
          <input
            className="login__input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button className="login__btn" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="login__hint">Mismo usuario que el panel de Selvaggio.</p>
      </div>
    </div>
  )
}
