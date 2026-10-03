import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Hub.module.css';

// URL pública de la landing (sin barra final). Gestión, Contenido, Caja y
// Cocina todavía viven ahí (Firestore directo; login con el mismo usuario del
// panel vía /api/auth/firebase-token); se van a
// ir migrando a este panel de a una, y cuando eso pase la tarjeta pasa de
// `href` a `to`.
const LANDING_URL = (import.meta.env.VITE_LANDING_URL ?? '').replace(/\/$/, '');

export default function Hub() {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();
  const role = agent?.role;

  const areas = [
    {
      key: 'bot',
      title: 'Bot de WhatsApp',
      desc: 'Conversaciones, contactos, difusiones, base de conocimiento y estadísticas.',
      to: '/conversations',
      roles: ['admin', 'atencion_cliente', 'operador'],
    },
    {
      key: 'gestion',
      title: 'Gestión',
      desc: 'Reservas de mesa y La Cava, take away, salón, clientes, mensajes, eventos, invitaciones y cupones.',
      to: '/gestion/resumen',
      roles: ['admin', 'atencion_cliente'],
    },
    {
      key: 'contenido',
      title: 'Contenido web',
      desc: 'Galería, reseñas, prensa y carta de la landing.',
      href: `${LANDING_URL}/#/admin-contenidos`,
      roles: ['admin'],
    },
    {
      key: 'caja',
      title: 'Caja',
      desc: 'Carga de pedidos del salón.',
      href: `${LANDING_URL}/#/caja`,
      roles: ['admin', 'caja'],
    },
    {
      key: 'cocina',
      title: 'Cocina',
      desc: 'Comandas en tiempo real.',
      href: `${LANDING_URL}/#/cocina`,
      roles: ['admin', 'cocina'],
    },
  ].filter(a => a.roles.includes(role));

  function open(a) {
    if (a.to) navigate(a.to);
    else window.open(a.href, '_blank', 'noopener');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.brand}>Selvaggio</span>
          <h1 className={styles.title}>Hola, {agent?.name ?? 'equipo'}</h1>
          <p className={styles.sub}>¿Con qué querés trabajar hoy?</p>
        </header>

        <div className={styles.grid}>
          {areas.map((a) => (
            <button key={a.key} className={styles.card} onClick={() => open(a)}>
              <span className={styles.cardTitle}>{a.title}</span>
              <span className={styles.cardDesc}>{a.desc}</span>
              <span className={styles.cardGo}>{a.to ? 'Entrar →' : 'Abrir ↗'}</span>
            </button>
          ))}
        </div>

        <button className={styles.logout} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
