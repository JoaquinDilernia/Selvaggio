import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Admin.css';

function Admin() {
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [ordenar, setOrdenar] = useState('fecha-desc');

  useEffect(() => {
    cargarRespuestas();
  }, []);

  const cargarRespuestas = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'selvaggio'), orderBy('fecha', 'desc'));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate()
      }));
      setRespuestas(datos);
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
    } finally {
      setCargando(false);
    }
  };

  const eliminarRespuesta = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta respuesta?')) {
      try {
        await deleteDoc(doc(db, 'selvaggio', id));
        setRespuestas(respuestas.filter(r => r.id !== id));
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar la respuesta');
      }
    }
  };

  const exportarCSV = () => {
    if (respuestas.length === 0) return;

    const headers = [
      'Fecha',
      'Turno',
      'Cómo viniste',
      'Entendiste',
      'Cómodo',
      'Gusto (1-5)',
      'Volverías',
      'Recomendarías (1-10)',
      'Faltó comer',
      'Mejoras menú',
      'Música vivo',
      'Cumple',
      'Costó llegar',
      'Estacionamiento',
      'Comentarios',
      'Contacto'
    ];

    const filas = respuestas.map(r => [
      r.fecha ? r.fecha.toLocaleString() : '',
      r.turno,
      r.comoViniste === 'Otro' ? `Otro: ${r.comoVinisteOtro}` : r.comoViniste,
      r.entendiste,
      r.comodo === 'Sí' ? r.comodo : `${r.comodo} - ${r.comodoPorque || ''}`,
      r.gustoGeneral,
      r.volverias,
      r.recomendarias,
      r.faltoComer,
      `"${(r.mejorasMenu || '').replace(/"/g, '""')}"`,
      r.musicaVivo,
      r.cumple,
      r.costoLlegar,
      r.estacionamiento,
      `"${(r.comentarios || '').replace(/"/g, '""')}"`,
      r.contacto
    ]);

    const csv = [headers, ...filas].map(fila => fila.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selvaggio-respuestas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const calcularEstadisticas = () => {
    if (respuestas.length === 0) return null;

    const promedioGusto = (respuestas.reduce((sum, r) => sum + (parseInt(r.gustoGeneral) || 0), 0) / respuestas.length).toFixed(1);
    const promedioRecomendacion = (respuestas.reduce((sum, r) => sum + (parseInt(r.recomendarias) || 0), 0) / respuestas.length).toFixed(1);
    const volverianSi = respuestas.filter(r => r.volverias === 'Sí').length;
    const entendieronSi = respuestas.filter(r => r.entendiste === 'Sí').length;

    return {
      total: respuestas.length,
      promedioGusto,
      promedioRecomendacion,
      porcentajeVolverias: ((volverianSi / respuestas.length) * 100).toFixed(0),
      porcentajeEntendieron: ((entendieronSi / respuestas.length) * 100).toFixed(0)
    };
  };

  const respuestasFiltradas = respuestas.filter(r => {
    if (!filtro) return true;
    const busqueda = filtro.toLowerCase();
    return (
      r.turno?.toLowerCase().includes(busqueda) ||
      r.comoViniste?.toLowerCase().includes(busqueda) ||
      r.contacto?.toLowerCase().includes(busqueda) ||
      r.comentarios?.toLowerCase().includes(busqueda) ||
      r.mejorasMenu?.toLowerCase().includes(busqueda)
    );
  });

  const stats = calcularEstadisticas();

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📊 Panel de Administración - Selvaggio</h1>
        <a href="#/" className="btn-volver">← Volver al formulario</a>
      </div>

      {stats && (
        <div className="estadisticas">
          <div className="stat-card">
            <div className="stat-numero">{stats.total}</div>
            <div className="stat-label">Respuestas totales</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero">{stats.promedioGusto}/5</div>
            <div className="stat-label">Gusto general</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero">{stats.promedioRecomendacion}/10</div>
            <div className="stat-label">Recomendación</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero">{stats.porcentajeVolverias}%</div>
            <div className="stat-label">Volverían</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero">{stats.porcentajeEntendieron}%</div>
            <div className="stat-label">Entendieron</div>
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="search-input"
        />
        <button onClick={exportarCSV} className="btn-exportar" disabled={respuestas.length === 0}>
          📥 Exportar CSV
        </button>
        <button onClick={cargarRespuestas} className="btn-refrescar">
          🔄 Refrescar
        </button>
      </div>

      {cargando ? (
        <div className="loading">
          <div className="spinner-grande"></div>
          <p>Cargando respuestas...</p>
        </div>
      ) : respuestasFiltradas.length === 0 ? (
        <div className="empty-state">
          <p>📭 {filtro ? 'No se encontraron resultados' : 'Aún no hay respuestas'}</p>
        </div>
      ) : (
        <div className="respuestas-grid">
          {respuestasFiltradas.map((respuesta) => (
            <div key={respuesta.id} className="respuesta-card">
              <div className="card-header">
                <span className="fecha">
                  {respuesta.fecha ? respuesta.fecha.toLocaleDateString() + ' ' + respuesta.fecha.toLocaleTimeString() : 'Sin fecha'}
                </span>
                <button onClick={() => eliminarRespuesta(respuesta.id)} className="btn-eliminar" title="Eliminar">
                  🗑️
                </button>
              </div>

              <div className="card-body">
                <div className="campo">
                  <strong>Turno:</strong> {respuesta.turno}
                </div>
                <div className="campo">
                  <strong>Cómo viniste:</strong> {respuesta.comoViniste === 'Otro' ? `Otro: ${respuesta.comoVinisteOtro}` : respuesta.comoViniste}
                </div>
                <div className="campo">
                  <strong>Entendiste:</strong> {respuesta.entendiste}
                </div>
                <div className="campo">
                  <strong>Cómodo:</strong> {respuesta.comodo}
                  {respuesta.comodo !== 'Sí' && respuesta.comodoPorque && (
                    <p className="detalle">{respuesta.comodoPorque}</p>
                  )}
                </div>
                <div className="campo destacado">
                  <strong>Gusto general:</strong> {respuesta.gustoGeneral}/5
                </div>
                <div className="campo">
                  <strong>Volverías:</strong> {respuesta.volverias}
                </div>
                <div className="campo destacado">
                  <strong>Recomendarías:</strong> {respuesta.recomendarias}/10
                </div>
                <div className="campo">
                  <strong>Faltó comer:</strong> {respuesta.faltoComer}
                </div>
                {respuesta.mejorasMenu && (
                  <div className="campo texto-largo">
                    <strong>Mejoras menú:</strong>
                    <p>{respuesta.mejorasMenu}</p>
                  </div>
                )}
                <div className="campo">
                  <strong>Música vivo:</strong> {respuesta.musicaVivo}
                </div>
                <div className="campo">
                  <strong>Cumple:</strong> {respuesta.cumple}
                </div>
                <div className="campo">
                  <strong>Costó llegar:</strong> {respuesta.costoLlegar}
                </div>
                <div className="campo">
                  <strong>Estacionamiento:</strong> {respuesta.estacionamiento}
                </div>
                {respuesta.comentarios && (
                  <div className="campo texto-largo">
                    <strong>Comentarios:</strong>
                    <p>{respuesta.comentarios}</p>
                  </div>
                )}
                {respuesta.contacto && (
                  <div className="campo contacto">
                    <strong>Contacto:</strong> {respuesta.contacto}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Admin;
