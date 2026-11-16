import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Prensa de la propuesta A: las notas que se cargan en el admin de la web,
// con foto, medio, bajada y fecha. Sin notas, la sección no se muestra.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2025-12-18" → "18 de diciembre de 2025" (sin pasar por Date: evita el corrimiento de huso).
function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
}

export default function PrensaA() {
  const [notas, setNotas] = useState(null);

  useEffect(() => {
    let vivo = true;
    api.prensa().then(r => { if (vivo) setNotas(r.notas ?? []); }).catch(() => { if (vivo) setNotas([]); });
    return () => { vivo = false; };
  }, []);

  if (notas && notas.length === 0) return null;

  return (
    <section id="prensa" className="a-sec a-sec--plum">
      <div className="a-inner">
        <header className="a-head reveal">
          <p className="a-eyebrow">Prensa</p>
          <h2 className="a-title">En los medios.</h2>
        </header>
        <div className="a-press" aria-busy={!notas}>
          {(notas ?? []).map(n => (
            <article key={n.id} className="a-press__card reveal">
              {n.imagen && (
                <div className="a-press__img"><img src={n.imagen} alt="" loading="lazy" /></div>
              )}
              <div className="a-press__body">
                {n.medio && <p className="a-press__medio">{n.medio}</p>}
                <h3 className="a-press__titulo">{n.titulo}</h3>
                {n.descripcion && <p className="a-press__desc">{n.descripcion}</p>}
                <div className="a-press__foot">
                  {n.fecha && <span>{fechaLarga(n.fecha)}</span>}
                  {n.url && (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="a-press__link">
                      Leer artículo →<span className="a-sr"> (en {n.medio || 'otro sitio'})</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
