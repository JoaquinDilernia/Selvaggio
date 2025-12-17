import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

function PedidosTab() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('completados'); // pendientes, completados, todos

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setCargando(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_pedidos'));
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        pedido_creado: doc.data().pedido_creado?.toDate(),
        pedido_listo: doc.data().pedido_listo?.toDate()
      }));
      // Ordenar manualmente por fecha
      datos.sort((a, b) => {
        if (!a.pedido_creado || !b.pedido_creado) return 0;
        return b.pedido_creado - a.pedido_creado;
      });
      setPedidos(datos);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const calcularTiempoPreparacion = (creado, listo) => {
    if (!creado || !listo) return null;
    // Convertir timestamps de Firebase a Date
    const fechaCreado = creado.toDate ? creado.toDate() : new Date(creado);
    const fechaListo = listo.toDate ? listo.toDate() : new Date(listo);
    const diffMs = fechaListo - fechaCreado;
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins;
  };

  const filtrados = pedidos.filter(p => {
    if (filtro === 'pendientes') return p.estado === 'pendiente';
    if (filtro === 'completados') return p.estado === 'completado';
    return true;
  });

  const completados = pedidos.filter(p => p.estado === 'completado' && p.pedido_listo);
  const tiempos = completados.map(p => calcularTiempoPreparacion(p.pedido_creado, p.pedido_listo)).filter(t => t !== null);
  
  const stats = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    completados: completados.length,
    tiempoPromedio: tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0,
    tiempoMin: tiempos.length > 0 ? Math.min(...tiempos) : 0,
    tiempoMax: tiempos.length > 0 ? Math.max(...tiempos) : 0
  };

  const exportarCSV = () => {
    const headers = ['Pedido', 'Nombre', 'Teléfono', 'Creado', 'Listo', 'Tiempo (min)', 'Estado'];
    const filas = pedidos.map(p => [
      p.numeroPedido,
      p.nombre,
      p.telefono,
      p.pedido_creado ? p.pedido_creado.toLocaleString() : '',
      p.pedido_listo ? p.pedido_listo.toLocaleString() : '',
      calcularTiempoPreparacion(p.pedido_creado, p.pedido_listo) || '',
      p.estado
    ]);
    const csv = [headers, ...filas].map(f => f.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>🍽️ Estadísticas de Pedidos</h2>
        <p>Análisis de tiempos de preparación</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{stats.pendientes}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{stats.completados}</div>
          <div className="stat-label">Completados</div>
        </div>
        <div className="stat-box highlight">
          <div className="stat-num">{stats.tiempoPromedio} min</div>
          <div className="stat-label">Tiempo Promedio</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{stats.tiempoMin} min</div>
          <div className="stat-label">Mínimo</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{stats.tiempoMax} min</div>
          <div className="stat-label">Máximo</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="filter-select">
          <option value="todos">Todos</option>
          <option value="completados">Completados</option>
          <option value="pendientes">Pendientes</option>
        </select>
        <button onClick={exportarCSV} className="btn-action">📥 Exportar CSV</button>
        <button onClick={cargarPedidos} className="btn-action">🔄</button>
      </div>

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">Sin pedidos</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Pedido</th>
                <th>Nombre</th>
                <th>Creado</th>
                <th>Listo</th>
                <th>Tiempo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const tiempo = calcularTiempoPreparacion(p.pedido_creado, p.pedido_listo);
                return (
                  <tr key={p.id}>
                    <td><strong>#{p.numeroPedido}</strong></td>
                    <td>{p.nombre}</td>
                    <td>{p.pedido_creado ? p.pedido_creado.toLocaleTimeString() : '-'}</td>
                    <td>{p.pedido_listo ? p.pedido_listo.toLocaleTimeString() : '-'}</td>
                    <td>{tiempo ? `${tiempo} min` : '-'}</td>
                    <td>
                      <span className={`badge ${p.estado}`}>
                        {p.estado === 'pendiente' ? '⏳ Pendiente' : '✓ Completado'}
                      </span>
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

export default PedidosTab;
