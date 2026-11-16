import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Galería de la propuesta A: hasta 6 fotos cargadas desde el admin de la web,
// con visor a pantalla completa. Mientras carga (o si falla) muestra fotos propias.
const RESPALDO = [
  { id: 'r1', url: '/assets/n-patio.jpg', titulo: 'Ambiente' },
  { id: 'r2', url: '/assets/n-table.jpg', titulo: 'Gastronomía' },
  { id: 'r3', url: '/assets/n-man.jpg', titulo: 'Vinos' },
  { id: 'r4', url: '/assets/n-cavadoor.jpg', titulo: 'La Cava' },
  { id: 'r5', url: '/assets/n-mirrors.jpg', titulo: 'El salón' },
  { id: 'r6', url: '/assets/n-garden.jpg', titulo: 'El jardín' },
];

export default function GaleriaA() {
  const [fotos, setFotos] = useState(RESPALDO);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    let vivo = true;
    api.galeria().then(r => { if (vivo && r.fotos?.length) setFotos(r.fotos.slice(0, 6)); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!abierta) return undefined;
    const onKey = e => { if (e.key === 'Escape') setAbierta(null); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [abierta]);

  return (
    <section id="galeria" className="a-sec a-sec--cream">
      <div className="a-inner">
        <header className="a-head reveal">
          <p className="a-eyebrow">Selvaggio Wine</p>
          <h2 className="a-title">Viví la experiencia.</h2>
        </header>
        <div className="a-gal">
          {fotos.map(f => (
            <button key={f.id} type="button" className="a-gal__item reveal" onClick={() => setAbierta(f)} aria-label={`Ver foto${f.titulo ? `: ${f.titulo}` : ''}`}>
              <img src={f.url} alt={f.titulo || 'Selvaggio'} loading="lazy" />
              {f.titulo && <span className="a-gal__cap">{f.titulo}</span>}
            </button>
          ))}
        </div>
      </div>
      {abierta && (
        <div className="a-lightbox" role="dialog" aria-modal="true" aria-label={abierta.titulo || 'Foto'} onClick={() => setAbierta(null)}>
          <button type="button" className="a-lightbox__close" onClick={() => setAbierta(null)} aria-label="Cerrar">✕</button>
          <img src={abierta.url} alt={abierta.titulo || ''} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
