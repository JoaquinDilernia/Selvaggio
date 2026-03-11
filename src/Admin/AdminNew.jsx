import { useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminNew.css';
import FeedbackTab from './tabs/FeedbackTab';
import NewsletterTab from './tabs/NewsletterTab';
import ContactoTab from './tabs/ContactoTab';
import PedidosTab from './tabs/PedidosTab';
import PostulacionesTab from './tabs/PostulacionesTab';
import AdminReservas from './AdminReservas';

function AdminNew() {
  const [tabActiva, setTabActiva] = useState('reservas');

  const tabs = [
    { id: 'reservas',      nombre: 'Reservas',      componente: AdminReservas },
    { id: 'feedback',      nombre: 'Feedback',       componente: FeedbackTab },
    { id: 'newsletter',    nombre: 'Newsletter',     componente: NewsletterTab },
    { id: 'contacto',      nombre: 'Mensajes',       componente: ContactoTab },
    { id: 'pedidos',       nombre: 'Pedidos',        componente: PedidosTab },
    { id: 'postulaciones', nombre: 'Postulaciones',  componente: PostulacionesTab }
  ];

  const TabActual = tabs.find(t => t.id === tabActiva)?.componente;

  return (
    <div className="adm-root">

      {/* Header */}
      <header className="adm-header">
        <div className="adm-header__inner">
          <div className="adm-header__brand">
            <span className="adm-header__logo">Selvaggio</span>
            <span className="adm-header__sep">·</span>
            <span className="adm-header__title">Panel de administración</span>
          </div>
          <div className="adm-header__actions">
            <Link to="/admin-contenidos" className="adm-btn adm-btn--outline">
              Gestión de contenidos
            </Link>
            <a href="/#/" className="adm-btn adm-btn--ghost">← Sitio</a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="adm-tabs">
        <div className="adm-tabs__inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`adm-tab${tabActiva === tab.id ? ' adm-tab--on' : ''}`}
              onClick={() => setTabActiva(tab.id)}
            >
              {tab.nombre}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="adm-main">
        <div className="adm-main__inner">
          {TabActual && <TabActual />}
        </div>
      </main>

    </div>
  );
}

export default AdminNew;
