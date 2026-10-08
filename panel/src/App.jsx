import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setLogoutHandler } from './lib/api';
import Layout, { GestionLayout, ContenidoLayout } from './components/Layout/Layout.jsx';
import { Resumen } from './pages/gestion/Gestion.jsx';
import * as Web from './web/pages.jsx';
import Dashboard     from './pages/Dashboard.jsx';
import Conversations from './pages/Conversations.jsx';
import Simulator     from './pages/Simulator.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import Config        from './pages/Config.jsx';
import Labels        from './pages/Labels.jsx';
import Profile       from './pages/Profile.jsx';
import Stats         from './pages/Stats.jsx';
import Login         from './pages/Login.jsx';
import QuickReplies  from './pages/QuickReplies.jsx';
import Templates     from './pages/Templates.jsx';
import Costs         from './pages/Costs.jsx';
import Areas         from './pages/Areas.jsx';
import Users         from './pages/Users.jsx';
import Customers     from './pages/Customers.jsx';
import Campaigns     from './pages/Campaigns.jsx';
import Hub           from './pages/Hub.jsx';
import Reservas      from './pages/Reservas.jsx';

import { tieneSector } from './lib/sectores';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { agent, loading, logout } = useAuth();
  setLogoutHandler(logout);

  if (loading) return null;

  return (
    <Routes>
        <Route path="/login" element={agent ? <Navigate to="/hub" replace /> : <Login />} />

        {/* Hub: pantalla de entrada para elegir área (bot, gestión, contenido, caja, cocina) */}
        <Route path="/hub" element={agent ? <Hub /> : <Navigate to="/login" replace />} />

        {/* Gestión: lo que antes era /#/admin de la landing (admin y atención al cliente) */}
        <Route path="/gestion" element={!agent ? <Navigate to="/login" replace /> : tieneSector(agent, 'gestion') ? <GestionLayout /> : <Navigate to="/hub" replace />}>
          <Route index element={<Navigate to="/gestion/resumen" replace />} />
          <Route path="resumen"       element={<Resumen />} />
          <Route path="reservas"      element={<Web.Reservas />} />
          <Route path="takeaway"      element={<Web.TakeAway />} />
          <Route path="cupones"       element={<Web.Cupones />} />
          <Route path="calendario"    element={<Web.Calendario />} />
          <Route path="eventos"       element={<Web.Eventos />} />
          <Route path="comandas"      element={<Web.Salon />} />
          <Route path="clientes"      element={<Customers />} />{/* misma lista única que Bot → Clientes */}
          <Route path="mensajes"      element={<Web.Mensajes />} />
          <Route path="postulaciones" element={<Web.Postulaciones />} />
          <Route path="newsletter"    element={<Web.Newsletter />} />
          <Route path="feedback"      element={<Web.Feedback />} />
          <Route path="analytics"     element={<Web.Analytics />} />
          <Route path="invitaciones"  element={<Navigate to="/gestion/reservas" replace />} />
          <Route path="resenas"       element={<Navigate to="/contenido/resenas" replace />} />
        </Route>

        {/* Contenido web: lo que antes era /#/admin-contenidos (solo admin) */}
        <Route path="/contenido" element={!agent ? <Navigate to="/login" replace /> : tieneSector(agent, 'contenido') ? <ContenidoLayout /> : <Navigate to="/hub" replace />}>
          <Route index element={<Navigate to="/contenido/carta" replace />} />
          <Route path="carta"         element={<Web.Carta />} />
          <Route path="maridajes"     element={<Web.Maridajes />} />
          <Route path="galeria"       element={<Web.Galeria />} />
          <Route path="resenas"       element={<Web.Resenas />} />
          <Route path="prensa"        element={<Web.Prensa />} />
          <Route path="configuracion" element={<Web.ConfigWeb />} />
        </Route>

        {/* Caja y cocina: pantalla completa, antes /#/caja y /#/cocina */}
        <Route path="/caja"   element={!agent ? <Navigate to="/login" replace /> : tieneSector(agent, 'caja') ? <Web.Caja /> : <Navigate to="/hub" replace />} />
        <Route path="/cocina" element={!agent ? <Navigate to="/login" replace /> : tieneSector(agent, 'cocina') ? <Web.Cocina /> : <Navigate to="/hub" replace />} />

        {/* Caja y cocina no tienen nada del bot: cualquier ruta del Layout los manda al Hub */}
        <Route path="/" element={!agent ? <Navigate to="/login" replace /> : tieneSector(agent, 'bot') ? <Layout /> : <Navigate to="/hub" replace />}>
          <Route index element={<Navigate to="/hub" replace />} />
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="customers"     element={<Customers />} />
          <Route path="campaigns"     element={<Campaigns />} />
          <Route path="reservas"      element={<Reservas />} />
          <Route path="simulator"     element={<Simulator />} />
          <Route path="knowledge"     element={<KnowledgeBase />} />
          <Route path="config"        element={<Config />} />
          <Route path="labels"        element={<Labels />} />
          <Route path="profile"       element={<Profile />} />
          <Route path="stats"         element={<Stats />} />
          <Route path="quick-replies" element={<QuickReplies />} />
          <Route path="templates"     element={<Templates />} />
          <Route path="costs"         element={<Costs />} />
          <Route path="areas"         element={<Areas />} />
          <Route path="users"         element={<Users />} />
        </Route>
      </Routes>
  );
}
