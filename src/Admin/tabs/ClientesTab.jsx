import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

function ClientesTab() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('cumple'); // cumple | nombre | reservas | reciente

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_clientes'));
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setCargando(false);
    }
  };

  // Sorting
  const getDiasParaCumple = (fechaNac) => {
    if (!fechaNac) return 9999;
    const hoy = new Date();
    const [, mes, dia] = fechaNac.split('-').map(Number);
    let cumple = new Date(hoy.getFullYear(), mes - 1, dia);
    if (cumple < hoy) cumple.setFullYear(hoy.getFullYear() + 1);
    const diff = Math.floor((cumple - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const clientesFiltrados = clientes
    .filter(c => {
      if (!busqueda) return true;
      const q = busqueda.toLowerCase();
      return (c.nombre || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
        || (c.telefono || '').includes(q);
    })
    .sort((a, b) => {
      if (orden === 'cumple') return getDiasParaCumple(a.fechaNacimiento) - getDiasParaCumple(b.fechaNacimiento);
      if (orden === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '');
      if (orden === 'reservas') return (b.totalReservas || 0) - (a.totalReservas || 0);
      if (orden === 'reciente') return (b.ultimaReserva || '').localeCompare(a.ultimaReserva || '');
      return 0;
    });

  const formatCumple = (fecha) => {
    if (!fecha) return '—';
    const [, mes, dia] = fecha.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(dia)} ${meses[parseInt(mes) - 1]}`;
  };

  const cumpleProximo = (fecha) => {
    const dias = getDiasParaCumple(fecha);
    if (dias === 9999) return null;
    if (dias === 0) return 'Hoy 🎂';
    if (dias <= 7) return `En ${dias} día${dias > 1 ? 's' : ''} 🎂`;
    if (dias <= 30) return `En ${dias} días`;
    return null;
  };

  // Stats
  const totalClientes = clientes.length;
  const conCumple = clientes.filter(c => c.fechaNacimiento).length;
  const cumpleEsteMes = clientes.filter(c => {
    if (!c.fechaNacimiento) return false;
    const mes = parseInt(c.fechaNacimiento.split('-')[1]);
    return mes === new Date().getMonth() + 1;
  }).length;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Clientes</h2>
        <p>Base de datos de clientes — se actualiza automáticamente con cada reserva.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{totalClientes}</div>
          <div className="stat-label">Clientes</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{conCumple}</div>
          <div className="stat-label">Con cumpleaños</div>
        </div>
        <div className="stat-box highlight">
          <div className="stat-num">{cumpleEsteMes}</div>
          <div className="stat-label">Cumplen este mes</div>
        </div>
      </div>

      {/* Controls */}
      <div className="tab-controls" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="tab-search"
          placeholder="Buscar por nombre, email o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid rgba(28,26,23,0.15)', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif' }}
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid rgba(28,26,23,0.15)', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif', background: '#fff' }}
        >
          <option value="cumple">Próximo cumpleaños</option>
          <option value="nombre">Nombre A–Z</option>
          <option value="reservas">Más reservas</option>
          <option value="reciente">Última reserva</option>
        </select>
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#6b635a', padding: 40 }}>Cargando clientes...</p>
      ) : clientesFiltrados.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b635a', padding: 40 }}>
          {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay clientes aún. Se cargan automáticamente con cada reserva.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tab-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(28,26,23,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17' }}>Nombre</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17' }}>Email</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17' }}>Teléfono</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17' }}>Cumpleaños</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17', textAlign: 'center' }}>Reservas</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17', textAlign: 'center' }}>Pedidos</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17' }}>Última reserva</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => {
                const badge = cumpleProximo(c.fechaNacimiento);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(28,26,23,0.06)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.nombre || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b635a' }}>{c.email || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b635a' }}>{c.telefono || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {formatCumple(c.fechaNacimiento)}
                      {badge && <span style={{ marginLeft: 8, fontSize: 12, color: badge.includes('🎂') ? '#b8860b' : '#6b635a' }}>{badge}</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.totalReservas || 0}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.totalPedidos || 0}</td>
                    <td style={{ padding: '10px 12px', color: '#6b635a', fontSize: 13 }}>
                      {c.ultimaReserva ? new Date(c.ultimaReserva).toLocaleDateString('es-AR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientesTab;
