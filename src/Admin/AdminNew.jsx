import { useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminNew.css';
import FeedbackTab from './tabs/FeedbackTab';
import NewsletterTab from './tabs/NewsletterTab';
import ContactoTab from './tabs/ContactoTab';
import PedidosTab from './tabs/PedidosTab';
import PostulacionesTab from './tabs/PostulacionesTab';

function AdminNew() {
  const [tabActiva, setTabActiva] = useState('feedback');

  const tabs = [
    { id: 'feedback', nombre: '📝 Feedback', componente: FeedbackTab },
    { id: 'newsletter', nombre: '📧 Newsletter', componente: NewsletterTab },
    { id: 'contacto', nombre: '📩 Mensajes', componente: ContactoTab },
    { id: 'pedidos', nombre: '🍽️ Pedidos', componente: PedidosTab },
    { id: 'postulaciones', nombre: '💼 Postulaciones', componente: PostulacionesTab }
  ];

  const TabActual = tabs.find(t => t.id === tabActiva)?.componente;

  return (
    <div className="admin-new-container">
      <div className="admin-new-header">
        <div className="header-content">
          <h1>📊 Panel de Administración</h1>
          <p className="subtitle">Selvaggio Wine Bar - Datos & Estadísticas</p>
        </div>
        <div className="header-actions">
          <Link to="/admin-contenidos" className="btn-contenidos">
            🍷 Gestión de Contenidos
          </Link>
          <a href="/#/landing" className="btn-volver">← Volver al sitio</a>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${tabActiva === tab.id ? 'active' : ''}`}
              onClick={() => setTabActiva(tab.id)}
            >
              {tab.nombre}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {TabActual && <TabActual />}
        </div>
      </div>
    </div>
  );
}

export default AdminNew;
