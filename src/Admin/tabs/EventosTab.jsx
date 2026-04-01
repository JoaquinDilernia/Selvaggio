import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import './TabsShared.css';

function EventosTab() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    descripcion: '',
    imagen: '',
    visible: true,
    esPopup: false,
    popupImagen: '',
    ctaTexto: '',
    ctaLink: ''
  });
  const [uploadingPopup, setUploadingPopup] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_eventos'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      setEventos(items);
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => {
    setForm({ titulo: '', fecha: '', horaInicio: '', horaFin: '', descripcion: '', imagen: '', visible: true, esPopup: false, popupImagen: '', ctaTexto: '', ctaLink: '' });
    setEditando(null);
    setShowForm(false);
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `eventos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(prev => ({ ...prev, imagen: url }));
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handlePopupImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPopup(true);
    try {
      const storageRef = ref(storage, `eventos/popup_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm(prev => ({ ...prev, popupImagen: url }));
    } catch (err) {
      console.error('Error subiendo imagen popup:', err);
      alert('Error al subir la imagen del popup');
    } finally {
      setUploadingPopup(false);
    }
  };

  const guardar = async () => {
    if (!form.titulo || !form.fecha) {
      alert('Completá al menos título y fecha');
      return;
    }
    try {
      const data = {
        titulo: form.titulo,
        fecha: form.fecha,
        horaInicio: form.horaInicio || '',
        horaFin: form.horaFin || '',
        descripcion: form.descripcion || '',
        imagen: form.imagen || '',
        visible: form.visible,
        esPopup: form.esPopup || false,
        popupImagen: form.popupImagen || '',
        ctaTexto: form.ctaTexto || '',
        ctaLink: form.ctaLink || '',
        actualizadoEn: new Date().toISOString()
      };

      // Si se activa como popup, desactivar popup en cualquier otro evento
      if (data.esPopup) {
        const otrosPopup = eventos.filter(e => e.esPopup && e.id !== editando);
        for (const otro of otrosPopup) {
          await updateDoc(doc(db, 'selvaggio_eventos', otro.id), { esPopup: false });
        }
      }

      if (editando) {
        await updateDoc(doc(db, 'selvaggio_eventos', editando), data);
      } else {
        data.creadoEn = new Date().toISOString();
        await addDoc(collection(db, 'selvaggio_eventos'), data);
      }
      await cargar();
      resetForm();
    } catch (err) {
      console.error('Error guardando evento:', err);
      alert('Error al guardar');
    }
  };

  const editar = (ev) => {
    setForm({
      titulo: ev.titulo || '',
      fecha: ev.fecha || '',
      horaInicio: ev.horaInicio || '',
      horaFin: ev.horaFin || '',
      descripcion: ev.descripcion || '',
      imagen: ev.imagen || '',
      visible: ev.visible !== false,
      esPopup: ev.esPopup || false,
      popupImagen: ev.popupImagen || '',
      ctaTexto: ev.ctaTexto || '',
      ctaLink: ev.ctaLink || ''
    });
    setEditando(ev.id);
    setShowForm(true);
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_eventos', id));
      setEventos(eventos.filter(e => e.id !== id));
    } catch {
      alert('Error al eliminar');
    }
  };

  const toggleVisible = async (ev) => {
    try {
      await updateDoc(doc(db, 'selvaggio_eventos', ev.id), { visible: !ev.visible });
      setEventos(eventos.map(e => e.id === ev.id ? { ...e, visible: !e.visible } : e));
    } catch {
      alert('Error al actualizar');
    }
  };

  const formatFecha = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const hoy = new Date().toISOString().split('T')[0];
  const proximos = eventos.filter(e => e.fecha >= hoy);
  const pasados = eventos.filter(e => e.fecha < hoy);

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>🎉 Eventos</h2>
        <p>Creá y gestioná eventos especiales. Se muestran en el calendario, en las reservas y en la landing.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-box highlight">
          <div className="stat-num">{proximos.length}</div>
          <div className="stat-label">Próximos</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{eventos.filter(e => e.visible).length}</div>
          <div className="stat-label">Visibles</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{eventos.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      {/* Botón crear */}
      {!showForm && (
        <button className="btn-action" onClick={() => setShowForm(true)}>
          + Nuevo evento
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="cal-form" style={{ marginBottom: 28 }}>
          <h3 className="cal-form__title">
            {editando ? '✏️ Editar evento' : '🆕 Nuevo evento'}
          </h3>

          <div className="cal-form__field">
            <label>Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ej: Noche de vinos italianos"
            />
          </div>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Fecha *</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <div className="cal-form__field">
              <label>Hora inicio</label>
              <input
                type="time"
                value={form.horaInicio}
                onChange={e => setForm(prev => ({ ...prev, horaInicio: e.target.value }))}
              />
            </div>
            <div className="cal-form__field">
              <label>Hora fin</label>
              <input
                type="time"
                value={form.horaFin}
                onChange={e => setForm(prev => ({ ...prev, horaFin: e.target.value }))}
              />
            </div>
          </div>

          <div className="cal-form__field">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              rows="3"
              placeholder="Detalle del evento, qué incluye, etc."
            />
          </div>

          <div className="cal-form__field">
            <label>Imagen</label>
            <input type="file" accept="image/*" onChange={handleImage} />
            {uploading && <p style={{ fontSize: 13, color: '#6b635a' }}>Subiendo imagen…</p>}
            {form.imagen && (
              <img src={form.imagen} alt="preview" style={{ marginTop: 8, maxWidth: 200, borderRadius: 6 }} />
            )}
          </div>

          <div className="cal-form__field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.visible}
                onChange={e => setForm(prev => ({ ...prev, visible: e.target.checked }))}
              />
              Visible en la landing
            </label>
          </div>

          {/* Configuración de popup */}
          <div className="cal-form__field" style={{ background: form.esPopup ? '#fdf6ee' : 'transparent', padding: form.esPopup ? 16 : 0, borderRadius: 8, transition: 'all 0.3s' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={form.esPopup}
                onChange={e => setForm(prev => ({ ...prev, esPopup: e.target.checked }))}
              />
              🔔 Activar como popup
            </label>
            {form.esPopup && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: '#6b635a', display: 'block', marginBottom: 4 }}>Imagen del popup (si no se sube, usa la imagen del evento)</label>
                  <input type="file" accept="image/*" onChange={handlePopupImage} />
                  {uploadingPopup && <p style={{ fontSize: 13, color: '#6b635a' }}>Subiendo imagen…</p>}
                  {form.popupImagen && (
                    <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                      <img src={form.popupImagen} alt="popup preview" style={{ maxWidth: 200, borderRadius: 6 }} />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, popupImagen: '' }))}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#c62828', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}
                      >✕</button>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#6b635a', display: 'block', marginBottom: 4 }}>Texto del botón</label>
                  <input
                    type="text"
                    placeholder="Ej: Reservar mesa"
                    value={form.ctaTexto}
                    onChange={e => setForm(prev => ({ ...prev, ctaTexto: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d5cdc4', borderRadius: 6, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#6b635a', display: 'block', marginBottom: 4 }}>Link del botón</label>
                  <input
                    type="text"
                    placeholder="Ej: /reserva-mesas"
                    value={form.ctaLink}
                    onChange={e => setForm(prev => ({ ...prev, ctaLink: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d5cdc4', borderRadius: 6, fontSize: 14 }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="cal-form__actions">
            <button className="btn-action" onClick={guardar} disabled={uploading}>
              {editando ? 'Guardar cambios' : 'Crear evento'}
            </button>
            <button className="btn-action btn-action--outline" onClick={resetForm}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de eventos */}
      {cargando ? (
        <p style={{ color: '#6b635a', textAlign: 'center', padding: 40 }}>Cargando eventos…</p>
      ) : eventos.length === 0 ? (
        <p style={{ color: '#6b635a', textAlign: 'center', padding: 40 }}>No hay eventos creados aún.</p>
      ) : (
        <>
          {proximos.length > 0 && (
            <>
              <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 22, fontWeight: 400, margin: '28px 0 12px' }}>
                Próximos eventos
              </h3>
              <div className="items-grid">
                {proximos.map(ev => (
                  <div key={ev.id} className="item-card">
                    {ev.imagen && (
                      <img src={ev.imagen} alt={ev.titulo} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '4px 4px 0 0' }} />
                    )}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{ev.titulo}</h4>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: ev.visible ? '#e8f5e9' : '#fce4ec',
                          color: ev.visible ? '#2e7d32' : '#c62828',
                          whiteSpace: 'nowrap'
                        }}>
                          {ev.visible ? 'Visible' : 'Oculto'}
                        </span>
                        {ev.esPopup && (
                          <span style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: '#fff3e0',
                            color: '#e65100',
                            whiteSpace: 'nowrap'
                          }}>
                            🔔 Popup
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b635a' }}>
                        📅 {formatFecha(ev.fecha)}
                        {ev.horaInicio && ` · ${ev.horaInicio}`}
                        {ev.horaFin && ` – ${ev.horaFin}`}
                      </p>
                      {ev.descripcion && (
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8a8279', lineHeight: 1.4 }}>
                          {ev.descripcion.length > 100 ? ev.descripcion.slice(0, 100) + '…' : ev.descripcion}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn-action btn-action--small" onClick={() => editar(ev)}>Editar</button>
                        <button className="btn-action btn-action--small btn-action--outline" onClick={() => toggleVisible(ev)}>
                          {ev.visible ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button className="btn-action btn-action--small btn-action--danger" onClick={() => eliminar(ev.id)}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pasados.length > 0 && (
            <>
              <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 22, fontWeight: 400, margin: '28px 0 12px', color: '#8a8279' }}>
                Eventos pasados
              </h3>
              <div className="items-grid">
                {pasados.map(ev => (
                  <div key={ev.id} className="item-card" style={{ opacity: 0.6 }}>
                    <div style={{ padding: '12px 16px' }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{ev.titulo}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b635a' }}>
                        📅 {formatFecha(ev.fecha)}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn-action btn-action--small btn-action--danger" onClick={() => eliminar(ev.id)}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default EventosTab;
