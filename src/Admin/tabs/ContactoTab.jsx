import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

function ContactoTab() {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, leidos, no-leidos

  useEffect(() => {
    cargarMensajes();
  }, []);

  const cargarMensajes = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'selvaggio_contacto'), orderBy('fecha', 'desc'));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate()
      }));
      setMensajes(datos);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const marcarLeido = async (id, leido) => {
    try {
      await updateDoc(doc(db, 'selvaggio_contacto', id), { leido });
      setMensajes(mensajes.map(m => m.id === id ? { ...m, leido } : m));
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  const eliminar = async (id) => {
    if (window.confirm('¿Eliminar este mensaje?')) {
      try {
        await deleteDoc(doc(db, 'selvaggio_contacto', id));
        setMensajes(mensajes.filter(m => m.id !== id));
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  const filtrados = mensajes.filter(m => {
    if (filtro === 'leidos') return m.leido;
    if (filtro === 'no-leidos') return !m.leido;
    return true;
  });

  const noLeidos = mensajes.filter(m => !m.leido).length;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>📩 Mensajes de Contacto</h2>
        <p>Consultas desde el formulario de la landing</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{mensajes.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{noLeidos}</div>
          <div className="stat-label">Sin leer</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="filter-select">
          <option value="todos">Todos</option>
          <option value="no-leidos">No leídos</option>
          <option value="leidos">Leídos</option>
        </select>
        <button onClick={cargarMensajes} className="btn-action">🔄</button>
      </div>

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="empty-state">Sin mensajes</div>
      ) : (
        <div className="items-grid">
          {filtrados.map((m) => (
            <div key={m.id} className={`item-card ${m.leido ? 'leido' : 'no-leido'}`}>
              <div className="item-header">
                <span className="item-date">{m.fecha ? m.fecha.toLocaleDateString() : '-'}</span>
                <button onClick={() => eliminar(m.id)} className="btn-delete">🗑️</button>
              </div>
              <div className="item-body">
                <div><strong>Nombre:</strong> {m.nombre}</div>
                <div><strong>Email:</strong> {m.email}</div>
                {m.telefono && <div><strong>Teléfono:</strong> {m.telefono}</div>}
                <div className="item-text"><strong>Mensaje:</strong><br/>{m.mensaje}</div>
              </div>
              <div className="item-footer">
                <button 
                  onClick={() => marcarLeido(m.id, !m.leido)} 
                  className="btn-toggle"
                >
                  {m.leido ? '✓ Leído' : 'Marcar como leído'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContactoTab;
