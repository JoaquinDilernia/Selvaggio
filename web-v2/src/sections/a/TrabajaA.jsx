import { useState } from 'react';
import { api, EN_PRUEBA } from '../../api.js';

// "Trabajá con nosotros" de la propuesta A: formulario en la misma página.
// Las postulaciones llegan a Gestión → Postulaciones del panel.
const PUESTOS = [
  ['Sommelier/Bartender', 'Sommelier / Bartender'],
  ['Cocina', 'Cocina'],
  ['Atención al público', 'Atención al público'],
  ['Limpieza', 'Limpieza'],
  ['Administración', 'Administración'],
  ['Otro', 'Otro'],
];
const VACIO = { nombre: '', email: '', telefono: '', puesto: '', mensaje: '' };

export default function TrabajaA() {
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const cambiar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.postular(form);
      setListo(true);
      setForm(VACIO);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section id="trabaja" className="a-sec a-sec--dark">
      <div className="a-inner a-inner--narrow">
        <header className="a-head reveal">
          <p className="a-eyebrow a-eyebrow--light">Sumate al equipo</p>
          <h2 className="a-title a-title--light">Trabajá con nosotros</h2>
          <p className="a-lead">Buscamos personas apasionadas por el vino, la gastronomía y la atención al cliente. Si querés ser parte del equipo Selvaggio, dejanos tus datos.</p>
        </header>

        {listo ? (
          <div className="a-job__ok" role="status">
            <h3>¡Postulación enviada!</h3>
            <p>Nos vamos a contactar pronto con vos.</p>
            {EN_PRUEBA && <p className="a-job__prueba">Versión de prueba: esta postulación no le llega al equipo.</p>}
            <button type="button" className="a-job__otra" onClick={() => setListo(false)}>Enviar otra</button>
          </div>
        ) : (
          <form className="a-job" onSubmit={enviar}>
            <div className="a-job__row">
              <label className="a-job__field">
                <span>Nombre completo <b aria-hidden="true">*</b></span>
                <input name="nombre" value={form.nombre} onChange={cambiar} required minLength={2} maxLength={100} autoComplete="name" placeholder="Tu nombre y apellido" />
              </label>
              <label className="a-job__field">
                <span>Email <b aria-hidden="true">*</b></span>
                <input type="email" name="email" value={form.email} onChange={cambiar} required maxLength={120} autoComplete="email" placeholder="tu@email.com" />
              </label>
            </div>
            <div className="a-job__row">
              <label className="a-job__field">
                <span>Teléfono</span>
                <input type="tel" name="telefono" value={form.telefono} onChange={cambiar} maxLength={40} autoComplete="tel" placeholder="+54 9 11 1234-5678" />
              </label>
              <label className="a-job__field">
                <span>Puesto de interés <b aria-hidden="true">*</b></span>
                <select name="puesto" value={form.puesto} onChange={cambiar} required>
                  <option value="">Elegí un puesto</option>
                  {PUESTOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
            </div>
            <label className="a-job__field">
              <span>Mensaje / experiencia</span>
              <textarea name="mensaje" value={form.mensaje} onChange={cambiar} rows={5} maxLength={2000} placeholder="Contanos sobre tu experiencia, tu disponibilidad horaria y por qué te gustaría trabajar con nosotros…" />
            </label>
            <p className="a-job__err" role="alert">{error}</p>
            <button type="submit" className="a-job__submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar postulación'}</button>
          </form>
        )}
      </div>
    </section>
  );
}
