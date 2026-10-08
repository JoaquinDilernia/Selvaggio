import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

function FeedbackTab() {
  const [respuestas, setRespuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

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
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm('¿Eliminar esta respuesta?')) {
      try {
        await deleteDoc(doc(db, 'selvaggio', id));
        setRespuestas(respuestas.filter(r => r.id !== id));
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  const exportarCSV = () => {
    const headers = ['Fecha', 'Turno', 'Cómo viniste', 'Gusto', 'Recomendación', 'Volverías', 'Comentarios', 'Contacto'];
    const filas = respuestas.map(r => [
      r.fecha ? r.fecha.toLocaleString() : '',
      r.turno, r.comoViniste, r.gustoGeneral, r.recomendarias, r.volverias,
      `"${(r.comentarios || '').replace(/"/g, '""')}"`, r.contacto
    ]);
    const csv = [headers, ...filas].map(f => f.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = respuestas.length > 0 ? {
    total: respuestas.length,
    promedioGusto: (respuestas.reduce((s, r) => s + (parseInt(r.gustoGeneral) || 0), 0) / respuestas.length).toFixed(1),
    promedioReco: (respuestas.reduce((s, r) => s + (parseInt(r.recomendarias) || 0), 0) / respuestas.length).toFixed(1),
    volverias: ((respuestas.filter(r => r.volverias === 'Sí').length / respuestas.length) * 100).toFixed(0)
  } : null;

  const filtradas = respuestas.filter(r => 
    !filtro || JSON.stringify(r).toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>📝 Feedback de Clientes</h2>
        <p>Respuestas del formulario de inauguración</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.promedioGusto}/5</div>
            <div className="stat-label">Gusto</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.promedioReco}/10</div>
            <div className="stat-label">Recomendación</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.volverias}%</div>
            <div className="stat-label">Volverían</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="search-box"
        />
        <button onClick={exportarCSV} className="btn-action">📥 Exportar CSV</button>
        <button onClick={cargarRespuestas} className="btn-action">🔄</button>
      </div>

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state">Sin datos</div>
      ) : (
        <div className="items-grid">
          {filtradas.map((r) => (
            <div key={r.id} className="item-card">
              <div className="item-header">
                <span className="item-date">
                  {r.fecha ? r.fecha.toLocaleDateString() : '-'}
                </span>
                <button onClick={() => eliminar(r.id)} className="btn-delete">🗑️</button>
              </div>
              <div className="item-body">
                <div><strong>Turno:</strong> {r.turno}</div>
                <div><strong>Gusto:</strong> {r.gustoGeneral}/5</div>
                <div><strong>Recomendación:</strong> {r.recomendarias}/10</div>
                <div><strong>Volverías:</strong> {r.volverias}</div>
                {r.comentarios && <div className="item-text"><strong>Comentarios:</strong> {r.comentarios}</div>}
                {r.contacto && <div><strong>Contacto:</strong> {r.contacto}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedbackTab;
