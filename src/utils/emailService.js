import emailjs from '@emailjs/browser';

// EmailJS config — set these in .env
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_MESAS = import.meta.env.VITE_EMAILJS_TEMPLATE_MESAS;
const TEMPLATE_CAVA = import.meta.env.VITE_EMAILJS_TEMPLATE_CAVA;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export async function enviarConfirmacionMesas(data) {
  if (!SERVICE_ID || !TEMPLATE_MESAS || !PUBLIC_KEY || !data.email) return;
  try {
    const fechaFormateada = data.fecha
      ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      : '';
    await emailjs.send(SERVICE_ID, TEMPLATE_MESAS, {
      to_email: data.email,
      to_name: data.nombre + (data.apellido ? ' ' + data.apellido : ''),
      fecha: fechaFormateada,
      horario: data.horario || '',
      personas: data.cantidadPersonas || '',
      preferencia: data.preferencia || '',
      comentarios: data.comentarios || '',
    }, PUBLIC_KEY);
  } catch (err) {
    console.error('Error enviando email confirmación mesas:', err);
  }
}

export async function enviarConfirmacionCava(data) {
  if (!SERVICE_ID || !TEMPLATE_CAVA || !PUBLIC_KEY || !data.email) return;
  try {
    const fechaFormateada = data.fecha
      ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      : '';
    await emailjs.send(SERVICE_ID, TEMPLATE_CAVA, {
      to_email: data.email,
      to_name: data.nombre || '',
      fecha: fechaFormateada,
      horario: data.horario || '',
      personas: data.cantidadPersonas || '',
    }, PUBLIC_KEY);
  } catch (err) {
    console.error('Error enviando email confirmación cava:', err);
  }
}
