import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { prepararImagen, METADATA_CACHE } from '../../utils/subirArchivos';
import { db, storage } from '../../firebase/config';
import { authFetch, BASE_URL } from '../../../lib/api';

const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const FORM_VACIO = {
  titulo: '', fecha: '', horaInicio: '', horaFin: '', descripcion: '', infoBot: '', imagen: '',
  visible: true, esPopup: false, popupImagen: '', ctaTexto: '', ctaLink: '',
  repite: '', hasta: '', esPago: '', precio: '', sena: '', alias: '',
};
// '' = sin dato (eventos viejos), 'si' / 'no'
const esPagoDe = (v) => (v === true ? 'si' : v === false ? 'no' : '');
const esPagoA = (v) => (v === 'si' ? true : v === 'no' ? false : null);

async function apiFijos(path = '', options = {}) {
  const res = await authFetch(`${BASE_URL}/api/eventos-fijos${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// Eventos sueltos: se guardan por el server para que quede quién hizo cada
// cambio y lo borrado vaya a la papelera.
async function apiEventos(path = '', options = {}) {
  const res = await authFetch(`${BASE_URL}/api/eventos${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const ACCION = { creado: 'creó', editado: 'editó', eliminado: 'eliminó', restaurado: 'restauró', ocultado: 'ocultó', mostrado: 'mostró' };

// "Creado por Cielo · 25 nov 12:37 · editado por Brisa · 26 nov 10:02"
function Autoria({ ev }) {
  const partes = [];
  if (ev.creadoPor?.nombre) partes.push(`Creado por ${ev.creadoPor.nombre}${ev.creadoEn ? ` · ${fechaHora(ev.creadoEn)}` : ''}`);
  if (ev.editadoPor?.nombre) partes.push(`editado por ${ev.editadoPor.nombre}${ev.actualizadoEn ? ` · ${fechaHora(ev.actualizadoEn)}` : ''}`);
  if (ev.restauradoPor?.nombre) partes.push(`restaurado por ${ev.restauradoPor.nombre}`);
  if (!partes.length) return null;
  return <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#9a9187' }}>{partes.join(' · ')}</p>;
}
import './TabsShared.css';

function EventosTab() {
  const [eventos, setEventos] = useState([]);
  const [series, setSeries] = useState([]);
  const [editandoSerie, setEditandoSerie] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [uploadingPopup, setUploadingPopup] = useState(false);
  const [verPapelera, setVerPapelera] = useState(false);
  const [papelera, setPapelera] = useState(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [historial, setHistorial] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const [snap, fijos] = await Promise.all([
        getDocs(collection(db, 'selvaggio_eventos')),
        apiFijos().catch(err => { console.error('Error cargando eventos fijos:', err); return { series: [] }; }),
      ]);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      setEventos(items);
      setSeries(fijos.series ?? []);
      if (verPapelera) cargarPapelera();
      if (verHistorial) cargarHistorial();
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setCargando(false);
    }
  };

  const cargarPapelera = async () => {
    try {
      setPapelera((await apiEventos('/papelera')).papelera ?? []);
    } catch (err) {
      alert(`No se pudo abrir la papelera: ${err.message}`);
    }
  };

  const cargarHistorial = async () => {
    try {
      setHistorial((await apiEventos('/historial?limite=100')).historial ?? []);
    } catch (err) {
      alert(`No se pudo abrir el historial: ${err.message}`);
    }
  };

  const restaurar = async (item) => {
    if (!window.confirm(`¿Restaurar "${item.titulo}"${item.fecha ? ` del ${formatFecha(item.fecha)}` : ''}?`)) return;
    try {
      await apiEventos(`/papelera/${item.id}/restaurar`, { method: 'POST' });
      await cargar();
      await cargarPapelera();
    } catch (err) {
      alert(`No se pudo restaurar: ${err.message}`);
    }
  };

  const resetForm = () => {
    setForm(FORM_VACIO);
    setEditando(null);
    setEditandoSerie(null);
    setShowForm(false);
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const imagen = await prepararImagen(file);
      const storageRef = ref(storage, `selvaggio/eventos/${Date.now()}_${imagen.name}`);
      await uploadBytes(storageRef, imagen, METADATA_CACHE);
      const url = await getDownloadURL(storageRef);
      setForm(prev => ({ ...prev, imagen: url }));
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      alert(`Error al subir la imagen: ${err.code || err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePopupImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPopup(true);
    try {
      const imagen = await prepararImagen(file);
      const storageRef = ref(storage, `selvaggio/eventos/popup_${Date.now()}_${imagen.name}`);
      await uploadBytes(storageRef, imagen, METADATA_CACHE);
      const url = await getDownloadURL(storageRef);
      setForm(prev => ({ ...prev, popupImagen: url }));
    } catch (err) {
      console.error('Error subiendo imagen popup:', err);
      alert(`Error al subir la imagen del popup: ${err.code || err.message || err}`);
    } finally {
      setUploadingPopup(false);
    }
  };

  const guardar = async () => {
    const esSerie = form.repite !== '';
    if (!form.titulo || (!esSerie && !form.fecha)) {
      alert(esSerie ? 'Completá al menos el título' : 'Completá al menos título y fecha');
      return;
    }
    if (form.esPago === 'si' && !form.precio.trim()) {
      alert('Si el evento es pago, cargá el precio');
      return;
    }
    const pago = {
      esPago: esPagoA(form.esPago),
      precio: form.esPago === 'si' ? form.precio.trim() : '',
      sena: form.esPago === 'si' ? form.sena.trim() : '',
      alias: form.esPago === 'si' ? form.alias.trim() : '',
    };
    if (esSerie) {
      setGuardando(true);
      try {
        const body = {
          titulo: form.titulo, diaSemana: Number(form.repite), desde: form.fecha || '', hasta: form.hasta || '',
          horaInicio: form.horaInicio || '', horaFin: form.horaFin || '', descripcion: form.descripcion || '',
          infoBot: form.infoBot || '', imagen: form.imagen || '', ctaTexto: form.ctaTexto || '', ctaLink: form.ctaLink || '',
          visible: form.visible, ...pago,
        };
        await apiFijos(editandoSerie ? `/${editandoSerie}` : '', { method: editandoSerie ? 'PUT' : 'POST', body });
        await cargar();
        resetForm();
      } catch (err) {
        alert(`No se pudo guardar el evento fijo: ${err.message}`);
      } finally {
        setGuardando(false);
      }
      return;
    }
    setGuardando(true);
    try {
      const data = {
        ...pago,
        titulo: form.titulo,
        fecha: form.fecha,
        horaInicio: form.horaInicio || '',
        horaFin: form.horaFin || '',
        descripcion: form.descripcion || '',
        infoBot: form.infoBot || '',
        imagen: form.imagen || '',
        visible: form.visible,
        esPopup: form.esPopup || false,
        popupImagen: form.popupImagen || '',
        ctaTexto: form.ctaTexto || '',
        ctaLink: form.ctaLink || '',
      };
      // El server desactiva el popup de los otros eventos y, si es una fecha
      // de un evento fijo, la marca como editada a mano.
      await apiEventos(editando ? `/${editando}` : '', { method: editando ? 'PUT' : 'POST', body: data });
      await cargar();
      resetForm();
    } catch (err) {
      console.error('Error guardando evento:', err);
      alert(`No se pudo guardar el evento: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const editar = (ev) => {
    setForm({
      titulo: ev.titulo || '',
      fecha: ev.fecha || '',
      horaInicio: ev.horaInicio || '',
      horaFin: ev.horaFin || '',
      descripcion: ev.descripcion || '',
      infoBot: ev.infoBot || '',
      imagen: ev.imagen || '',
      visible: ev.visible !== false,
      esPopup: ev.esPopup || false,
      popupImagen: ev.popupImagen || '',
      ctaTexto: ev.ctaTexto || '',
      ctaLink: ev.ctaLink || '',
      repite: '', hasta: '',
      esPago: esPagoDe(ev.esPago), precio: ev.precio || '', sena: ev.sena || '', alias: ev.alias || '',
    });
    setEditando(ev.id);
    setEditandoSerie(null);
    setShowForm(true);
  };

  const editarSerie = (s) => {
    setForm({
      ...FORM_VACIO,
      titulo: s.titulo || '', fecha: s.desde || '', hasta: s.hasta || '', repite: String(s.diaSemana),
      horaInicio: s.horaInicio || '', horaFin: s.horaFin || '', descripcion: s.descripcion || '',
      infoBot: s.infoBot || '', imagen: s.imagen || '', visible: s.visible !== false,
      ctaTexto: s.ctaTexto || '', ctaLink: s.ctaLink || '',
      esPago: esPagoDe(s.esPago), precio: s.precio || '', sena: s.sena || '', alias: s.alias || '',
    });
    setEditandoSerie(s.id);
    setEditando(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarSerie = async (s) => {
    if (!window.confirm(`¿Eliminar el evento fijo "${s.titulo}"? Se borran también sus próximas fechas (las que editaste a mano quedan).`)) return;
    try {
      await apiFijos(`/${s.id}`, { method: 'DELETE' });
      await cargar();
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`);
    }
  };

  const eliminar = async (id) => {
    const ev = eventos.find(e => e.id === id);
    if (ev?.serieId && series.some(s => s.id === ev.serieId)) {
      if (!window.confirm(`¿Sacar el ${formatFecha(ev.fecha)}? Solo esa fecha: el evento fijo sigue las demás semanas.`)) return;
      try {
        await apiFijos(`/${ev.serieId}/excluir`, { method: 'POST', body: { fecha: ev.fecha, eventoId: ev.id } });
        setEventos(eventos.filter(e => e.id !== id));
      } catch (err) {
        alert(`No se pudo sacar la fecha: ${err.message}`);
      }
      return;
    }
    if (!window.confirm('¿Eliminar este evento? Va a la papelera: se puede restaurar.')) return;
    try {
      await apiEventos(`/${id}`, { method: 'DELETE' });
      setEventos(eventos.filter(e => e.id !== id));
      if (verPapelera) cargarPapelera();
      if (verHistorial) cargarHistorial();
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`);
    }
  };

  const toggleVisible = async (ev) => {
    try {
      await apiEventos(`/${ev.id}`, { method: 'PUT', body: { visible: !ev.visible } });
      setEventos(eventos.map(e => e.id === ev.id ? { ...e, visible: !e.visible } : e));
    } catch (err) {
      alert(`No se pudo actualizar: ${err.message}`);
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!showForm && (
          <button className="btn-action" onClick={() => setShowForm(true)}>
            + Nuevo evento
          </button>
        )}
        <button
          className="btn-action btn-action--outline"
          onClick={() => { const v = !verPapelera; setVerPapelera(v); if (v) cargarPapelera(); }}
        >
          🗑 Papelera{papelera?.length ? ` (${papelera.length})` : ''}
        </button>
        <button
          className="btn-action btn-action--outline"
          onClick={() => { const v = !verHistorial; setVerHistorial(v); if (v) cargarHistorial(); }}
        >
          🕓 Historial de cambios
        </button>
      </div>

      {verPapelera && (
        <div className="cal-form" style={{ margin: '16px 0 24px' }}>
          <h3 className="cal-form__title">🗑 Papelera</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b635a' }}>
            Los eventos eliminados quedan acá y se pueden restaurar. También aparecen los que se borraron por fuera del panel.
          </p>
          {papelera === null ? (
            <p style={{ color: '#6b635a' }}>Cargando…</p>
          ) : papelera.length === 0 ? (
            <p style={{ color: '#6b635a' }}>La papelera está vacía.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {papelera.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #e8e2d9', borderRadius: 6, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.titulo || '(sin título)'}</div>
                    <div style={{ fontSize: 12.5, color: '#6b635a' }}>
                      {item.fecha ? `📅 ${formatFecha(item.fecha)} · ` : ''}
                      Eliminado por {item.eliminadoPor?.nombre ?? '—'} · {fechaHora(item.eliminadoEn)}
                    </div>
                  </div>
                  <button className="btn-action btn-action--small" onClick={() => restaurar(item)}>Restaurar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {verHistorial && (
        <div className="cal-form" style={{ margin: '16px 0 24px' }}>
          <h3 className="cal-form__title">🕓 Historial de cambios</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b635a' }}>
            Quién creó, editó, ocultó o eliminó cada evento (últimos 100 cambios).
          </p>
          {historial === null ? (
            <p style={{ color: '#6b635a' }}>Cargando…</p>
          ) : historial.length === 0 ? (
            <p style={{ color: '#6b635a' }}>Todavía no hay cambios registrados.</p>
          ) : (
            <div style={{ display: 'grid', gap: 2, fontSize: 13 }}>
              {historial.map(h => (
                <div key={h.id} style={{ padding: '7px 0', borderBottom: '1px solid #f0ebe3', color: h.origen === 'externo' ? '#b4532a' : '#3d3730' }}>
                  <span style={{ color: '#9a9187' }}>{fechaHora(h.en)}</span>
                  {' · '}<strong>{h.por?.nombre ?? '—'}</strong> {ACCION[h.accion] ?? h.accion}{' '}
                  "{h.titulo || '(sin título)'}"{h.fecha && !String(h.eventoId).startsWith('serie:') ? ` del ${formatFecha(h.fecha)}` : ''}
                  {h.detalle && <span style={{ color: '#8a8279' }}> — {h.detalle}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="cal-form" style={{ marginBottom: 28 }}>
          <h3 className="cal-form__title">
            {editandoSerie ? '✏️ Editar evento fijo' : editando ? '✏️ Editar evento' : '🆕 Nuevo evento'}
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

          {!editando && (
            <div className="cal-form__row">
              <div className="cal-form__field">
                <label>🔁 Se repite</label>
                <select
                  value={form.repite}
                  onChange={e => setForm(prev => ({ ...prev, repite: e.target.value, esPopup: e.target.value !== '' ? false : prev.esPopup }))}
                >
                  <option value="">No, es una sola fecha</option>
                  {DIAS.map((d, i) => <option key={i} value={String(i)}>Todos los {d}</option>)}
                </select>
              </div>
              {form.repite !== '' && (
                <div className="cal-form__field">
                  <label>Hasta (opcional)</label>
                  <input
                    type="date"
                    value={form.hasta}
                    onChange={e => setForm(prev => ({ ...prev, hasta: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}
          {editando && eventos.find(e => e.id === editando)?.serieId && (
            <p style={{ fontSize: 13, color: '#8a5a00', background: '#fdf6ee', padding: '8px 12px', borderRadius: 6, margin: '0 0 12px' }}>
              🔁 Esta es una fecha de un evento fijo. Si la guardás, queda separada: los cambios que hagas después en el evento fijo (precio, seña, alias, horario) ya no se aplican a este día. Para cambiar todas las semanas, editá el evento fijo.
            </p>
          )}

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>{form.repite !== '' ? 'Desde' : 'Fecha *'}</label>
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
            <label>🤖 Info para el bot (no se muestra en la web)</label>
            <textarea
              value={form.infoBot}
              onChange={e => setForm(prev => ({ ...prev, infoBot: e.target.value }))}
              rows="4"
              placeholder="Precio, qué incluye, menú, opciones sin TACC/veggie, cupo, políticas, preguntas frecuentes…"
            />
            <p style={{ fontSize: 12, color: '#8a8279', margin: '4px 0 0' }}>
              El bot de WhatsApp e Instagram usa esto para responder sobre el evento. El cliente no lo ve en la web.
            </p>
          </div>

          {/* Pago: el bot le pasa al cliente precio, seña y alias */}
          <div className="cal-form__field" style={{ background: form.esPago === 'si' ? '#f3f7ee' : 'transparent', padding: form.esPago === 'si' ? 16 : 0, borderRadius: 8 }}>
            <label>💲 ¿Es pago?</label>
            <select value={form.esPago} onChange={e => setForm(prev => ({ ...prev, esPago: e.target.value }))}>
              <option value="">Sin especificar</option>
              <option value="no">No, es gratis</option>
              <option value="si">Sí, es pago</option>
            </select>
            {form.esPago === 'si' && (
              <div className="cal-form__row" style={{ marginTop: 12 }}>
                <div className="cal-form__field">
                  <label>Precio *</label>
                  <input type="text" value={form.precio} placeholder="Ej: $25.000 por persona"
                    onChange={e => setForm(prev => ({ ...prev, precio: e.target.value }))} />
                </div>
                <div className="cal-form__field">
                  <label>Seña (opcional)</label>
                  <input type="text" value={form.sena} placeholder="Ej: $10.000 por persona"
                    onChange={e => setForm(prev => ({ ...prev, sena: e.target.value }))} />
                </div>
                <div className="cal-form__field">
                  <label>Alias para la seña</label>
                  <input type="text" value={form.alias} placeholder="Ej: selvaggio.vinos"
                    onChange={e => setForm(prev => ({ ...prev, alias: e.target.value }))} />
                </div>
              </div>
            )}
            <p style={{ fontSize: 12, color: '#8a8279', margin: '4px 0 0' }}>
              El bot usa esto para decir si es gratis o cuánto sale, y a qué alias pasar la seña.
            </p>
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

          {/* Configuración de popup (solo eventos de una fecha) */}
          {form.repite === '' && (<div className="cal-form__field" style={{ background: form.esPopup ? '#fdf6ee' : 'transparent', padding: form.esPopup ? 16 : 0, borderRadius: 8, transition: 'all 0.3s' }}>
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
          </div>)}

          <div className="cal-form__actions">
            <button className="btn-action" onClick={guardar} disabled={uploading || guardando}>
              {guardando ? 'Guardando…' : (editando || editandoSerie) ? 'Guardar cambios' : form.repite !== '' ? 'Crear evento fijo' : 'Crear evento'}
            </button>
            <button className="btn-action btn-action--outline" onClick={resetForm}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Eventos fijos */}
      {series.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 22, fontWeight: 400, margin: '28px 0 12px' }}>
            🔁 Eventos fijos
          </h3>
          <div className="items-grid">
            {series.map(s => (
              <div key={s.id} className="item-card">
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{s.titulo}</h4>
                    {s.activo === false && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fce4ec', color: '#c62828' }}>Pausado</span>}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b635a' }}>
                    🔁 Todos los {DIAS[s.diaSemana]}
                    {s.horaInicio && ` · ${s.horaInicio}`}
                    {s.horaFin && ` – ${s.horaFin}`}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8a8279' }}>
                    {s.hasta ? `Hasta el ${formatFecha(s.hasta)}` : 'Sin fecha de fin'}
                    {s.esPago === true ? ` · 💲 ${s.precio}` : s.esPago === false ? ' · Gratis' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn-action btn-action--small" onClick={() => editarSerie(s)}>Editar</button>
                    <button className="btn-action btn-action--small btn-action--danger" onClick={() => eliminarSerie(s)}>Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lista de eventos */}
      {cargando ? (
        <p style={{ color: '#6b635a', textAlign: 'center', padding: 40 }}>Cargando eventos…</p>
      ) : eventos.length === 0 && series.length === 0 ? (
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
                        {ev.serieId && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#ede7f6', color: '#4527a0', whiteSpace: 'nowrap' }}>
                            🔁 Fijo
                          </span>
                        )}
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
                      <Autoria ev={ev} />
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
                      <Autoria ev={ev} />
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
