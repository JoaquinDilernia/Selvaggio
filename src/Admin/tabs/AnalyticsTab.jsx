import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';
import './AnalyticsTab.css';

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 0 },
  { id: '7d', label: 'Últimos 7 días', dias: 7 },
  { id: '30d', label: 'Últimos 30 días', dias: 30 },
];

const FUNNELS = {
  cava: {
    titulo: 'La Cava',
    pasos: [
      { tipo: 'click_reservar_cava', label: "Click en 'Reservar La Cava'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  mesa: {
    titulo: 'Mesa',
    pasos: [
      { tipo: 'click_reservar_mesa', label: "Click en 'Reservar Mesa'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  takeaway: {
    titulo: 'Take Away',
    pasos: [
      { tipo: 'click_take_away', label: "Click en 'Take Away'" },
      { tipo: 'view_content', label: 'Vio el catálogo' },
      { tipo: 'add_to_cart', label: 'Agregó al carrito' },
      { tipo: 'checkout_iniciado', label: 'Inició el checkout' },
      { tipo: 'conversion', label: 'Pedido confirmado' },
    ],
  },
};

function AnalyticsTab() {
  const [rango, setRango] = useState('7d');
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargar(); }, [rango]);

  const cargar = async () => {
    setCargando(true);
    try {
      const dias = RANGOS.find(r => r.id === rango).dias;
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - dias);
      const q = query(
        collection(db, 'selvaggio_analytics_eventos'),
        where('timestamp', '>=', Timestamp.fromDate(desde))
      );
      const snap = await getDocs(q);
      setEventos(snap.docs.map(d => d.data()));
    } catch (err) {
      console.error('Error cargando analytics:', err);
      setEventos([]);
    } finally {
      setCargando(false);
    }
  };

  const contar = (categoria, tipo) =>
    eventos.filter(e => e.categoria === categoria && e.tipo === tipo).length;

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>Analytics</h2>
        <p>Tráfico y funnel de conversión, medidos de forma nativa e independiente del pixel de Meta.</p>
      </div>

      <div className="filters-bar">
        {RANGOS.map(r => (
          <button
            key={r.id}
            className={`filter-btn${rango === r.id ? ' active' : ''}`}
            onClick={() => setRango(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="loading-state">Cargando…</div>
      ) : (
        <div className="an-funnels">
          {Object.entries(FUNNELS).map(([categoria, { titulo, pasos }]) => {
            const conteos = pasos.map(p => contar(categoria, p.tipo));
            const max = Math.max(1, ...conteos);
            return (
              <div key={categoria} className="an-funnel">
                <h3 className="an-funnel__titulo">{titulo}</h3>
                {pasos.map((paso, i) => {
                  const valor = conteos[i];
                  const anterior = i > 0 ? conteos[i - 1] : null;
                  const caida = anterior ? Math.round(100 - (valor / Math.max(anterior, 1)) * 100) : null;
                  const pct = Math.round((valor / max) * 100);
                  return (
                    <div key={paso.tipo} className="an-funnel__paso">
                      <div className="an-funnel__paso-header">
                        <span className="an-funnel__paso-label">{paso.label}</span>
                        <span className="an-funnel__paso-valor">{valor}</span>
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
          })}
        </div>
      )}
    </div>
  );
}

export default AnalyticsTab;
