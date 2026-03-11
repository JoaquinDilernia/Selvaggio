import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminMaridajes from './AdminMaridajes';
import AdminGaleria from './AdminGaleria';
import AdminReseñas from './AdminReseñas';
import AdminPrensa from './AdminPrensa';
import AdminConfiguracion from './AdminConfiguracion';
import AdminCarta from './AdminCarta';
import './AdminContenidos.css';
import './AdminGaleria.css';

function AdminContenidos() {
  const [tabActiva, setTabActiva] = useState('carta');

  const tabs = [
    { id: 'carta',         label: 'Carta PDF' },
    { id: 'maridajes',     label: 'Maridajes' },
    { id: 'galeria',       label: 'Galería' },
    { id: 'reseñas',       label: 'Reseñas' },
    { id: 'prensa',        label: 'Prensa' },
    { id: 'configuracion', label: 'Configuración' }
  ];

  const renderContenido = () => {
    switch (tabActiva) {
      case 'carta':         return <AdminCarta />;
      case 'maridajes':     return <AdminMaridajes />;
      case 'galeria':       return <AdminGaleria />;
      case 'reseñas':       return <AdminReseñas />;
      case 'prensa':        return <AdminPrensa />;
      case 'configuracion': return <AdminConfiguracion />;
      default:              return null;
    }
  };

  return (
    <div className="adm-root">

      {/* Header */}
      <header className="adm-header">
        <div className="adm-header__inner">
          <div className="adm-header__brand">
            <span className="adm-header__logo">Selvaggio</span>
            <span className="adm-header__sep">·</span>
            <span className="adm-header__title">Gestión de contenidos</span>
          </div>
          <div className="adm-header__actions">
            <Link to="/admin" className="adm-btn adm-btn--outline">
              Panel principal
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
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="adm-main">
        <div className="adm-main__inner">
          {renderContenido()}
        </div>
      </main>

    </div>
  );
}

export default AdminContenidos;
