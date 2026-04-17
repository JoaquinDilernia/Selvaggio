import { useState } from 'react'
import './Login.css'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!onLogin(password)) {
      setError('Contraseña incorrecta')
      setPassword('')
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <img src="/logotipo-sin-fondo-blanco.png" alt="Selvaggio" className="login__logo" />
        <h1 className="login__title">Admin</h1>
        <form className="login__form" onSubmit={handleSubmit}>
          {error && <div className="login__error">{error}</div>}
          <input
            className="login__input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <button className="login__btn" type="submit">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
