import { claveDiaAR } from '../../../utils/analyticsDate';
import { RANGOS } from './rangos';

const CATEGORIAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'cava', label: 'La Cava' },
  { id: 'mesa', label: 'Mesa' },
  { id: 'takeaway', label: 'Take Away' },
];

function FiltersBar({ preset, fechaDesde, fechaHasta, categoria, onPreset, onFechaDesde, onFechaHasta, onCategoria }) {
  const hoy = claveDiaAR(new Date());

  return (
    <div className="an-filters">
      <div className="an-filters__presets">
        {RANGOS.map(r => (
          <button
            key={r.id}
            type="button"
            className={`filter-btn${preset === r.id ? ' active' : ''}`}
            onClick={() => onPreset(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="an-filters__custom">
        <label className="an-filters__label">
          Desde
          <input
            type="date"
            className="an-filters__date"
            value={fechaDesde}
            max={fechaHasta}
            onChange={e => onFechaDesde(e.target.value)}
          />
        </label>
        <label className="an-filters__label">
          Hasta
          <input
            type="date"
            className="an-filters__date"
            value={fechaHasta}
            min={fechaDesde}
            max={hoy}
            onChange={e => onFechaHasta(e.target.value)}
          />
        </label>
      </div>

      <div className="an-filters__categoria">
        {CATEGORIAS.map(c => (
          <button
            key={c.id}
            type="button"
            className={`filter-btn${categoria === c.id ? ' active' : ''}`}
            onClick={() => onCategoria(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FiltersBar;
