import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { claveDiaAR, inicioDiaAR, finDiaAR } from '../../utils/analyticsDate';
import FiltersBar from './analytics/FiltersBar';
import { RANGOS } from './analytics/rangos';
import FunnelsSection from './analytics/FunnelsSection';
import DayOfWeekChart from './analytics/DayOfWeekChart';
import DailyEvolutionChart from './analytics/DailyEvolutionChart';
import './TabsShared.css';
import './AnalyticsTab.css';

const hoyAR = () => claveDiaAR(new Date());

const restarDias = (claveDia, dias) => {
  const d = inicioDiaAR(claveDia);
  d.setUTCDate(d.getUTCDate() - dias);
  return claveDiaAR(d);
};

const RANGO_DEFAULT = RANGOS.find(r => r.id === '7d');

function AnalyticsTab() {
  const [preset, setPreset] = useState('7d');
  const [fechaDesde, setFechaDesde] = useState(() => restarDias(hoyAR(), RANGO_DEFAULT.dias - 1));
  const [fechaHasta, setFechaHasta] = useState(hoyAR);
  const [categoria, setCategoria] = useState('todas');
  const [eventosActuales, setEventosActuales] = useState([]);
  const [eventosAnteriores, setEventosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

  const cargar = async () => {
    setCargando(true);
    try {
      const inicioActual = inicioDiaAR(fechaDesde);
      const finActual = finDiaAR(fechaHasta);
      const duracionMs = finActual.getTime() - inicioActual.getTime();
      const inicioAnterior = new Date(inicioActual.getTime() - duracionMs);

      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(inicioAnterior)),
        where('timestamp', '<=', Timestamp.fromDate(finActual))
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => d.data());
      setEventosActuales(todos.filter(e => e.timestamp.toMillis() >= inicioActual.getTime()));
      setEventosAnteriores(todos.filter(e => e.timestamp.toMillis() < inicioActual.getTime()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventosActuales([]);
      setEventosAnteriores([]);
    } finally {
      setCargando(false);
    }
  };

  const handlePreset = (id) => {
    const r = RANGOS.find(x => x.id === id);
    setPreset(id);
    setFechaHasta(hoyAR());
    setFechaDesde(restarDias(hoyAR(), r.dias - 1));
  };

  const handleFechaDesde = (valor) => {
    setPreset(null);
    setFechaDesde(valor);
    if (valor > fechaHasta) setFechaHasta(valor);
  };

  const handleFechaHasta = (valor) => {
    setPreset(null);
    const hoy = hoyAR();
    const clamped = valor > hoy ? hoy : valor;
    setFechaHasta(clamped);
    if (clamped < fechaDesde) setFechaDesde(clamped);
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <FiltersBar
        preset={preset}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        categoria={categoria}
        onPreset={handlePreset}
        onFechaDesde={handleFechaDesde}
        onFechaHasta={handleFechaHasta}
        onCategoria={setCategoria}
      />

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <>
          <FunnelsSection
            eventosActuales={eventosActuales}
            eventosAnteriores={eventosAnteriores}
            categoria={categoria}
          />
          <DayOfWeekChart eventosActuales={eventosActuales} categoria={categoria} />
          <DailyEvolutionChart
            eventosActuales={eventosActuales}
            categoria={categoria}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
          />
        </>
      )}
    </div>
  );
}

export default AnalyticsTab;
