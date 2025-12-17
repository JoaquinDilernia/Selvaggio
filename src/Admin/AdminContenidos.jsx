import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminVinos from './AdminVinos';
import AdminProductos from './AdminProductos';
import AdminMaridajes from './AdminMaridajes';
import AdminGaleria from './AdminGaleria';
import AdminReseñas from './AdminReseñas';
import AdminPrensa from './AdminPrensa';
import './AdminContenidos.css';
import './AdminGaleria.css';

function AdminContenidos() {
  const [tabActiva, setTabActiva] = useState('vinos');

  const tabs = [
    { id: 'vinos', label: 'Vinos', icon: '🍷' },
    { id: 'productos', label: 'Productos', icon: '🧀' },
    { id: 'maridajes', label: 'Maridajes', icon: '✨' },
    { id: 'galeria', label: 'Galería', icon: '📸' },
    { id: 'reseñas', label: 'Reseñas', icon: '⭐' },
    { id: 'prensa', label: 'Prensa', icon: '📰' }
  ];

  const renderContenido = () => {
    switch (tabActiva) {
      case 'vinos':
        return <AdminVinos />;
      case 'productos':
        return <AdminProductos />;
      case 'maridajes':
        return <AdminMaridajes />;
      case 'galeria':
        return <AdminGaleria />;
      case 'reseñas':
        return <AdminReseñas />;
      case 'prensa':
        return <AdminPrensa />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-contenidos">
      {/* Header */}
      <div className="admin-contenidos-header">
        <div className="header-info">
          <h1>Gestión de Contenidos</h1>
          <p>Administra la carta de vinos, productos y maridajes de la landing</p>
        </div>
        <div className="header-nav-buttons">
          <Link to="/admin" className="btn-panel-principal">
            📊 Panel Principal
          </Link>
          <a href="/#/landing" className="btn-volver-contenidos">
            ← Volver al sitio
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderContenido()}
      </div>
    </div>
  );
}

export default AdminContenidos;
