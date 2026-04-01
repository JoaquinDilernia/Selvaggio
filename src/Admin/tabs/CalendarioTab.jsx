import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const HORARIOS_BASE = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
const HORARIOS_EXTENDIDOS = [...HORARIOS_BASE, '22:30','23:00','23:30','00:00','00:30','01:00','01:30','02:00'];

function CalendarioTab() {
  const [excepciones, setExcepciones] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  // Form para nueva excepción
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fecha: '',
    tipo: 'abrir', // 'abrir' o 'cerrar'
    motivo: '',
    horarioTipo: 'normal', // 'normal', 'extendido', 'personalizado'
    horariosCustom: []
  });

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const [excSnap, evSnap] = await Promise.all([
        getDocs(collection(db, 'selvaggio_calendario')),
        getDocs(collection(db, 'selvaggio_eventos'))
      ]);
      setExcepciones(excSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error cargando calendario:', err);
    } finally {
      setCargando(false);
    }
  };

  const guardar = async () => {
    if (!form.fecha) return;
    const id = form.fecha; // Usamos la fecha como ID
    const data = {
      fecha: form.fecha,
      tipo: form.tipo,
      motivo: form.motivo || '',
      creadoEn: new Date().toISOString()
    };

    if (form.tipo === 'abrir') {
      if (form.horarioTipo === 'normal') {
        data.horarios = HORARIOS_BASE;
      } else if (form.horarioTipo === 'extendido') {
        data.horarios = HORARIOS_EXTENDIDOS;
      } else {
        data.horarios = form.horariosCustom;
      }
    }

    try {
      await setDoc(doc(db, 'selvaggio_calendario', id), data);
      await cargar();
      setForm({ fecha: '', tipo: 'abrir', motivo: '', horarioTipo: 'normal', horariosCustom: [] });
      setShowForm(false);
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta excepción?')) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_calendario', id));
      setExcepciones(excepciones.filter(e => e.id !== id));
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const toggleHorario = (h) => {
    setForm(prev => ({
      ...prev,
      horariosCustom: prev.horariosCustom.includes(h)
        ? prev.horariosCustom.filter(x => x !== h)
        : [...prev.horariosCustom, h].sort()
    }));
  };

  // Calendario visual
  const generarDias = () => {
    const year = mes.getFullYear();
    const month = mes.getMonth();
    const primerDow = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dias = Array(primerDow).fill(null);

    for (let d = 1; d <= diasEnMes; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(year, month, d);
      const dow = date.getDay();
      const exc = excepciones.find(e => e.fecha === dateStr);
      const esPasado = date < hoy;

      // Lógica: lunes cerrado por defecto, resto abierto
      let estado = dow === 1 ? 'cerrado' : 'abierto';
      if (exc) estado = exc.tipo === 'abrir' ? 'excepcion-abierto' : 'excepcion-cerrado';

      dias.push({ d, dateStr, dow, estado, esPasado, exc });
    }
    return dias;
  };

  const cambiarMes = (delta) => {
    setMes(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const formatFecha = (str) => {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const excepcionesFuturas = excepciones
    .filter(e => new Date(e.fecha + 'T00:00:00') >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const dias = generarDias();

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>📅 Calendario de Apertura</h2>
        <p>Configurá excepciones: abrir días normalmente cerrados o cerrar días que normalmente abrís</p>
      </div>

      {/* Leyenda */}
      <div className="cal-leyenda">
        <span className="cal-leyenda__item"><span className="cal-dot cal-dot--abierto" /> Abierto</span>
        <span className="cal-leyenda__item"><span className="cal-dot cal-dot--cerrado" /> Cerrado (lunes)</span>
        <span className="cal-leyenda__item"><span className="cal-dot cal-dot--exc-abierto" /> Excepción: abierto</span>
        <span className="cal-leyenda__item"><span className="cal-dot cal-dot--exc-cerrado" /> Excepción: cerrado</span>
        <span className="cal-leyenda__item">🎉 Evento</span>
      </div>

      {/* Calendario */}
      <div className="cal-wrap">
        <div className="cal-nav">
          <button className="cal-nav__btn" onClick={() => cambiarMes(-1)}>←</button>
          <span className="cal-nav__mes">
            {mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
          <button className="cal-nav__btn" onClick={() => cambiarMes(1)}>→</button>
        </div>

        <div className="cal-grid">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="cal-cell cal-cell--header">{d}</div>
          ))}
          {dias.map((dia, i) => {
            if (!dia) return <div key={`e-${i}`} className="cal-cell cal-cell--empty" />;
            const clases = [
              'cal-cell',
              `cal-cell--${dia.estado}`,
              dia.esPasado && 'cal-cell--pasado'
            ].filter(Boolean).join(' ');
            return (
              <div
                key={dia.dateStr}
                className={clases}
                onClick={() => {
                  if (dia.esPasado) return;
                  if (dia.exc) {
                    if (window.confirm(`¿Eliminar excepción del ${formatFecha(dia.dateStr)}?`)) {
                      eliminar(dia.dateStr);
                    }
                  } else {
                    setForm(prev => ({
                      ...prev,
                      fecha: dia.dateStr,
                      tipo: dia.dow === 1 ? 'abrir' : 'cerrar'
                    }));
                    setShowForm(true);
                  }
                }}
                title={dia.exc ? `${dia.exc.tipo === 'abrir' ? 'Abierto' : 'Cerrado'}: ${dia.exc.motivo || 'sin motivo'}` : DIAS_SEMANA[dia.dow]}
              >
                <span className="cal-cell__num">{dia.d}</span>
                {dia.exc && <span className="cal-cell__badge">{dia.exc.tipo === 'abrir' ? '✓' : '✕'}</span>}
                {eventos.find(ev => ev.fecha === dia.dateStr) && (
                  <span className="cal-cell__evento" title={eventos.find(ev => ev.fecha === dia.dateStr).titulo}>🎉</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón agregar */}
      {!showForm && (
        <button className="btn-action" style={{ marginTop: 20 }} onClick={() => setShowForm(true)}>
          + Agregar excepción
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="cal-form">
          <h3 className="cal-form__title">
            {form.tipo === 'abrir' ? '🟢 Abrir día especial' : '🔴 Cerrar día'}
          </h3>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="cal-form__field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}>
                <option value="abrir">Abrir (día normalmente cerrado)</option>
                <option value="cerrar">Cerrar (día normalmente abierto)</option>
              </select>
            </div>
          </div>

          <div className="cal-form__field">
            <label>Motivo (opcional)</label>
            <input
              type="text"
              value={form.motivo}
              onChange={e => setForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Feriado, evento especial, mantenimiento..."
            />
          </div>

          {form.tipo === 'abrir' && (
            <div className="cal-form__field">
              <label>Horarios</label>
              <div className="cal-form__horarios-opts">
                <label className="cal-radio">
                  <input type="radio" name="horarioTipo" value="normal" checked={form.horarioTipo === 'normal'}
                    onChange={() => setForm(prev => ({ ...prev, horarioTipo: 'normal' }))} />
                  Normal (18:00 – 22:00)
                </label>
                <label className="cal-radio">
                  <input type="radio" name="horarioTipo" value="extendido" checked={form.horarioTipo === 'extendido'}
                    onChange={() => setForm(prev => ({ ...prev, horarioTipo: 'extendido' }))} />
                  Extendido (18:00 – 02:00)
                </label>
                <label className="cal-radio">
                  <input type="radio" name="horarioTipo" value="personalizado" checked={form.horarioTipo === 'personalizado'}
                    onChange={() => setForm(prev => ({ ...prev, horarioTipo: 'personalizado' }))} />
                  Personalizado
                </label>
              </div>

              {form.horarioTipo === 'personalizado' && (
                <div className="cal-chips-grid">
                  {HORARIOS_EXTENDIDOS.map(h => (
                    <button
                      key={h}
                      type="button"
                      className={`cal-chip${form.horariosCustom.includes(h) ? ' cal-chip--on' : ''}`}
                      onClick={() => toggleHorario(h)}
                    >{h}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="cal-form__actions">
            <button className="btn-action" onClick={guardar}>Guardar</button>
            <button className="btn-action" style={{ background: 'transparent', color: '#1c1a17', border: '1px solid rgba(28,26,23,0.2)' }}
              onClick={() => { setShowForm(false); setForm({ fecha: '', tipo: 'abrir', motivo: '', horarioTipo: 'normal', horariosCustom: [] }); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de excepciones activas */}
      {excepcionesFuturas.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 22, fontWeight: 400, margin: '32px 0 16px' }}>
            Excepciones activas
          </h3>
          <div className="items-grid">
            {excepcionesFuturas.map(exc => (
              <div key={exc.id} className="item-card" style={{ borderLeftColor: exc.tipo === 'abrir' ? '#27ae60' : '#c0392b' }}>
                <div className="item-header">
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{formatFecha(exc.fecha)}</span>
                  <button className="btn-delete" onClick={() => eliminar(exc.id)}>✕</button>
                </div>
                <div className="item-body">
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 3, fontSize: 12, fontWeight: 600,
                      background: exc.tipo === 'abrir' ? '#e8f5e9' : '#fbe9e7',
                      color: exc.tipo === 'abrir' ? '#2e7d32' : '#c62828'
                    }}>
                      {exc.tipo === 'abrir' ? 'ABIERTO' : 'CERRADO'}
                    </span>
                  </div>
                  {exc.motivo && <div style={{ color: '#6b635a', fontSize: 14 }}>{exc.motivo}</div>}
                  {exc.tipo === 'abrir' && exc.horarios && (
                    <div style={{ fontSize: 13, color: '#a09890' }}>
                      Horarios: {exc.horarios[0]} – {exc.horarios[exc.horarios.length - 1]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {cargando && <p style={{ textAlign: 'center', color: '#a09890', marginTop: 30 }}>Cargando...</p>}
    </div>
  );
}

export default CalendarioTab;
