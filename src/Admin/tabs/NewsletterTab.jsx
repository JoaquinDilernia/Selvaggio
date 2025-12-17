import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

function NewsletterTab() {
  const [emails, setEmails] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEmails();
  }, []);

  const cargarEmails = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, 'selvaggio_newsletter'), orderBy('fecha', 'desc'));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate()
      }));
      setEmails(datos);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm('¿Eliminar este email?')) {
      try {
        await deleteDoc(doc(db, 'selvaggio_newsletter', id));
        setEmails(emails.filter(e => e.id !== id));
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  const exportarCSV = () => {
    const csv = ['Email,Fecha', ...emails.map(e => `${e.email},${e.fecha ? e.fecha.toLocaleString() : ''}`)].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `newsletter-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const copiarTodos = () => {
    const lista = emails.map(e => e.email).join(', ');
    navigator.clipboard.writeText(lista);
    alert('¡Emails copiados al portapapeles!');
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>📧 Newsletter</h2>
        <p>Suscriptores de la página "Próximamente"</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{emails.length}</div>
          <div className="stat-label">Suscriptores</div>
        </div>
      </div>

      <div className="toolbar">
        <button onClick={exportarCSV} className="btn-action">📥 Exportar CSV</button>
        <button onClick={copiarTodos} className="btn-action">📋 Copiar todos</button>
        <button onClick={cargarEmails} className="btn-action">🔄</button>
      </div>

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : emails.length === 0 ? (
        <div className="empty-state">Sin suscriptores aún</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id}>
                  <td>{e.email}</td>
                  <td>{e.fecha ? e.fecha.toLocaleDateString() : '-'}</td>
                  <td>
                    <button onClick={() => eliminar(e.id)} className="btn-delete-small">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NewsletterTab;
