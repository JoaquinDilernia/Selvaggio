import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { setLogoutHandler } from './lib/api';
import Layout, { GestionLayout } from './components/Layout/Layout.jsx';
import { Resumen, Reservas as GReservas, TakeAway as GTakeAway, Comandas, Mensajes, Coleccion } from './pages/gestion/Gestion.jsx';
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

const BOT_ROLES = ['admin', 'atencion_cliente', 'operador'];

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

        {/* Gestión: datos de la web dentro del panel (admin y atención al cliente) */}
        <Route path="/gestion" element={!agent ? <Navigate to="/login" replace /> : ['admin', 'atencion_cliente'].includes(agent.role) ? <GestionLayout /> : <Navigate to="/hub" replace />}>
          <Route index element={<Navigate to="/gestion/resumen" replace />} />
          <Route path="resumen"      element={<Resumen />} />
          <Route path="reservas"     element={<GReservas />} />
          <Route path="takeaway"     element={<GTakeAway />} />
          <Route path="comandas"     element={<Comandas />} />
          <Route path="clientes"     element={<Customers />} />{/* misma lista única que Bot → Clientes */}
          <Route path="mensajes"     element={<Mensajes />} />
          <Route path="eventos"      element={<Coleccion nombre="eventos" />} />
          <Route path="invitaciones" element={<Coleccion nombre="invitaciones" />} />
          <Route path="cupones"      element={<Coleccion nombre="cupones" />} />
          <Route path="resenas"      element={<Coleccion nombre="resenas" />} />
        </Route>

        {/* Caja y cocina no tienen nada del bot: cualquier ruta del Layout los manda al Hub */}
        <Route path="/" element={!agent ? <Navigate to="/login" replace /> : BOT_ROLES.includes(agent.role) ? <Layout /> : <Navigate to="/hub" replace />}>
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
