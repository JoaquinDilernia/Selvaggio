import { FUNNELS } from './funnels';

const contar = (eventos, categoria, tipo) =>
  eventos.filter(e => e.categoria === categoria && e.tipo === tipo).length;

// Badge de variación vs. el mismo paso en el período anterior. `null` cuando
// no hay cambio real que mostrar (0 → 0).
const badgeComparacion = (actual, anterior) => {
  if (anterior === 0 && actual === 0) return null;
  if (anterior === 0) return { texto: 'nuevo', positivo: true };
  const variacion = Math.round(((actual - anterior) / anterior) * 100);
  if (variacion === 0) return null;
  const signo = variacion > 0 ? '+' : '−';
  return { texto: `${signo}${Math.abs(variacion)}% vs. anterior`, positivo: variacion > 0 };
};

function FunnelCard({ categoria, titulo, pasos, eventosActuales, eventosAnteriores }) {
  const conteos = pasos.map(p => contar(eventosActuales, categoria, p.tipo));
  const conteosAnteriores = pasos.map(p => contar(eventosAnteriores, categoria, p.tipo));
  const max = Math.max(1, ...conteos);

  return (
    <div className="an-funnel">
      <h3 className="an-funnel__titulo">{titulo}</h3>
      {pasos.map((paso, i) => {
        const valor = conteos[i];
        const anteriorPaso = i > 0 ? conteos[i - 1] : null;
        const caida = anteriorPaso ? Math.round(100 - (valor / Math.max(anteriorPaso, 1)) * 100) : null;
        const pct = Math.round((valor / max) * 100);
        const badge = badgeComparacion(valor, conteosAnteriores[i]);
        return (
          <div key={paso.tipo} className="an-funnel__paso">
            <div className="an-funnel__paso-header">
              <span className="an-funnel__paso-label">{paso.label}</span>
              <span className="an-funnel__paso-valores">
                <span className="an-funnel__paso-valor">{valor}</span>
                {badge && (
                  <span className={`an-badge${badge.positivo ? ' an-badge--pos' : ' an-badge--neg'}`}>
                    {badge.texto}
                  </span>
                )}
              </span>
            </div>
            <div className="an-funnel__barra-track">
              <div className="an-funnel__barra-fill" style={{ width: `${pct}%` }} />
            </div>
            {caida !== null && (
              <span className="an-funnel__caida">
                {caida > 0 ? `−${caida}% vs. paso anterior` : 'sin caída'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FunnelsSection({ eventosActuales, eventosAnteriores, categoria }) {
  const entradas = categoria === 'todas'
    ? Object.entries(FUNNELS)
    : Object.entries(FUNNELS).filter(([id]) => id === categoria);

  return (
    <div className={`an-funnels${categoria !== 'todas' ? ' an-funnels--single' : ''}`}>
      {entradas.map(([id, { titulo, pasos }]) => (
        <FunnelCard
          key={id}
          categoria={id}
          titulo={titulo}
          pasos={pasos}
          eventosActuales={eventosActuales}
          eventosAnteriores={eventosAnteriores}
        />
      ))}
    </div>
  );
}

export default FunnelsSection;
