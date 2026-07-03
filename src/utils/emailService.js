import emailjs from '@emailjs/browser';

// EmailJS config — set these in .env
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_MESAS = import.meta.env.VITE_EMAILJS_TEMPLATE_MESAS;
const TEMPLATE_CAVA = import.meta.env.VITE_EMAILJS_TEMPLATE_CAVA;
const TEMPLATE_TAKEAWAY_NOTIF = import.meta.env.VITE_EMAILJS_TEMPLATE_TAKEAWAY_NOTIF;
const TEMPLATE_EMAIL_VERIF = import.meta.env.VITE_EMAILJS_TEMPLATE_EMAIL_VERIF;
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

const formatPrecioEmail = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export async function enviarNotificacionPedidoTakeAway(pedido) {
  if (!SERVICE_ID || !TEMPLATE_TAKEAWAY_NOTIF || !PUBLIC_KEY) return;
  try {
    const items_pedido = pedido.items.map(item => {
      let linea = `${item.cantidad}× ${item.nombre}  —  ${formatPrecioEmail(item.precio * item.cantidad)}`;
      if (item.selecciones) {
        Object.values(item.selecciones).forEach(sec => {
          if (sec.items && sec.items.length > 0) {
            linea += `\n    ${sec.nombre}: ${sec.items.map(x => x.nombre).join(', ')}`;
          }
        });
      }
      return linea;
    }).join('\n\n');

    const ahora = new Date().toLocaleString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    await emailjs.send(SERVICE_ID, TEMPLATE_TAKEAWAY_NOTIF, {
      to_email: 'selvaggioba@gmail.com',
      to_name: 'Selvaggio',
      numero_pedido: pedido.numeroPedido,
      nombre_cliente: pedido.nombre + (pedido.apellido ? ' ' + pedido.apellido : ''),
      email_cliente: pedido.email,
      telefono_cliente: pedido.telefono,
      items_pedido,
      subtotal: formatPrecioEmail(pedido.subtotal),
      descuento: pedido.descuento > 0 ? `−${formatPrecioEmail(pedido.descuento)}` : '—',
      total: formatPrecioEmail(pedido.total),
      metodo_pago: pedido.metodoPago.charAt(0).toUpperCase() + pedido.metodoPago.slice(1),
      metodo_envio: pedido.metodoEnvio === 'envio'
        ? `Envío Selvaggio — ${pedido.localidadEnvio}`
        : 'Retiro en local',
      direccion_envio: pedido.metodoEnvio === 'envio'
        ? `${pedido.direccionEnvio}${pedido.pisoDeptoEnvio ? ', ' + pedido.pisoDeptoEnvio : ''}${pedido.referenciaEnvio ? ' (' + pedido.referenciaEnvio + ')' : ''}`
        : '—',
      comentarios: pedido.comentarios || '—',
      fecha_hora: ahora,
    }, PUBLIC_KEY);
  } catch (err) {
    console.error('Error enviando notificación pedido take away:', err);
  }
}

export async function enviarCodigoVerificacion(email, nombre, codigo) {
  if (!SERVICE_ID || !TEMPLATE_EMAIL_VERIF || !PUBLIC_KEY || !email) return;
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_EMAIL_VERIF, {
      to_email: email,
      to_name: nombre,
      codigo,
    }, PUBLIC_KEY);
  } catch (err) {
    console.error('Error enviando código de verificación:', err);
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
