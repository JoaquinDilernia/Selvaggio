// "Cómo funciona" de la propuesta A (web actual): tres pasos con el número grande de fondo.
const PASOS = [
  ['01', 'Reservá tu lugar', 'Elegí fecha, horario y cantidad de personas. Online, sin llamadas, sin esperas.'],
  ['02', 'Elegí y servite', 'Explorá +150 vinos en la cava autoservicio y armá tu picada con quesos y fiambres seleccionados.'],
  ['03', 'Disfrutá sin apuros', 'Tu mesa, tu ritmo, tu momento. El espacio está diseñado para que te quedes el tiempo que necesitás.'],
];

export default function ComoA() {
  return (
    <section id="como" className="a-sec a-sec--light">
      <div className="a-inner">
        <header className="a-head reveal">
          <p className="a-eyebrow">El proceso</p>
          <h2 className="a-title">Así de simple.</h2>
        </header>
        <ol className="a-steps">
          {PASOS.map(([n, titulo, texto]) => (
            <li key={n} className="a-step reveal">
              <span className="a-step__num" aria-hidden="true">{n}</span>
              <h3 className="a-step__title">{titulo}</h3>
              <p className="a-step__body">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
