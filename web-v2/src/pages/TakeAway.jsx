import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, pesos, waLink } from '../api.js';
import ArmarPicada from '../takeaway/ArmarPicada.jsx';
import { fechasRetiro, etiquetaFecha, NOMBRES_DIA } from '../takeaway/fechas.js';
import BarraSuperior from '../takeaway/BarraSuperior.jsx';
import '../styles/takeaway.css';

// Fotos del diseño para las picadas que todavía no tienen imagen cargada en el panel.
const FOTOS = ['/assets/d-mesa.jpg', '/assets/n-table.jpg', '/assets/d-crudo.jpg', '/assets/d-brie.jpg', '/assets/d-burrata.jpg', '/assets/d-salmon.jpg'];
const PAGOS = [
  { id: 'efectivo', nombre: 'Efectivo', nota: '10% off' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
];
const CLAVE_CARRITO = 'selvaggio-v2-carrito';

const leerCarrito = () => { try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; } catch { return []; } };
const guardarCarrito = (c) => { try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(c)); } catch { /* sin storage */ } };

export default function TakeAway() {
  const [catalogo, setCatalogo] = useState(null);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [carrito, setCarrito] = useState(leerCarrito);
  const [armando, setArmando] = useState(null); // { picada, inicial?, key? }
  const [paso, setPaso] = useState('menu'); // menu | datos | listo
  const [pedidoListo, setPedidoListo] = useState(null);

  const cargar = useCallback(() => {
    setErrorCatalogo('');
    api.catalogo().then(setCatalogo).catch((e) => setErrorCatalogo(e.message));
  }, []);
  useEffect(cargar, [cargar]);
  useEffect(() => guardarCarrito(carrito), [carrito]);

  // Si una picada/adicional del carrito ya no está en el catálogo, se saca.
  useEffect(() => {
    if (!catalogo) return;
    const ids = new Set([...catalogo.picadas.map((p) => p.id), ...catalogo.adicionales.map((a) => a.id)]);
    setCarrito((c) => c.filter((i) => ids.has(i.picadaId || i.adicionalId)));
  }, [catalogo]);

  const picadaPorId = useMemo(() => new Map((catalogo?.picadas || []).map((p) => [p.id, p])), [catalogo]);
  const adicionalPorId = useMemo(() => new Map((catalogo?.adicionales || []).map((a) => [a.id, a])), [catalogo]);

  const lineas = carrito.map((i) => {
    if (i.adicionalId) {
      const a = adicionalPorId.get(i.adicionalId);
      return { ...i, nombre: a?.nombre ?? '', precio: a?.precio ?? 0, detalle: [] };
    }
    const p = picadaPorId.get(i.picadaId);
    const detalle = (p?.secciones || []).map((s) => {
      const nombres = s.opciones.filter((o) => (i.selecciones?.[s.id] || []).includes(o.id)).map((o) => o.nombre);
      return nombres.length ? `${s.nombre}: ${nombres.join(', ')}` : null;
    }).filter(Boolean);
    return { ...i, nombre: p?.nombre ?? '', precio: p?.precio ?? 0, detalle };
  });
  const subtotal = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
  const unidades = lineas.reduce((a, l) => a + l.cantidad, 0);

  function agregarPicada(item) {
    setCarrito((c) => (armando?.key
      ? c.map((x) => (x.key === armando.key ? { ...x, ...item } : x))
      : [...c, { ...item, key: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }]));
    setArmando(null);
  }
  function cambiarCantidad(key, delta) {
    setCarrito((c) => c.map((x) => (x.key === key ? { ...x, cantidad: x.cantidad + delta } : x)).filter((x) => x.cantidad > 0));
  }
  function sumarAdicional(a) {
    setCarrito((c) => {
      const ya = c.find((x) => x.adicionalId === a.id);
      if (ya) return c.map((x) => (x === ya ? { ...x, cantidad: x.cantidad + 1 } : x));
      return [...c, { key: `a-${a.id}`, adicionalId: a.id, cantidad: 1 }];
    });
  }
  const cantidadAdicional = (id) => carrito.find((x) => x.adicionalId === id)?.cantidad ?? 0;

  function irADatos() { setPaso('datos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  if (paso === 'listo' && pedidoListo) {
    return <Listo pedido={pedidoListo} />;
  }

  return (
    <div className="tw2">
      <BarraSuperior />

      <header className="tw2-hero">
        <img src="/assets/d-mesa.jpg" alt="" className="tw2-hero__img" />
        <div className="tw2-hero__fade" aria-hidden="true" />
        <div className="tw2-hero__txt">
          <p className="tw2-kicker tw2-kicker--terra">Take away</p>
          <h1 className="tw2-h1">
            <span>El plan de hoy:</span>
            <span className="tw2-script tw2-script--big">Selvaggio en casa</span>
          </h1>
          <p className="tw2-hero__p">Elegís como en el local: quesos, fiambres, conservas, platitos y el vino. Lo dejamos listo para retirar o te lo mandamos. Y si no sabés qué llevar, Uvita te lo arma.</p>
          {catalogo && <Reglas catalogo={catalogo} />}
        </div>
      </header>

      <Pasos paso={paso} onMenu={() => setPaso('menu')} hayCarrito={carrito.length > 0} onDatos={irADatos} />

      <div className={`tw2-layout${paso === 'menu' ? '' : ' tw2-layout--uno'}`}>
        <main className="tw2-main">
          {errorCatalogo && (
            <div className="tw2-aviso">
              <p>{errorCatalogo}</p>
              <button type="button" className="tw2-btn tw2-btn--wine" onClick={cargar}>Reintentar</button>
            </div>
          )}
          {!catalogo && !errorCatalogo && <p className="tw2-cargando">Cargando el menú…</p>}

          {catalogo && !catalogo.activo && (
            <div className="tw2-aviso">
              <p>Hoy el take away no está tomando pedidos online.</p>
              <a className="tw2-btn tw2-btn--wine" href={waLink('¡Hola Uvita! Quiero pedir una picada para llevar')} target="_blank" rel="noopener noreferrer">Escribile a Uvita</a>
            </div>
          )}

          {catalogo?.activo && paso === 'menu' && (
            <>
              {catalogo.adicionales.length > 0 && (
                <Autoservicio
                  productos={catalogo.adicionales}
                  categorias={catalogo.categoriasSueltos || []}
                  cantidad={cantidadAdicional}
                  onSumar={sumarAdicional}
                  onSacar={(p) => cambiarCantidad(`a-${p.id}`, -1)}
                />
              )}

              <section aria-labelledby="tw2-picadas" className={catalogo.adicionales.length ? 'tw2-adic' : undefined}>
                <h2 id="tw2-picadas" className="tw2-h2">{catalogo.adicionales.length ? <>O llevate una <span className="tw2-script">picada armada</span></> : <>Elegí tu <span className="tw2-script">picada</span></>}</h2>
                <div className="tw2-grid">
                  {catalogo.picadas.map((p, idx) => (
                    <article key={p.id} className="tw2-card">
                      <div className="tw2-card__img">
                        <img src={p.imagen || FOTOS[idx % FOTOS.length]} alt={p.nombre} loading="lazy" />
                      </div>
                      <div className="tw2-card__body">
                        <h3 className="tw2-card__name">{p.nombre}</h3>
                        {p.descripcion && <p className="tw2-card__desc">{p.descripcion}</p>}
                        {p.secciones.length > 0 && (
                          <ul className="tw2-card__secs">
                            {p.secciones.map((s) => <li key={s.id}>{s.limite ? `${s.limite} ` : ''}{s.nombre.toLowerCase()}</li>)}
                          </ul>
                        )}
                        <div className="tw2-card__foot">
                          <span className="tw2-card__price">{pesos(p.precio)}</span>
                          <button type="button" className="tw2-btn tw2-btn--wine" onClick={() => setArmando({ picada: p })}>Armala</button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!catalogo.picadas.length && <p className="tw2-muted">Todavía no hay picadas cargadas.</p>}
                </div>
              </section>

              <p className="tw2-uvita">
                ¿No sabés qué llevar? <a href={waLink('¡Hola Uvita! ¿Me armás un take away?')} target="_blank" rel="noopener noreferrer">Uvita te arma el take away por WhatsApp</a>
              </p>
            </>
          )}

          {catalogo?.activo && paso === 'datos' && (
            <Checkout
              catalogo={catalogo}
              carrito={carrito}
              lineas={lineas}
              onVolver={() => setPaso('menu')}
              onListo={(p) => { setPedidoListo(p); setCarrito([]); setPaso('listo'); window.scrollTo(0, 0); }}
            />
          )}
        </main>

        {catalogo?.activo && paso === 'menu' && (
          <Ticket
            lineas={lineas}
            subtotal={subtotal}
            onCantidad={cambiarCantidad}
            onEditar={(l) => setArmando({ picada: picadaPorId.get(l.picadaId), inicial: l, key: l.key })}
            onSeguir={irADatos}
          />
        )}
      </div>

      {catalogo?.activo && paso === 'menu' && unidades > 0 && (
        <div className="tw2-barra">
          <span>Tu pedido · {unidades} {unidades === 1 ? 'ítem' : 'ítems'} · <b>{pesos(subtotal)}</b></span>
          <button type="button" className="tw2-btn tw2-btn--cream" onClick={irADatos}>Continuar</button>
        </div>
      )}

      {armando?.picada && (
        <ArmarPicada picada={armando.picada} inicial={armando.inicial} onCerrar={() => setArmando(null)} onAgregar={agregarPicada} />
      )}
    </div>
  );
}

// Autoservicio: la heladera del local en la web. Categorías como pestañas y
// cada producto con foto, precio y para sumar/sacar.
function Autoservicio({ productos, categorias, cantidad, onSumar, onSacar }) {
  const presentes = [...new Set(productos.map((p) => p.categoria))]
    .sort((x, y) => (categorias.indexOf(x) + 1 || 99) - (categorias.indexOf(y) + 1 || 99));
  const [cat, setCat] = useState('Todo');
  const visibles = cat === 'Todo' ? productos : productos.filter((p) => p.categoria === cat);
  return (
    <section aria-labelledby="tw2-auto" className="tw2-auto">
      <h2 id="tw2-auto" className="tw2-h2">Armá tu <span className="tw2-script">mesa</span></h2>
      <p className="tw2-auto__intro">Como en la heladera del local: elegí quesos, fiambres y conservas envasados, platitos, postres y el vino. Sumá lo que quieras y lo dejamos listo.</p>
      <div className="tw2-auto__cats" role="tablist" aria-label="Categorías">
        {['Todo', ...presentes].map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} className="tw2-auto__cat" onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <ul className="tw2-auto__grid">
        {visibles.map((p) => {
          const n = cantidad(p.id);
          return (
            <li key={p.id} className={`tw2-prod${n ? ' tw2-prod--on' : ''}${p.imagen ? '' : ' tw2-prod--sinfoto'}`}>
              {p.imagen ? (
                <div className="tw2-prod__img">
                  <img src={p.imagen} alt={p.nombre} loading="lazy" />
                  {n > 0 && <b className="tw2-prod__badge">{n}</b>}
                </div>
              ) : n > 0 && <b className="tw2-prod__badge">{n}</b>}
              <div className="tw2-prod__body">
                <p className="tw2-prod__cat">{p.categoria}</p>
                <h3 className="tw2-prod__name">{p.nombre}</h3>
                {p.descripcion && <p className="tw2-prod__desc">{p.descripcion}</p>}
                {p.maridaje && <p className="tw2-prod__mar">Va con: {p.maridaje}</p>}
                {p.alergenos && p.alergenos !== 'Ninguno conocido' && <p className="tw2-prod__mar">Alérgenos: {p.alergenos}</p>}
                <div className="tw2-prod__foot">
                  <span className="tw2-prod__price">{pesos(p.precio)}</span>
                  {n > 0 ? (
                    <div className="tw2-stepper tw2-stepper--light">
                      <button type="button" aria-label={`Sacar ${p.nombre}`} onClick={() => onSacar(p)}>−</button>
                      <output>{n}</output>
                      <button type="button" aria-label={`Sumar ${p.nombre}`} onClick={() => onSumar(p)}>+</button>
                    </div>
                  ) : (
                    <button type="button" className="tw2-btn tw2-btn--line" onClick={() => onSumar(p)}>Sumar</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Reglas({ catalogo }) {
  const dias = catalogo.diasAbiertos.length === 7 || !catalogo.diasAbiertos.length
    ? 'Todos los días'
    : [...catalogo.diasAbiertos].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => NOMBRES_DIA[d].slice(0, 3)).join(' · ');
  return (
    <div className="tw2-reglas">
      <span>{dias}</span>
      {catalogo.horarioDesde != null && <span>{catalogo.horarioDesde} a {catalogo.horarioHasta} hs</span>}
      <span>Efectivo 10% off</span>
      {catalogo.zonasEnvio.length > 0 && <span>Envío gratis a {catalogo.zonasEnvio.join(', ')}</span>}
    </div>
  );
}

function Pasos({ paso, onMenu, hayCarrito, onDatos }) {
  return (
    <nav className="tw2-pasos" aria-label="Pasos del pedido">
      <button type="button" className="tw2-paso" aria-current={paso === 'menu' ? 'step' : undefined} onClick={onMenu}><b>1</b> Elegí</button>
      <span className="tw2-paso__sep" aria-hidden="true" />
      <button type="button" className="tw2-paso" aria-current={paso === 'datos' ? 'step' : undefined} disabled={!hayCarrito} onClick={onDatos}><b>2</b> Tus datos</button>
      <span className="tw2-paso__sep" aria-hidden="true" />
      <span className="tw2-paso"><b>3</b> ¡Listo!</span>
    </nav>
  );
}

function Ticket({ lineas, subtotal, onCantidad, onEditar, onSeguir }) {
  return (
    <aside className="tw2-ticket-wrap" aria-label="Tu pedido">
      <div className="tw2-ticket">
        <div className="tw2-ticket__head">
          <span className="tw2-script tw2-script--wine">Tu pedido</span>
          <span className="tw2-kicker tw2-kicker--mute">Take away</span>
        </div>
        {!lineas.length && <p className="tw2-ticket__vacio">Todavía no elegiste nada. Sumá productos o armá una picada y aparece acá.</p>}
        {lineas.map((l) => (
          <div key={l.key} className="tw2-ticket__row">
            <div className="tw2-ticket__info">
              <span className="tw2-ticket__name">{l.nombre}</span>
              {l.detalle.map((d) => <span key={d} className="tw2-ticket__det">{d}</span>)}
              {l.vino && <span className="tw2-ticket__vino">Con {l.vino}</span>}
              {l.picadaId && <button type="button" className="tw2-link" onClick={() => onEditar(l)}>Cambiar</button>}
            </div>
            <div className="tw2-ticket__right">
              <span className="tw2-ticket__price">{pesos(l.precio * l.cantidad)}</span>
              <div className="tw2-stepper tw2-stepper--sm">
                <button type="button" aria-label={`Una menos de ${l.nombre}`} onClick={() => onCantidad(l.key, -1)}>−</button>
                <output>{l.cantidad}</output>
                <button type="button" aria-label={`Una más de ${l.nombre}`} onClick={() => onCantidad(l.key, 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
        {lineas.length > 0 && (
          <>
            <div className="tw2-ticket__total"><span>Subtotal</span><span>{pesos(subtotal)}</span></div>
            <button type="button" className="tw2-btn tw2-btn--wine tw2-btn--full" onClick={onSeguir}>Continuar</button>
          </>
        )}
      </div>
    </aside>
  );
}

function Checkout({ catalogo, carrito, lineas, onVolver, onListo }) {
  const [f, setF] = useState({
    nombre: '', apellido: '', telefono: '', email: '',
    metodoEnvio: 'retiro', localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '',
    fechaRetiro: '', horaRetiro: '', metodoPago: 'efectivo', comentarios: '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const [cuponTxt, setCuponTxt] = useState('');
  const [cupon, setCupon] = useState('');
  const [cot, setCot] = useState(null);
  const [errCot, setErrCot] = useState('');
  const [horas, setHoras] = useState({ cargando: false, lista: [], motivo: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const conFecha = catalogo.diasAbiertos.length > 0;
  const fechas = useMemo(() => fechasRetiro(catalogo.diasAbiertos), [catalogo]);
  const items = useMemo(() => carrito.map((i) => (i.adicionalId
    ? { adicionalId: i.adicionalId, cantidad: i.cantidad }
    : { picadaId: i.picadaId, cantidad: i.cantidad, selecciones: i.selecciones, cartId: i.key })), [carrito]);

  // Totales: los calcula el server con el catálogo (precios, cupón, efectivo).
  useEffect(() => {
    if (!items.length) return undefined;
    const t = setTimeout(() => {
      api.cotizar({ items, metodoPago: f.metodoPago, cuponCodigo: cupon || undefined, email: f.email || undefined })
        .then((c) => { setCot(c); setErrCot(''); })
        .catch((e) => setErrCot(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [items, f.metodoPago, cupon, f.email]);

  useEffect(() => {
    if (!f.fechaRetiro) return;
    setHoras({ cargando: true, lista: [], motivo: '' });
    api.horarios(f.fechaRetiro)
      .then((r) => setHoras({ cargando: false, lista: r.horarios || [], motivo: r.motivo || '' }))
      .catch((e) => setHoras({ cargando: false, lista: [], motivo: e.message }));
    setF((x) => ({ ...x, horaRetiro: '' }));
  }, [f.fechaRetiro]);

  const faltantes = [];
  if (!f.nombre.trim()) faltantes.push('tu nombre');
  if (f.telefono.replace(/\D/g, '').length < 8) faltantes.push('tu WhatsApp');
  if (conFecha && !f.fechaRetiro) faltantes.push('el día');
  if (conFecha && !f.horaRetiro) faltantes.push('el horario');
  if (f.metodoEnvio === 'envio' && !f.localidadEnvio) faltantes.push('la localidad');
  if (f.metodoEnvio === 'envio' && !f.direccionEnvio.trim()) faltantes.push('la dirección');
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) faltantes.push('un email válido');

  async function confirmar(e) {
    e.preventDefault();
    if (faltantes.length || enviando) return;
    setEnviando(true); setError('');
    try {
      const r = await api.crearPedido({
        ...f,
        comentarios: [f.comentarios.trim(), ...lineas.filter((l) => l.vino).map((l) => `Vino sugerido para ${l.nombre}: ${l.vino}`)].filter(Boolean).join(' · '),
        items,
        cuponId: cot?.cuponId || '',
      });
      onListo({ ...r, nombre: f.nombre, telefono: f.telefono, metodoEnvio: f.metodoEnvio, fechaRetiro: f.fechaRetiro, horaRetiro: f.horaRetiro, metodoPago: f.metodoPago });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="tw2-checkout" onSubmit={confirmar} noValidate>
      <button type="button" className="tw2-link tw2-volver" onClick={onVolver}>← Seguir eligiendo</button>
      <h2 className="tw2-h2">Tus <span className="tw2-script">datos</span></h2>

      <div className="tw2-form">
        <label className="tw2-field"><span>Nombre *</span><input value={f.nombre} onChange={set('nombre')} autoComplete="given-name" /></label>
        <label className="tw2-field"><span>Apellido</span><input value={f.apellido} onChange={set('apellido')} autoComplete="family-name" /></label>
        <label className="tw2-field"><span>WhatsApp *</span><input value={f.telefono} onChange={set('telefono')} inputMode="tel" autoComplete="tel" placeholder="11 2345-6789" /></label>
        <label className="tw2-field"><span>Email</span><input value={f.email} onChange={set('email')} inputMode="email" autoComplete="email" placeholder="Opcional" /></label>
      </div>

      <h3 className="tw2-h3">¿Cómo te llega?</h3>
      <div className="tw2-opciones">
        <button type="button" className="tw2-opcion" aria-pressed={f.metodoEnvio === 'retiro'} onClick={() => setF((x) => ({ ...x, metodoEnvio: 'retiro' }))}>
          <b>Retiro en Selvaggio</b><span>Av. Fondo de la Legua 59</span>
        </button>
        {catalogo.zonasEnvio.length > 0 && (
          <button type="button" className="tw2-opcion" aria-pressed={f.metodoEnvio === 'envio'} onClick={() => setF((x) => ({ ...x, metodoEnvio: 'envio' }))}>
            <b>Envío gratis</b><span>{catalogo.zonasEnvio.join(', ')}</span>
          </button>
        )}
      </div>
      {f.metodoEnvio === 'envio' && (
        <div className="tw2-form">
          <label className="tw2-field"><span>Localidad *</span>
            <select value={f.localidadEnvio} onChange={set('localidadEnvio')}>
              <option value="">Elegí…</option>
              {catalogo.zonasEnvio.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
          <label className="tw2-field"><span>Dirección *</span><input value={f.direccionEnvio} onChange={set('direccionEnvio')} autoComplete="street-address" /></label>
          <label className="tw2-field"><span>Piso / depto</span><input value={f.pisoDeptoEnvio} onChange={set('pisoDeptoEnvio')} /></label>
          <label className="tw2-field"><span>Referencia</span><input value={f.referenciaEnvio} onChange={set('referenciaEnvio')} placeholder="Entre calles, timbre…" /></label>
        </div>
      )}

      {conFecha && (
        <>
          <h3 className="tw2-h3">¿Qué día?</h3>
          <div className="tw2-dias">
            {fechas.map((iso) => {
              const e = etiquetaFecha(iso);
              return (
                <button key={iso} type="button" className="tw2-dia" aria-pressed={f.fechaRetiro === iso} onClick={() => setF((x) => ({ ...x, fechaRetiro: iso }))}>
                  <b>{e.dia}</b><span>{e.fecha}</span>
                </button>
              );
            })}
          </div>
          {f.fechaRetiro && (
            <>
              <h3 className="tw2-h3">¿A qué hora?</h3>
              {horas.cargando && <p className="tw2-muted">Buscando horarios…</p>}
              {!horas.cargando && !horas.lista.length && <p className="tw2-muted">{horas.motivo || 'Ese día ya no quedan horarios. Probá con otro.'}</p>}
              <div className="tw2-chips">
                {horas.lista.map((h) => (
                  <button key={h} type="button" className="tw2-chip" aria-pressed={f.horaRetiro === h} onClick={() => setF((x) => ({ ...x, horaRetiro: h }))}>{h}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <h3 className="tw2-h3">¿Cómo pagás?</h3>
      <p className="tw2-muted">Pagás al {f.metodoEnvio === 'envio' ? 'recibir' : 'retirar'}.</p>
      <div className="tw2-chips">
        {PAGOS.map((p) => (
          <button key={p.id} type="button" className="tw2-chip" aria-pressed={f.metodoPago === p.id} onClick={() => setF((x) => ({ ...x, metodoPago: p.id }))}>
            {p.nombre}{p.nota && <small className="tw2-chip__nota">{p.nota}</small>}
          </button>
        ))}
      </div>

      <div className="tw2-cupon">
        <label className="tw2-field"><span>Cupón</span><input value={cuponTxt} onChange={(e) => setCuponTxt(e.target.value.toUpperCase())} placeholder="Si tenés uno" /></label>
        <button type="button" className="tw2-btn tw2-btn--line" disabled={!cuponTxt.trim()} onClick={() => setCupon(cuponTxt.trim())}>Aplicar</button>
      </div>
      {cupon && cot?.avisoCupon && <p className="tw2-error">{cot.avisoCupon}</p>}
      {cupon && cot?.cuponId && <p className="tw2-ok">Cupón {cupon} aplicado.</p>}

      <label className="tw2-field tw2-field--full"><span>Comentarios</span><textarea rows={3} value={f.comentarios} onChange={set('comentarios')} placeholder="Alergias, algo que quieras que sepamos…" /></label>

      <div className="tw2-resumen">
        <span className="tw2-script tw2-script--wine">Resumen</span>
        {lineas.map((l) => (
          <div key={l.key} className="tw2-resumen__row"><span>{l.cantidad} × {l.nombre}</span><span>{pesos(l.precio * l.cantidad)}</span></div>
        ))}
        {errCot && <p className="tw2-error">{errCot}</p>}
        {cot && (
          <>
            {cot.descuentoCupon > 0 && <div className="tw2-resumen__row tw2-resumen__desc"><span>Cupón</span><span>−{pesos(cot.descuentoCupon)}</span></div>}
            {cot.descuentoEfectivo > 0 && <div className="tw2-resumen__row tw2-resumen__desc"><span>Efectivo 10%</span><span>−{pesos(cot.descuentoEfectivo)}</span></div>}
            <div className="tw2-resumen__total"><span>Total</span><span>{pesos(cot.total)}</span></div>
          </>
        )}
      </div>

      {error && <p className="tw2-error" role="alert">{error}</p>}
      {faltantes.length > 0 && <p className="tw2-muted">Falta: {faltantes.join(', ')}.</p>}
      <button type="submit" className="tw2-btn tw2-btn--wine tw2-btn--full tw2-btn--big" disabled={faltantes.length > 0 || enviando || !cot}>
        {enviando ? 'Enviando…' : `Confirmar pedido${cot ? ` · ${pesos(cot.total)}` : ''}`}
      </button>
    </form>
  );
}

function Listo({ pedido }) {
  const tel4 = pedido.telefono.replace(/\D/g, '').slice(-4);
  const cuando = pedido.fechaRetiro ? `${etiquetaFecha(pedido.fechaRetiro).dia.toLowerCase()} ${etiquetaFecha(pedido.fechaRetiro).fecha} a las ${pedido.horaRetiro}` : '';
  return (
    <div className="tw2">
      <BarraSuperior />
      <section className="tw2-listo">
        <p className="tw2-kicker">¡Gracias, {pedido.nombre}!</p>
        <h1 className="tw2-h1 tw2-h1--wine"><span>Tu picada</span><span className="tw2-script tw2-script--big">{pedido.metodoEnvio === 'envio' ? 'va para tu casa' : 'te espera'}</span></h1>
        <div className="tw2-ticket tw2-ticket--listo">
          <div className="tw2-ticket__head"><span className="tw2-script tw2-script--wine">Pedido</span><span className="tw2-listo__num">{pedido.numeroPedido}</span></div>
          {pedido.items.map((i, n) => (
            <div key={n} className="tw2-resumen__row"><span>{i.cantidad} × {i.nombre}</span><span>{pesos(i.subtotal)}</span></div>
          ))}
          <div className="tw2-resumen__total"><span>Total</span><span>{pesos(pedido.total)}</span></div>
          <p className="tw2-listo__det">
            {pedido.metodoEnvio === 'envio' ? 'Te lo mandamos' : 'Lo retirás en Av. Fondo de la Legua 59'}{cuando ? ` el ${cuando}` : ''}. Pagás con {pedido.metodoPago} al {pedido.metodoEnvio === 'envio' ? 'recibirlo' : 'retirarlo'}.
          </p>
        </div>
        <div className="tw2-listo__acciones">
          <Link className="tw2-btn tw2-btn--wine" to={`/take-away/seguimiento?numero=${pedido.numeroPedido}&tel=${tel4}`}>Seguir mi pedido</Link>
          <a className="tw2-btn tw2-btn--line" href={waLink(`¡Hola! Hice el pedido ${pedido.numeroPedido} por la web.`)} target="_blank" rel="noopener noreferrer">Escribirnos por WhatsApp</a>
        </div>
        {pedido.sandbox && <p className="tw2-muted">Este pedido es de prueba: no llega a la cocina.</p>}
      </section>
    </div>
  );
}
