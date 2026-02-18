import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Landing from './Landing/Landing'
import LandingDemo from './LandingDemo/LandingDemo'
import AdminNew from './Admin/AdminNew'
import AdminContenidos from './Admin/AdminContenidos'
import ImportarProductosExcel from './Admin/ImportarProductosExcel'
import Caja from './Caja/Caja'
import Cocina from './Cocina/Cocina'
import CargarDatosPrueba from './CargarDatosPrueba'
import LimpiarDuplicados from './LimpiarDuplicados'
import OrganizadorFotos from './OrganizadorFotos'
import ReservaCava from './Reservas/ReservaCava'
import ReservaMesas from './Reservas/ReservaMesas'
import Page404 from './pages/Page404'
import Terminos from './pages/Terminos'
import Privacidad from './pages/Privacidad'
import Gracias from './pages/Gracias'
import Formulario from './Formulario'
import './theme.css'
import './App.css'

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<LandingDemo />} />
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
      </Router>
    </ToastProvider>
  )
}

export default App
