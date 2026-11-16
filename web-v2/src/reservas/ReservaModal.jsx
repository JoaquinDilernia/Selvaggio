import { useEffect, useMemo, useRef, useState } from 'react';
import { api, pesos, EN_PRUEBA, waLink } from '../api.js';

// Formulario de reservas del diseño (initReserva) en React, conectado al
// sistema: mesas con cupo real, eventos de la agenda del admin y La Cava con
// días ocupados, precio y seña de Gestión → Capacidad. Usa las clases rv-* del
// diseño (styles/design.css).

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TABS = [['mesa', 'Mesa'], ['evento', 'Evento'], ['cava', 'La Cava']];
const CABECERA = {
  mesa: ['Reservá tu mesa', 'Martes a domingo desde las 18 hs.'],
  evento: ['Sumate a un evento', 'Elegí el evento de la agenda y reservá tu lugar.'],
  cava: ['Reservá La Cava', 'Salón privado para eventos, cumpleaños y celebraciones.'],
};
// Cuenta de Selvaggio (la misma que muestra la web actual para la seña de La Cava).
const BANCO = [
  ['Banco', 'Banco Santander'],
  ['Cuenta', 'Caja de ahorro en pesos 519-355143/7'],
  ['CBU', '0720519488000035514372'],
  ['Alias', 'selvaggioba'],
  ['Titular', 'Tomas Laureano Molina'],
  ['CUIT', '20-42200145-0'],
];
const MAX_EVENTO = 20;
const MAX_ARCHIVO = 10 * 1024 * 1024;

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const larga = (s) => { const d = deIso(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const corta = (s) => { const d = deIso(s); return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`; };
const hoyIso = () => iso(new Date());
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Precio y seña de un evento pago. El admin los carga como texto libre
 * ("50000", "$45.000", "50% del total"): si se pueden leer, se calcula el
 * total; si no, se muestra el texto tal cual.
 */
function pagoEvento(ev, personas) {
  if (!ev || ev.esPago !== true) return null;
  const num = (t) => { const d = String(t ?? '').replace(/\D/g, ''); return d ? Number(d) : null; };
  const precio = /%/.test(ev.precio || '') ? null : num(ev.precio);
  const total = precio ? precio * personas : null;
  const pct = /(\d+(?:[.,]\d+)?)\s*%/.exec(ev.sena || '');
  let sena = null;
  if (pct && total) sena = Math.round(total * Number(pct[1].replace(',', '.')) / 100);
  else if (!pct && num(ev.sena)) sena = num(ev.sena);
  return { precio, total, sena, senaTexto: ev.sena || '', precioTexto: ev.precio || '' };
}

function Campo({ label, req, children, className = '' }) {
  return (
    <div className={`rv-field ${className}`}>
      <span className="rv-lbl">{label}{req && <> <b>*</b></>}</span>
      {children}
    </div>
  );
}

function Chips({ opciones, valor, onChange, multi = false, deshabilitadas = new Set() }) {
  return (
    <div className="rv-chips">
      {opciones.map(o => {
        const v = typeof o === 'string' ? o : o.v;
        const label = typeof o === 'string' ? o : o.label;
        const on = multi ? valor.includes(v) : valor === v;
        const off = deshabilitadas.has(v);
        return (
          <button
            key={v} type="button" className="rv-chip" aria-pressed={on} disabled={off}
            onClick={() => onChange(multi ? (on ? valor.filter(x => x !== v) : [...valor, v]) : v)}
          >{label}</button>
        );
      })}
    </div>
  );
}

function Calendario({ fecha, onElegir, mes, setMes, tomadas = new Set(), cava = false }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const y = mes.getFullYear(); const mo = mes.getMonth();
  const primero = new Date(y, mo, 1).getDay();
  const dias = new Date(y, mo + 1, 0).getDate();
  const esEsteMes = y === hoy.getFullYear() && mo === hoy.getMonth();
  const celdas = [];
  for (let i = 0; i < primero; i++) celdas.push(<span key={`v${i}`} />);
  for (let d = 1; d <= dias; d++) {
    const dt = new Date(y, mo, d); const k = iso(dt);
    const pasado = dt < hoy; const lunes = dt.getDay() === 1; const tomada = tomadas.has(k);
    celdas.push(
      <button
        key={k} type="button" disabled={pasado || lunes || tomada}
        className={`rv-day${tomada ? ' rv-taken' : ''}${fecha === k ? ' rv-sel' : ''}`}
        aria-label={`${larga(k)}${tomada ? ', reservado' : lunes ? ', cerrado' : ''}`}
        aria-pressed={fecha === k}
        onClick={() => onElegir(k)}
      >{d}</button>,
    );
  }
  return (
    <div className="rv-cal">
      <div className="rv-calhead">
        <button type="button" aria-label="Mes anterior" disabled={esEsteMes} onClick={() => setMes(new Date(y, mo - 1, 1))}>‹</button>
        <span>{MESES[mo].charAt(0).toUpperCase() + MESES[mo].slice(1)} {y}</span>
        <button type="button" aria-label="Mes siguiente" onClick={() => setMes(new Date(y, mo + 1, 1))}>›</button>
      </div>
      <div className="rv-calgrid">
        {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(d => <span key={d} className="rv-dow">{d}</span>)}
        {celdas}
      </div>
      <div className="rv-legend">
        <span><i className="rv-dot" />Disponible</span>
        {cava ? <span><i className="rv-dot rv-dt" />Reservado</span> : <span>Lunes cerrado</span>}
        <span><i className="rv-dot rv-ds" />Seleccionado</span>
      </div>
    </div>
  );
}

export default function ReservaModal({ tipo: tipoInicial = 'mesa', onClose }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [cfg, setCfg] = useState(null);
  const [eventos, setEventos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [datos, setDatos] = useState({ nombre: '', apellido: '', email: '', telefono: '', nacimiento: '' });
  const [pers, setPers] = useState(2);
  const [fecha, setFecha] = useState('');
  const [mes, setMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const [hora, setHora] = useState('');
  const [zona, setZona] = useState('');
  const [evId, setEvId] = useState('');
  const [torta, setTorta] = useState(false);
  const [extras, setExtras] = useState([]);
  const [notas, setNotas] = useState('');
  const [restr, setRestr] = useState('');
  const [comp, setComp] = useState(null);
  const [disp, setDisp] = useState(null); // disponibilidad de mesas del día elegido
  const [tomadas, setTomadas] = useState(new Set());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(null);
  const caja = useRef(null);

  // Config de capacidad y agenda: una vez al abrir.
  useEffect(() => {
    let vivo = true;
    Promise.all([api.configReservas(), api.eventos()])
      .then(([c, e]) => { if (vivo) { setCfg(c); setEventos(e.eventos ?? []); } })
      .catch(e => { if (vivo) setErrorCarga(e.message); });
    return () => { vivo = false; };
  }, []);

  // Escape cierra; el fondo no scrollea mientras está abierto.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = antes; };
  }, [onClose]);

  const limites = useMemo(() => {
    if (tipo === 'cava') return { min: cfg?.cavaMinimo ?? 10, max: cfg?.cavaMaximo ?? 60 };
    if (tipo === 'mesa') return { min: 1, max: cfg?.mesaMaximo ?? 9 };
    return { min: 1, max: MAX_EVENTO };
  }, [tipo, cfg]);

  // Cambio de pestaña: se conservan los datos personales, el resto vuelve a cero.
  function cambiarTipo(t) {
    setTipo(t); setFecha(''); setHora(''); setZona(''); setEvId(''); setTorta(false);
    setExtras([]); setComp(null); setDisp(null); setError('');
    setPers(t === 'cava' ? (cfg?.cavaMinimo ?? 10) : 2);
  }
  useEffect(() => { setPers(p => Math.min(limites.max, Math.max(limites.min, p))); }, [limites]);

  // Mesas: cupo real del día para el tamaño del grupo.
  useEffect(() => {
    if (tipo !== 'mesa' || !fecha) { setDisp(null); return undefined; }
    let vivo = true;
    setDisp({ cargando: true });
    api.disponibilidad(fecha, pers)
      .then(d => { if (vivo) setDisp(d); })
      .catch(e => { if (vivo) setDisp({ error: e.message }); });
    return () => { vivo = false; };
  }, [tipo, fecha, pers]);
  // Si el horario elegido dejó de estar disponible (cambió la cantidad), se suelta.
  useEffect(() => {
    if (hora && disp?.horarios && !disp.horarios.some(h => h.hora === hora && h.disponible)) setHora('');
  }, [disp, hora]);

  // La Cava: días ocupados del mes que se está mirando.
  useEffect(() => {
    if (tipo !== 'cava') return undefined;
    let vivo = true;
    const y = mes.getFullYear(); const m = mes.getMonth();
    api.cavaOcupadas(iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0)))
      .then(r => { if (vivo) setTomadas(prev => new Set([...prev, ...(r.ocupadas ?? [])])); })
      .catch(() => { /* sin datos: el server igual rechaza el día ocupado al confirmar */ });
    return () => { vivo = false; };
  }, [tipo, mes]);

  const ev = eventos?.find(e => e.id === evId) ?? null;
  const pagoEv = tipo === 'evento' ? pagoEvento(ev, pers) : null;
  const extrasCava = cfg?.extrasCava ?? [];
  const totalCava = tipo === 'cava' && cfg
    ? pers * cfg.cavaPrecioPersona + extrasCava.filter(x => extras.includes(x.id)).reduce((s, x) => s + x.precio, 0)
    : 0;
  const paga = tipo === 'cava' || (tipo === 'evento' && ev?.esPago === true);

  const setDato = (k) => (e) => { setDatos(d => ({ ...d, [k]: e.target.value })); setError(''); };

  function resumen() {
    const L = [];
    const p = `${pers} ${pers === 1 ? 'persona' : 'personas'}`;
    if (tipo === 'mesa') L.push(`Mesa para ${pers}${zona ? ` · ${zona}` : ''}`);
    if (tipo === 'evento') L.push(`${ev ? `${ev.titulo} · ${larga(ev.fecha)}${ev.horaInicio ? ` · ${ev.horaInicio} hs` : ''}` : 'Evento sin elegir'} · ${p}`);
    if (tipo === 'cava') L.push(`La Cava para ${pers} personas${torta ? ' · traen torta' : ''}`);
    if (tipo !== 'evento') L.push(`${fecha ? larga(fecha) : 'Fecha sin elegir'}${hora ? ` · ${hora} hs` : ''}`);
    extrasCava.filter(x => extras.includes(x.id)).forEach(x => L.push(`+ ${x.nombre}`));
    if (restr.trim()) L.push(`Restricciones: ${restr.trim()}`);
    return L;
  }
  function lineaTotal() {
    if (tipo === 'cava' && cfg) return `Total: ${pesos(totalCava)} · seña ${pesos(cfg.cavaSena)}`;
    if (tipo === 'evento' && ev) {
      if (ev.esPago !== true) return ev.esPago === false ? 'Evento gratuito · sin seña' : '';
      if (pagoEv?.total) return `Total: ${pesos(pagoEv.total)}${pagoEv.sena ? ` · seña ${pesos(pagoEv.sena)}` : ''}`;
      return `Precio: ${pagoEv?.precioTexto}${pagoEv?.senaTexto ? ` · seña ${pagoEv.senaTexto}` : ''}`;
    }
    return '';
  }

  function faltantes() {
    const f = [];
    if (!datos.nombre.trim()) f.push('nombre');
    if (!datos.apellido.trim()) f.push('apellido');
    if (!EMAIL_RE.test(datos.email.trim())) f.push('email válido');
    if (datos.telefono.replace(/\D/g, '').length < 8) f.push('WhatsApp');
    if (tipo === 'evento' && !ev) f.push('evento');
    if (tipo !== 'evento' && !fecha) f.push('fecha');
    if (tipo !== 'evento' && !hora) f.push('horario');
    if (tipo === 'mesa' && !zona) f.push('ubicación');
    if (paga && !comp) f.push('comprobante de la seña');
    return f;
  }

  async function confirmar() {
    const falta = faltantes();
    if (falta.length) { setError(`Para confirmar falta: ${falta.join(', ')}.`); return; }
    setEnviando(true); setError('');
    const base = {
      nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), email: datos.email.trim(),
      telefono: datos.telefono.trim(), fechaNacimiento: datos.nacimiento, cantidadPersonas: pers,
      restricciones: restr.trim(), comentarios: notas.trim(),
    };
    const form = (extra) => {
      const fd = new FormData();
      Object.entries({ ...base, ...extra }).forEach(([k, v]) => fd.append(k, typeof v === 'string' ? v : JSON.stringify(v)));
      if (comp) fd.append('comprobante', comp);
      return fd;
    };
    try {
      let r;
      if (tipo === 'mesa') r = await api.reservarMesa({ ...base, fecha, horario: hora, preferencia: zona });
      else if (tipo === 'cava') r = await api.reservarCava(form({ fecha, horario: hora, traeTorta: torta, extras }));
      else r = await api.reservarEvento(paga ? form({ eventoId: ev.id }) : { ...base, eventoId: ev.id });
      setListo({ codigo: String(r.id || '').slice(0, 6).toUpperCase(), lineas: resumen(), total: lineaTotal(), paga });
      caja.current?.scrollTo?.({ top: 0 });
    } catch (e) {
      setError(e.message);
      // El día de La Cava se ocupó mientras completaba: se marca y se suelta.
      if (tipo === 'cava' && /ya está reservada/i.test(e.message)) { setTomadas(t => new Set([...t, fecha])); setFecha(''); setHora(''); }
    } finally {
      setEnviando(false);
    }
  }

  function elegirArchivo(e) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_ARCHIVO) { setError('El comprobante pesa más de 10 MB. Probá con una captura o un PDF más liviano.'); setComp(null); return; }
    setError(''); setComp(f);
  }

  const [titulo, sub] = CABECERA[tipo];
  const eventosReservables = (eventos ?? []).filter(e => e.fecha >= hoyIso());

  return (
    <div
      ref={caja} role="dialog" aria-modal="true" aria-label="Reservas"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(21,17,19,.72)', padding: '24px 16px', overflowY: 'auto', display: 'flex' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 760, margin: 'auto', background: '#F7F4EE', boxShadow: '0 30px 80px rgba(0,0,0,.4)' }}>
        <button
          type="button" aria-label="Cerrar" onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, width: 44, height: 44, border: '1px solid rgba(68,10,51,.25)', background: '#FFFFFF', color: '#440A33', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}
        >×</button>
        <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
          {listo ? (
            <div className="rv-done">
              <p className="rv-kicker">Reserva recibida</p>
              <h3 className="rv-title">¡Listo, {datos.nombre.trim().split(' ')[0]}!</h3>
              <p className="rv-sub">
                {listo.paga
                  ? 'Recibimos tu reserva y el comprobante de la seña. El equipo lo valida y te escribe por WhatsApp.'
                  : tipo === 'mesa'
                    ? 'Tu mesa quedó reservada. El mismo día te escribimos por WhatsApp para confirmar.'
                    : 'Tu lugar quedó reservado. ¡Te esperamos!'}
              </p>
              <div className="rv-card rv-sum">
                <p className="rv-sectitle">Código {listo.codigo}</p>
                <p style={{ whiteSpace: 'pre-line', margin: '6px 0 0', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 21, lineHeight: 1.5, color: '#2A0B20' }}>{listo.lineas.join('\n')}</p>
                {listo.total && <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6B1238' }}>{listo.total}</p>}
              </div>
              {EN_PRUEBA && <p className="rv-hint" style={{ marginTop: 14 }}>Versión de prueba: esta reserva no le llega al equipo.</p>}
              <button type="button" className="rv-submit" style={{ marginTop: 22 }} onClick={onClose}>Volver a la web</button>
            </div>
          ) : (
            <>
              <div className="rv-head">
                <p className="rv-kicker">Selvaggio · Reservas</p>
                <h3 className="rv-title">{titulo}</h3>
                <p className="rv-sub">{sub}</p>
              </div>
              <div className="rv-tabs" role="tablist">
                {TABS.map(([t, l]) => (
                  <button key={t} type="button" role="tab" className="rv-tab" aria-selected={t === tipo} onClick={() => cambiarTipo(t)}>{l}</button>
                ))}
              </div>

              {errorCarga && (
                <p className="rv-err" role="alert">
                  {errorCarga} También podés reservar por <a href={waLink('¡Hola! Quiero hacer una reserva.')} target="_blank" rel="noopener noreferrer" style={{ color: '#8E1F4A' }}>WhatsApp</a>.
                </p>
              )}

              {tipo === 'cava' && cfg && (
                <div className="rv-card rv-price">
                  <p className="rv-big">{pesos(cfg.cavaPrecioPersona)} <small>/ persona</small></p>
                  <p>Degustación completa con maridaje libre hasta las 00 hs, panera artesanal y agua.</p>
                  <p className="rv-it">Charcutería premium, quesos curados, conservas y acompañamientos.</p>
                  <span className="rv-pill">Seña de {pesos(cfg.cavaSena)} por transferencia</span>
                </div>
              )}

              <div className="rv-sec">
                <p className="rv-sectitle">Tus datos</p>
                <div className="rv-grid">
                  <Campo label="Nombre" req><input className="rv-in" autoComplete="given-name" placeholder="Tu nombre" value={datos.nombre} onChange={setDato('nombre')} /></Campo>
                  <Campo label="Apellido" req><input className="rv-in" autoComplete="family-name" placeholder="Tu apellido" value={datos.apellido} onChange={setDato('apellido')} /></Campo>
                  <Campo label="Email" req><input className="rv-in" type="email" autoComplete="email" placeholder="tu@email.com" value={datos.email} onChange={setDato('email')} /></Campo>
                  <Campo label="WhatsApp / Teléfono" req><input className="rv-in" type="tel" autoComplete="tel" placeholder="Ej: 11 2345 6789" value={datos.telefono} onChange={setDato('telefono')} /></Campo>
                  <Campo label="Fecha de nacimiento"><input className="rv-in" type="date" value={datos.nacimiento} onChange={setDato('nacimiento')} /></Campo>
                </div>
              </div>

              <div className="rv-sec">
                <p className="rv-sectitle">Tu reserva</p>

                {tipo === 'evento' && (
                  <Campo label="Elegí el evento" req>
                    {eventos === null && !errorCarga && <p className="rv-hint">Cargando la agenda…</p>}
                    {eventos && !eventosReservables.length && (
                      <p className="rv-hint">Por ahora no hay eventos publicados. Seguinos en Instagram o escribinos por <a href={waLink('¡Hola! ¿Qué eventos tienen próximamente?')} target="_blank" rel="noopener noreferrer" style={{ color: '#8E1F4A' }}>WhatsApp</a>.</p>
                    )}
                    <div className="rv-evs">
                      {eventosReservables.map(e => {
                        const pe = pagoEvento(e, 1);
                        const precio = e.esPago === true
                          ? `${pe?.precio ? `${pesos(pe.precio)} por persona` : e.precio}${e.sena ? ` · seña ${e.sena}` : ''}`
                          : e.esPago === false ? 'Gratis · reservá tu lugar' : '';
                        const cuerpo = (
                          <>
                            <span className="rv-evd">{corta(e.fecha)}{e.horaInicio ? ` · ${e.horaInicio} hs` : ''}</span>
                            <span className="rv-evn">{e.titulo}</span>
                            {e.descripcion && <span className="rv-evp rv-evp--clip">{e.descripcion}</span>}
                            {precio && <span className="rv-evprice">{precio}</span>}
                          </>
                        );
                        // Eventos que se reservan en otro lado (entradas, etc.): link.
                        return e.linkExterno ? (
                          <a key={e.id} className="rv-ev" href={e.linkExterno} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            {cuerpo}
                            <span className="rv-evprice">{e.linkTexto || 'Reservá acá'} ↗</span>
                          </a>
                        ) : (
                          <button key={e.id} type="button" className="rv-ev" aria-pressed={evId === e.id} onClick={() => { setEvId(e.id); setComp(null); setError(''); }}>{cuerpo}</button>
                        );
                      })}
                    </div>
                  </Campo>
                )}

                <Campo label={`Cantidad de personas${tipo === 'cava' ? ` (mínimo ${limites.min}, máximo ${limites.max})` : ''}`} req>
                  <div className="rv-step">
                    <button type="button" aria-label="Menos personas" onClick={() => setPers(p => Math.max(limites.min, p - 1))}>−</button>
                    <span aria-live="polite">{pers}</span>
                    <button type="button" aria-label="Más personas" onClick={() => setPers(p => Math.min(limites.max, p + 1))}>+</button>
                  </div>
                  {tipo === 'mesa' && pers >= limites.max && cfg && (
                    <p className="rv-hint" style={{ marginTop: 8 }}>¿Son más? Mirá La Cava o pedí una cotización para tu evento.</p>
                  )}
                </Campo>

                {tipo === 'cava' && (
                  <Campo label="¿Traerás torta?">
                    <label className="rv-check"><input type="checkbox" checked={torta} onChange={e => setTorta(e.target.checked)} /> Sí, traemos torta</label>
                  </Campo>
                )}

                {tipo !== 'evento' && (
                  <>
                    <Campo label={tipo === 'cava' ? 'Fecha del evento' : 'Fecha'} req>
                      <Calendario
                        fecha={fecha} mes={mes} setMes={setMes} cava={tipo === 'cava'}
                        tomadas={tipo === 'cava' ? tomadas : undefined}
                        onElegir={(k) => { setFecha(k); setHora(''); setError(''); }}
                      />
                    </Campo>
                    <Campo label={tipo === 'cava' ? 'Horario de ingreso' : 'Horario'} req>
                      {!fecha && <p className="rv-hint">Seleccioná una fecha para ver los horarios disponibles.</p>}
                      {fecha && tipo === 'cava' && cfg && <Chips opciones={cfg.horariosCava} valor={hora} onChange={setHora} />}
                      {fecha && tipo === 'mesa' && <HorariosMesa disp={disp} hora={hora} setHora={setHora} pers={pers} />}
                    </Campo>
                  </>
                )}

                {tipo === 'mesa' && (
                  <Campo label="Preferencia de ubicación" req>
                    <Chips opciones={cfg?.preferencias ?? ['Pérgola', 'Jardín']} valor={zona} onChange={setZona} />
                  </Campo>
                )}

                {tipo === 'cava' && extrasCava.length > 0 && (
                  <Campo label="Sumale a tu noche">
                    <Chips multi valor={extras} onChange={setExtras} opciones={extrasCava.map(x => ({ v: x.id, label: `${x.nombre} · ${pesos(x.precio)}` }))} />
                  </Campo>
                )}

                <div className="rv-opt"><span>Opcional</span></div>
                <Campo label="Comentarios o solicitudes especiales">
                  <textarea className="rv-in rv-ta" rows={3} value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder={tipo === 'cava' ? 'Qué festejan, decoración, horario de llegada, etc.' : 'Celebración, cumpleaños, silla para bebé, mascota, etc.'} />
                </Campo>
                <Campo label="Restricciones alimentarias o alergias">
                  <textarea className="rv-in rv-ta" rows={3} value={restr} onChange={e => setRestr(e.target.value)} placeholder="Celíaco, vegetariano, alergia a frutos secos, etc." />
                </Campo>
              </div>

              {paga && (tipo === 'cava' ? cfg : ev) && (
                <>
                  <div className="rv-card rv-bank">
                    <p className="rv-banktitle">
                      {tipo === 'cava'
                        ? <>Seña · {pesos(cfg.cavaSena)} por transferencia</>
                        : <>Seña · {pagoEv?.sena ? pesos(pagoEv.sena) : (ev.sena || 'a confirmar')} por transferencia{pagoEv?.sena && /%/.test(ev.sena) && <> <small>({ev.sena})</small></>}</>}
                    </p>
                    <dl>
                      {(tipo === 'evento' && ev.alias ? [['Alias', ev.alias]] : BANCO).map(([k, v]) => (
                        <FilaBanco key={k} k={k} v={v} />
                      ))}
                    </dl>
                    <p className="rv-hint" style={{ marginTop: 12 }}>El resto se abona el día del evento.</p>
                  </div>
                  <Campo label="Comprobante de transferencia" req>
                    <label className="rv-file">
                      <input type="file" accept="image/*,application/pdf" onChange={elegirArchivo} />
                      <span>{comp ? `✓ ${comp.name}` : '↑ Adjuntar imagen o PDF'}</span>
                    </label>
                  </Campo>
                </>
              )}

              <div className="rv-card rv-sum">
                <p className="rv-sectitle">Resumen</p>
                <p id="rv-sum">{resumen().join('\n')}</p>
                <p id="rv-total">{lineaTotal()}</p>
              </div>
              <p className="rv-err" role="alert">{error}</p>
              <button type="button" className="rv-submit" disabled={enviando || !cfg} onClick={confirmar}>
                {enviando ? 'Enviando…' : paga ? 'Confirmar reserva' : 'Solicitar reserva'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HorariosMesa({ disp, hora, setHora, pers }) {
  if (!disp || disp.cargando) return <p className="rv-hint">Buscando horarios…</p>;
  if (disp.error) return <p className="rv-hint">{disp.error}</p>;
  if (!disp.abierto) return <p className="rv-hint">Ese día no tomamos reservas ({disp.motivo}). Elegí otra fecha.</p>;
  const libres = disp.horarios.filter(h => h.disponible);
  return (
    <>
      {disp.excepcion === 'abrir' && disp.motivo && <p className="rv-hint" style={{ marginBottom: 8 }}>Horario especial: {disp.motivo}</p>}
      <Chips
        opciones={disp.horarios.map(h => h.hora)} valor={hora} onChange={setHora}
        deshabilitadas={new Set(disp.horarios.filter(h => !h.disponible).map(h => h.hora))}
      />
      {!libres.length && <p className="rv-hint" style={{ marginTop: 8 }}>Ese día ya no hay lugar para {pers} {pers === 1 ? 'persona' : 'personas'}. Probá otra fecha.</p>}
    </>
  );
}

// Fila de datos bancarios con botón para copiar (CBU y alias se copian mucho desde el celu).
function FilaBanco({ k, v }) {
  const [copiado, setCopiado] = useState(false);
  const copiable = k === 'CBU' || k === 'Alias';
  return (
    <>
      <dt>{k}</dt>
      <dd>
        {v}
        {copiable && (
          <button
            type="button" className="rv-copy"
            onClick={() => { navigator.clipboard?.writeText(v).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {}); }}
          >{copiado ? 'Copiado' : 'Copiar'}</button>
        )}
      </dd>
    </>
  );
}
