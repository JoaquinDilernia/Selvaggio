import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Hub.module.css';

// Todas las áreas viven en el panel (las pantallas que venían de la landing
// están en src/web/). Una tarjeta con `href` abriría una URL externa.
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
      desc: 'Reservas, take away, cupones, calendario, eventos, salón, clientes, mensajes y analytics.',
      to: '/gestion/resumen',
      roles: ['admin', 'atencion_cliente'],
    },
    {
      key: 'contenido',
      title: 'Contenido web',
      desc: 'Carta, maridajes, galería, reseñas, prensa y configuración de la web.',
      to: '/contenido/carta',
      roles: ['admin'],
    },
    {
      key: 'caja',
      title: 'Caja',
      desc: 'Carga de pedidos del salón.',
      to: '/caja',
      roles: ['admin', 'caja'],
    },
    {
      key: 'cocina',
      title: 'Cocina',
      desc: 'Comandas en tiempo real.',
      to: '/cocina',
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
