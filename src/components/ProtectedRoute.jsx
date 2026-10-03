import { useEffect, useState } from 'react'
import Login from '../pages/Login'

// Carga perezosa: firebase/auth solo se baja al entrar a una ruta interna.
const loadStaffAuth = () => import('../firebase/staffAuth')

/**
 * @param {string[]} roles roles que pueden ver esta pantalla (admin siempre puede)
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const [api, setApi] = useState(null)
  const [staff, setStaff] = useState(undefined) // undefined = cargando, null = sin sesión

  useEffect(() => {
    let unsub = () => {}
    loadStaffAuth().then((mod) => {
      setApi(mod)
      unsub = mod.onStaffChange(setStaff)
    })
    return () => unsub()
  }, [])

  if (staff === undefined || !api) return null

  if (!staff) return <Login onLogin={api.loginStaff} />

  const allowed = staff.role === 'admin' || roles.includes(staff.role)
  if (!allowed) {
    return (
      <Login
        onLogin={api.loginStaff}
        notice={`${staff.email} no tiene acceso a esta pantalla. Ingresá con otro usuario.`}
        onLogout={api.logoutStaff}
      />
    )
  }

  return (
    <>
      {children}
      <button className="staff-logout" onClick={api.logoutStaff} title={staff.email}>
        Cerrar sesión
      </button>
    </>
  )
}
