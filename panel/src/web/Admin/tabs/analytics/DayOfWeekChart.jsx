import { diaSemanaAR } from '../../../utils/analyticsDate';
import { CLICK_TIPOS } from './funnels';

const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const esClick = (e, categoria) =>
  categoria === 'todas' ? Object.values(CLICK_TIPOS).includes(e.tipo) : e.tipo === CLICK_TIPOS[categoria];

const esConversion = (e, categoria) =>
  e.tipo === 'conversion' && (categoria === 'todas' || e.categoria === categoria);

function DayOfWeekChart({ eventosActuales, categoria }) {
  const clicks = [0, 0, 0, 0, 0, 0, 0];
  const conversiones = [0, 0, 0, 0, 0, 0, 0];
  eventosActuales.forEach(e => {
    const dia = diaSemanaAR(e.timestamp);
    if (esClick(e, categoria)) clicks[dia]++;
    if (esConversion(e, categoria)) conversiones[dia]++;
  });

  const max = Math.max(1, ...clicks, ...conversiones);

  return (
    <div className="an-dow">
      <h3 className="an-dow__titulo">Por día de la semana</h3>
      <div className="an-dow__leyenda">
        <span className="an-dow__leyenda-item"><i className="an-dow__swatch an-dow__swatch--clicks" /> Clicks</span>
        <span className="an-dow__leyenda-item"><i className="an-dow__swatch an-dow__swatch--conversiones" /> Conversiones</span>
      </div>
      <div className="an-dow__grafico">
        {DIAS_LABEL.map((label, i) => (
          <div key={label} className="an-dow__columna">
            <div className="an-dow__barras">
              <div className="an-dow__barra-wrap">
                <span className="an-dow__valor">{clicks[i]}</span>
                <div className="an-dow__barra an-dow__barra--clicks" style={{ height: `${(clicks[i] / max) * 100}%` }} />
              </div>
              <div className="an-dow__barra-wrap">
                <span className="an-dow__valor">{conversiones[i]}</span>
                <div className="an-dow__barra an-dow__barra--conversiones" style={{ height: `${(conversiones[i] / max) * 100}%` }} />
              </div>
            </div>
            <span className="an-dow__dia">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DayOfWeekChart;
