import { useEffect, useMemo, useState } from 'react';
import { pesos } from '../api.js';
import { cepasPara, esSeccionVino, opcionDeCepa } from './vino.js';
import { MARIDAJES } from '../data/maridajes.js';

/** Modal para elegir las opciones de una picada (secciones del catálogo). */
export default function ArmarPicada({ picada, inicial, onCerrar, onAgregar }) {
  const [sel, setSel] = useState(() => {
    const s = {};
    for (const sec of picada.secciones) s[sec.id] = inicial?.selecciones?.[sec.id] ?? [];
    return s;
  });
  const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onCerrar]);

  function tocar(sec, id) {
    setSel((prev) => {
      const actual = prev[sec.id];
      if (actual.includes(id)) return { ...prev, [sec.id]: actual.filter((x) => x !== id) };
      if (sec.limite === 1) return { ...prev, [sec.id]: [id] };
      if (sec.limite && actual.length >= sec.limite) return prev;
      return { ...prev, [sec.id]: [...actual, id] };
    });
  }

  const faltan = picada.secciones.filter((s) => !s.opcional && s.opciones.length && sel[s.id].length === 0);
  const nombresElegidos = useMemo(() => picada.secciones.flatMap((s) => s.opciones.filter((o) => sel[s.id].includes(o.id)).map((o) => o.nombre)), [picada, sel]);
  // Vino: si la picada trae sección "Vino", se recomienda una de sus opciones
  // según lo que lleva (descripción + lo elegido); si no, solo la cepa.
  const secVino = picada.secciones.find(esSeccionVino) ?? null;
  const comida = [picada.nombre, picada.descripcion, ...picada.secciones.filter((s) => s !== secVino)
    .flatMap((s) => s.opciones.filter((o) => sel[s.id].includes(o.id)).map((o) => o.nombre))].join(' ');
  // La mejor cepa que esté en la carta de la picada (si ninguna está, la mejor en general).
  const ranking = cepasPara(comida);
  const conOpcion = secVino ? ranking.map((c) => ({ c, o: opcionDeCepa(secVino, c) })).find((x) => x.o) : null;
  const cepa = conOpcion?.c ?? ranking[0] ?? MARIDAJES[0];
  const recomendada = conOpcion?.o ?? null;
  const vinoElegido = secVino ? secVino.opciones.find((o) => sel[secVino.id].includes(o.id)) : null;

  return (
    <div className="tw2-modal" role="dialog" aria-modal="true" aria-label={`Armá tu ${picada.nombre}`} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="tw2-modal__box">
        <button type="button" className="tw2-x" aria-label="Cerrar" onClick={onCerrar}>×</button>
        <div className="tw2-modal__main">
          <p className="tw2-kicker">Armá tu picada</p>
          <h3 className="tw2-modal__title">{picada.nombre}</h3>
          {picada.descripcion && <p className="tw2-modal__desc">{picada.descripcion}</p>}

          {picada.secciones.map((sec) => (
            <fieldset key={sec.id} className="tw2-sec">
              <legend className="tw2-sec__name">
                {sec.nombre}
                <span className="tw2-sec__hint">
                  {sec.limite ? `Elegí hasta ${sec.limite}` : 'Elegí las que quieras'}
                  {sec.opcional ? ' · opcional' : ''}
                  {sec.limite ? ` · ${sel[sec.id].length}/${sec.limite}` : ''}
                </span>
              </legend>
              <div className="tw2-chips">
                {sec.opciones.map((o) => {
                  const on = sel[sec.id].includes(o.id);
                  const lleno = !on && sec.limite > 1 && sel[sec.id].length >= sec.limite;
                  return (
                    <button key={o.id} type="button" className="tw2-chip" aria-pressed={on} disabled={lleno} onClick={() => tocar(sec, o.id)}>
                      {o.nombre}
                      {recomendada?.id === o.id && <small className="tw2-chip__nota">Recomendado</small>}
                    </button>
                  );
                })}
                {!sec.opciones.length && <span className="tw2-muted">Sin opciones disponibles hoy.</span>}
              </div>
            </fieldset>
          ))}
        </div>

        <aside className="tw2-modal__side">
          <span className="tw2-script">Tu picada</span>
          <p className="tw2-side__list" aria-live="polite">{nombresElegidos.length ? nombresElegidos.join('\n') : 'Todavía no elegiste nada.'}</p>
          <div className="tw2-side__vino">
            {vinoElegido ? (
              <>
                <p className="tw2-kicker tw2-kicker--soft">Tu vino</p>
                <p className="tw2-side__cepa">{vinoElegido.nombre}</p>
                {recomendada && recomendada.id !== vinoElegido.id && <p className="tw2-side__why">Para esta picada te sugerimos {recomendada.nombre}.</p>}
              </>
            ) : (
              <>
                <p className="tw2-kicker tw2-kicker--soft">Te recomendamos</p>
                <p className="tw2-side__cepa">{recomendada ? recomendada.nombre : cepa.n}</p>
                <p className="tw2-side__why">{cepa.d} {cepa.tip}</p>
                {recomendada && (
                  <button type="button" className="tw2-btn tw2-btn--line tw2-btn--claro" onClick={() => tocar(secVino, recomendada.id)}>Elegir este vino</button>
                )}
              </>
            )}
          </div>
          <div className="tw2-cant">
            <span>Cantidad</span>
            <div className="tw2-stepper">
              <button type="button" aria-label="Una menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
              <output>{cantidad}</output>
              <button type="button" aria-label="Una más" onClick={() => setCantidad((c) => Math.min(20, c + 1))}>+</button>
            </div>
          </div>
          <button
            type="button"
            className="tw2-btn tw2-btn--cream tw2-btn--full"
            disabled={faltan.length > 0}
            onClick={() => onAgregar({ picadaId: picada.id, selecciones: sel, cantidad, vino: secVino ? null : cepa.n })}
          >
            {inicial ? 'Guardar cambios' : 'Agregar al pedido'} · {pesos(picada.precio * cantidad)}
          </button>
          {faltan.length > 0 && <p className="tw2-side__falta">Falta elegir: {faltan.map((s) => s.nombre).join(', ')}</p>}
        </aside>
      </div>
    </div>
  );
}
