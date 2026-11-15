import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, pesos, waLink } from '../api.js';
import BarraSuperior from '../takeaway/BarraSuperior.jsx';
import '../styles/takeaway.css';

const ESTADOS = [
  { id: 'pendiente', label: 'Recibido', desc: 'Recibimos tu pedido y está en espera.' },
  { id: 'preparando', label: 'En preparación', desc: 'Estamos armando tu picada.' },
  { id: 'listo', label: 'Listo', desc: '¡Tu pedido está listo!' },
  { id: 'entregado', label: 'Entregado', desc: 'Pedido entregado. ¡Que lo disfrutes!' },
];

export default function Seguimiento() {
  const [params] = useSearchParams();
  const [numero, setNumero] = useState(params.get('numero') || '');
  const [tel, setTel] = useState(params.get('tel') || '');
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);

  async function buscar(e) {
    e?.preventDefault();
    setError(''); setBuscando(true);
    try { setPedido((await api.seguimiento(numero.trim().toUpperCase(), tel.replace(/\D/g, ''))).pedido); }
    catch (err) { setPedido(null); setError(err.message); }
    finally { setBuscando(false); }
  }

  // Si viene del pedido recién hecho, busca solo y se actualiza cada 30 s.
  useEffect(() => {
    if (!params.get('numero') || !params.get('tel')) return undefined;
    buscar();
    const t = setInterval(buscar, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = pedido ? ESTADOS.findIndex((x) => x.id === pedido.estado) : -1;
  const cancelado = pedido?.estado === 'cancelado';

  return (
    <div className="tw2">
      <BarraSuperior />
      <section className="tw2-seg">
        <p className="tw2-kicker">Take away</p>
        <h1 className="tw2-h1 tw2-h1--wine"><span>Seguí tu</span><span className="tw2-script tw2-script--big">pedido</span></h1>

        <form className="tw2-seg__form" onSubmit={buscar}>
          <label className="tw2-field"><span>Número de pedido</span><input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="TW-XXXXXX" autoCapitalize="characters" /></label>
          <label className="tw2-field"><span>Últimos 4 de tu WhatsApp</span><input value={tel} onChange={(e) => setTel(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="1234" /></label>
          <button type="submit" className="tw2-btn tw2-btn--wine" disabled={buscando || !numero.trim() || tel.length !== 4}>{buscando ? 'Buscando…' : 'Buscar'}</button>
        </form>
        {error && <p className="tw2-error" role="alert">{error}</p>}

        {pedido && (
          <div className="tw2-ticket tw2-ticket--listo">
            <div className="tw2-ticket__head"><span className="tw2-script tw2-script--wine">{pedido.nombre}</span><span className="tw2-listo__num">{pedido.numeroPedido}</span></div>
            {cancelado ? (
              <p className="tw2-error">Este pedido fue cancelado. Si tenés dudas, escribinos.</p>
            ) : (
              <ol className="tw2-estados">
                {ESTADOS.map((e, i) => (
                  <li key={e.id} className={i <= idx ? 'is-on' : ''} aria-current={i === idx ? 'step' : undefined}>
                    <b>{e.label}</b>{i === idx && <span>{e.desc}</span>}
                  </li>
                ))}
              </ol>
            )}
            {(pedido.items || []).map((i, n) => (
              <div key={n} className="tw2-resumen__row"><span>{i.cantidad} × {i.nombre}</span><span>{pesos(i.subtotal ?? i.precio * i.cantidad)}</span></div>
            ))}
            {pedido.total != null && <div className="tw2-resumen__total"><span>Total</span><span>{pesos(pedido.total)}</span></div>}
          </div>
        )}

        <p className="tw2-uvita">
          ¿Algo no está bien? <a href={waLink(`¡Hola! Consulto por mi pedido ${numero}`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a> · <Link to="/take-away">Hacer otro pedido</Link>
        </p>
      </section>
    </div>
  );
}
