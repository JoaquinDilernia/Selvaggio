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

  const abrirWppCumple = (c) => {
    let tel = (c.telefono || '').replace(/\D/g, '');
    if (tel.startsWith('54')) tel = tel.slice(2);
    if (tel.startsWith('0')) tel = tel.slice(1);
    const msg = `Hola ${c.nombre || ''}! 🎂 ¡Celebrá tu cumpleaños en Selvaggio! 🥂\n\nTu cumpleaños merece un festejo especial. ✨\n\nReservando La Cava con al menos 15 días de anticipación, disfrutás de un 10% OFF en tu celebración.\n\n🍷 Un espacio único\n🧀 Sabores para compartir\n🥂 Vinos y una experiencia especial para disfrutar con los que más querés.\n\n📅 Reservá con anticipación y aprovechá el beneficio.\n\n📍 Selvaggio — Av. Fondo de la Legua 59, San Isidro`;
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportarCSV = () => {
    const filas = [
      ['Nombre', 'Email', 'Teléfono', 'Cumpleaños', 'Reservas', 'Pedidos', 'Última reserva'],
      ...clientesFiltrados.map(c => [
        c.nombre || '',
        c.email || '',
        c.telefono || '',
        c.fechaNacimiento ? formatCumple(c.fechaNacimiento) : '',
        c.totalReservas || 0,
        c.totalPedidos || 0,
        c.ultimaReserva ? new Date(c.ultimaReserva).toLocaleDateString('es-AR') : '',
      ])
    ];
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-selvaggio-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <button
          onClick={exportarCSV}
          disabled={clientesFiltrados.length === 0}
          style={{ padding: '10px 18px', background: '#1c1a17', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Exportar CSV
        </button>
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
                <th style={{ padding: '10px 12px', fontWeight: 600, color: '#1c1a17', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => {
                const badge = cumpleProximo(c.fechaNacimiento);
                const tieneTelefono = !!(c.telefono || '').replace(/\D/g, '');
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
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => abrirWppCumple(c)}
                        disabled={!tieneTelefono}
                        title={tieneTelefono ? 'Enviar saludo de cumpleaños por WhatsApp' : 'Cliente sin teléfono'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'Inter, sans-serif',
                          border: '1px solid #b8e0c6', background: tieneTelefono ? '#e8f6ee' : '#f0f0ee',
                          color: tieneTelefono ? '#1a7a3e' : '#a8a29a',
                          cursor: tieneTelefono ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Saludar
                      </button>
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
