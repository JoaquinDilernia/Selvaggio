import { useState } from 'react';
import './CavaSection.css';

// Bloque "La Cava": interés (web + chat), cierre, plata, tendencia y
// ocupación de las próximas fechas. Los datos vienen armados del backend
// (/api/gestion/analytics).

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
// En la tarjeta: "$ 5,98 M" / "$ 390 mil"; el número completo queda en el title.
const pesosCorto = (n) => {
  if (Math.abs(n) >= 1e6) return `$ ${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 2 })} M`;
  if (Math.abs(n) >= 1e4) return `$ ${Math.round(n / 1e3).toLocaleString('es-AR')} mil`;
  return pesos.format(n);
};
const entero = new Intl.NumberFormat('es-AR');

export const fechaCorta = (f) => {
  const [, m, d] = f.split('-');
  return `${Number(d)}/${Number(m)}`;
};
const diaYFecha = (f) => `${DIAS[new Date(`${f}T12:00:00Z`).getUTCDay()]} ${fechaCorta(f)}`;

// Variación contra el período anterior. `modo: 'pct'` = % de cambio,
// `'pts'` = diferencia en puntos (para tasas). `neutral` = sin bueno/malo.
export function variacion(actual, anterior, { modo = 'pct', neutral = false } = {}) {
  if (actual == null || anterior == null) return null;
  let texto, signo;
  if (modo === 'pts') {
    const d = Math.round((actual - anterior) * 10) / 10;
    if (d === 0) return null;
    signo = Math.sign(d);
    texto = `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('es-AR')} pts`;
  } else {
    if (anterior === 0) return actual === 0 ? null : { texto: 'nuevo', tono: neutral ? 'neutro' : 'pos' };
    const v = Math.round(((actual - anterior) / anterior) * 100);
    if (v === 0) return null;
    signo = Math.sign(v);
    texto = `${v > 0 ? '+' : '−'}${Math.abs(v)}%`;
  }
  return { texto, tono: neutral ? 'neutro' : signo > 0 ? 'pos' : 'neg' };
}

function Kpi({ label, valor, sub, badge, destacado = false, title }) {
  return (
    <div className={`an-kpi${destacado ? ' an-kpi--destacado' : ''}`}>
      <span className="an-kpi__label">{label}</span>
      <span className="an-kpi__valor" title={title}>{valor}</span>
      <span className="an-kpi__pie">
        {badge && <span className={`an-badge an-badge--${badge.tono}`}>{badge.texto}</span>}
        {sub && <span className="an-kpi__sub">{sub}</span>}
      </span>
    </div>
  );
}

function KpisCava({ actual, anterior, precioPersona }) {
  const a = actual, p = anterior;
  return (
    <div className="an-kpis">
      <Kpi
        destacado
        label="Interés en La Cava"
        valor={entero.format(a.interesCava)}
        badge={variacion(a.interesCava, p.interesCava)}
        sub={`${a.toquesCava} en la web · ${a.consultasChatCava} por chat${
          p.consultasChatCava === 0 && a.consultasChatCava > 0 ? ' (el período anterior no tiene datos del chat)' : ''}`}
      />
      <Kpi
        destacado
        label="Reservas cerradas"
        valor={entero.format(a.reservasCava)}
        badge={variacion(a.reservasCava, p.reservasCava)}
        sub={`${entero.format(a.personasCava)} personas`}
      />
      <Kpi
        destacado
        label="Tasa de cierre"
        valor={a.tasaCierreCava == null ? '—' : `${a.tasaCierreCava.toLocaleString('es-AR')}%`}
        badge={variacion(a.tasaCierreCava, p.tasaCierreCava, { modo: 'pts' })}
        sub="reservas sobre interesados"
      />
      <Kpi
        label="Señas cobradas"
        valor={pesosCorto(a.senasCava)}
        title={pesos.format(a.senasCava)}
        badge={variacion(a.senasCava, p.senasCava)}
      />
      <Kpi
        label="Facturación estimada"
        valor={pesosCorto(a.facturacionCava)}
        title={pesos.format(a.facturacionCava)}
        badge={variacion(a.facturacionCava, p.facturacionCava)}
        sub={precioPersona ? `a ${pesos.format(precioPersona)} por persona` : undefined}
      />
      <Kpi
        label="Anticipación promedio"
        valor={a.anticipacionDias == null ? '—' : `${a.anticipacionDias} días`}
        sub={p.anticipacionDias == null ? 'entre que reservan y el evento' : `antes: ${p.anticipacionDias} días`}
      />
    </div>
  );
}

