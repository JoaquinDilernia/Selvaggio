import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ensureFirebaseSession } from './firebase/config';
import { ToastProvider } from './components/Toast';
import styles from '../pages/gestion/Gestion.module.css';
import './Admin/AdminNew.css';
import './WebPage.css';

// Envoltorio de las pantallas que vinieron del admin de la landing: abre la
// sesión de Firebase con el usuario del panel antes de montarlas (sin eso las
// reglas de Firestore rechazan las escrituras) y les da el contenedor
// `.adm-root` del que dependen sus estilos.
export default function WebPage({ titulo, subtitulo, children, fullscreen = false }) {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    ensureFirebaseSession(agent)
      .then(() => vivo && setEstado('ok'))
      .catch(e => { if (vivo) { setError(e.message || 'No se pudo conectar'); setEstado('error'); } });
    return () => { vivo = false; };
  }, [agent]);

  const contenido = estado === 'ok'
    ? <ToastProvider>{children}</ToastProvider>
    : estado === 'error'
      ? <p className={styles.error}>{error}</p>
      : <div className={styles.loading}>{[200, 140, 260, 180].map((w, i) => <span key={i} style={{ width: w }} />)}</div>;

  if (fullscreen) {
    // Caja y cocina: pantalla completa (tablet), con salida al Hub y logout.
    return (
      <div className="adm-root web-fullscreen">
        <div className="web-fullscreen__bar">
          <button onClick={() => navigate('/hub')}>← Inicio</button>
          <button onClick={logout} title={agent?.email}>Cerrar sesión</button>
        </div>
        {contenido}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{titulo}</h1>
          {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
        </div>
      </header>
      <div className={styles.body}>
        <div className="adm-root web-embed">{contenido}</div>
      </div>
    </div>
  );
}
