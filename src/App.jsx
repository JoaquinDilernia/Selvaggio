import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ToastProvider } from './components/Toast'
import LandingDemo from './LandingDemo/LandingDemo'
import './theme.css'
import './App.css'

const Landing = lazy(() => import('./Landing/Landing'))
const AdminNew = lazy(() => import('./Admin/AdminNew'))
const AdminContenidos = lazy(() => import('./Admin/AdminContenidos'))
const ImportarProductosExcel = lazy(() => import('./Admin/ImportarProductosExcel'))
const Caja = lazy(() => import('./Caja/Caja'))
const Cocina = lazy(() => import('./Cocina/Cocina'))
const CargarDatosPrueba = lazy(() => import('./CargarDatosPrueba'))
const LimpiarDuplicados = lazy(() => import('./LimpiarDuplicados'))
const OrganizadorFotos = lazy(() => import('./OrganizadorFotos'))
const ReservaCava = lazy(() => import('./Reservas/ReservaCava'))
const ReservaMesas = lazy(() => import('./Reservas/ReservaMesas'))
const Page404 = lazy(() => import('./pages/Page404'))
const Terminos = lazy(() => import('./pages/Terminos'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const Gracias = lazy(() => import('./pages/Gracias'))
const Formulario = lazy(() => import('./Formulario'))

function App() {
  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingDemo />} />
          <Route path="/landing-v1" element={<Landing />} />
          <Route path="/admin" element={<AdminNew />} />
          <Route path="/admin-contenidos" element={<AdminContenidos />} />
          <Route path="/importar-productos" element={<ImportarProductosExcel />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/cocina" element={<Cocina />} />
          <Route path="/cargar-datos" element={<CargarDatosPrueba />} />
          <Route path="/limpiar-duplicados" element={<LimpiarDuplicados />} />
          <Route path="/organizar-fotos" element={<OrganizadorFotos />} />
          <Route path="/reserva-cava" element={<ReservaCava />} />
          <Route path="/reserva-mesas" element={<ReservaMesas />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/gracias" element={<Gracias />} />
          <Route path="/formulario" element={<Formulario />} />
          <Route path="*" element={<Page404 />} />
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  )
}

export default App