function TendenciaCava({ tendencia }) {
  const [hover, setHover] = useState(null);
  const { tramos, paso } = tendencia;
  if (!tramos.length) return null;
  // 10% de aire arriba: la marca del período anterior nunca queda pegada al borde.
  const max = 1.1 * Math.max(1, ...tramos.map(t => Math.max(t.web + t.chat, t.interesAnterior)));
  const cadaCuanto = Math.ceil(tramos.length / 10); // ~10 etiquetas en el eje como mucho
  const etiqueta = (t) => (paso === 'dia' ? fechaCorta(t.desde) : `${fechaCorta(t.desde)}`);
  const h = hover != null ? tramos[hover] : null;

  return (
    <div className="an-card">
      <div className="an-card__head">
        <h3 className="an-card__titulo">Interés y reservas {paso === 'dia' ? 'por día' : 'por semana'}</h3>
        <div className="an-leyenda">
          <span><i className="an-swatch an-swatch--web" /> Web</span>
          <span><i className="an-swatch an-swatch--chat" /> Chat</span>
          <span><i className="an-swatch an-swatch--anterior" /> Período anterior</span>
          <span><i className="an-swatch an-swatch--reserva" /> Reservas</span>
        </div>
      </div>

      <div className="an-tend" onMouseLeave={() => setHover(null)}>
        <div className="an-tend__plot">
          {tramos.map((t, i) => (
            <div
              key={t.desde}
              className={`an-tend__col${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              aria-label={`${etiqueta(t)}: ${t.web} web, ${t.chat} chat, ${t.reservas} reservas`}
            >
              <div className="an-tend__stack">
                {t.chat > 0 && <div className="an-tend__seg an-tend__seg--chat" style={{ height: `${(t.chat / max) * 100}%` }} />}
                {t.web > 0 && <div className="an-tend__seg an-tend__seg--web" style={{ height: `${(t.web / max) * 100}%` }} />}
                {t.interesAnterior > 0 && (
                  <div className="an-tend__anterior" style={{ bottom: `${(t.interesAnterior / max) * 100}%` }} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="an-tend__reservas">
          {tramos.map(t => (
            <div key={t.desde} className="an-tend__reserva">
              {t.reservas > 0 && <span className="an-tend__reserva-dot">{t.reservas}</span>}
            </div>
          ))}
        </div>
        <div className="an-tend__eje">
          {tramos.map((t, i) => (
            <span key={t.desde}>{i % cadaCuanto === 0 ? etiqueta(t) : ''}</span>
          ))}
        </div>

        {h && (
          <div className="an-tend__tooltip" style={{ left: `${((hover + 0.5) / tramos.length) * 100}%` }}>
            <strong>{h.desde === h.hasta ? diaYFecha(h.desde) : `${fechaCorta(h.desde)} al ${fechaCorta(h.hasta)}`}</strong>
            <span>Web: {h.web}</span>
            <span>Chat: {h.chat}</span>
            <span>Interés total: {h.web + h.chat} <em>(antes {h.interesAnterior})</em></span>
            <span>Reservas: {h.reservas}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OcupacionCava({ ocupacion }) {
  const o = ocupacion;
  const pct = o.findes30 ? Math.round((o.findesTomados30 / o.findes30) * 100) : 0;
  return (
    <div className="an-card">
      <div className="an-card__head">
        <h3 className="an-card__titulo">Lo que viene</h3>
        <span className="an-card__nota">próximos 60 días · La Cava se reserva una vez por día</span>
      </div>
      <div className="an-ocup">
        <div className="an-ocup__dato">
          <span className="an-kpi__label">Viernes y sábados tomados (30 días)</span>
          <span className="an-ocup__numero">{o.findesTomados30} <small>de {o.findes30}</small></span>
          <div className="an-ocup__barra"><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="an-ocup__dato">
          <span className="an-kpi__label">Fechas tomadas</span>
          <span className="an-ocup__numero">{o.tomadas30} <small>en 30 días</small> · {o.tomadas60} <small>en 60</small></span>
        </div>
      </div>
      {o.fechasTomadas.length > 0 && (
        <div className="an-chips">
          <span className="an-chips__titulo">Tomadas</span>
          {o.fechasTomadas.map(f => <span key={f} className="an-chip an-chip--tomada">{diaYFecha(f)}</span>)}
        </div>
      )}
      <div className="an-chips">
        <span className="an-chips__titulo">Viernes y sábados libres para vender</span>
        {o.findesLibres.length === 0
          ? <span className="an-kpi__sub">No queda ninguno libre 🎉</span>
          : o.findesLibres.map(f => <span key={f} className="an-chip">{diaYFecha(f)}</span>)}
      </div>
    </div>
  );
}

function CavaSection({ data }) {
  return (
    <section className="an-seccion">
      <div className="an-seccion__head">
        <h3 className="an-seccion__titulo">La Cava</h3>
        <span className="an-card__nota">comparado con el período anterior del mismo largo</span>
      </div>
      <KpisCava actual={data.resumen.actual} anterior={data.resumen.anterior} precioPersona={data.precioPersonaCava} />
      <div className="an-grid-2">
        <TendenciaCava tendencia={data.tendenciaCava} />
        <OcupacionCava ocupacion={data.ocupacionCava} />
      </div>
    </section>
  );
}

export default CavaSection;
