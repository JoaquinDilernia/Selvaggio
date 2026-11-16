import admin from 'firebase-admin';
import { getDb } from './firebase.service.js';

// Contenido de la web que se carga desde el admin de la web actual
// (galería, prensa) y el formulario de "Trabajá con nosotros". La web v2 lo
// pide al server en vez de leer Firestore desde el navegador.

const COL = {
  galeria: 'selvaggio_galeria',
  prensa: 'selvaggio_prensa',
  postulaciones: 'selvaggio_postulaciones',
  postulacionesPrueba: 'bot-selvaggio_v2_postulaciones_prueba',
};

// Mismas opciones que el formulario de la web actual (las lee Gestión).
export const PUESTOS = ['Sommelier/Bartender', 'Cocina', 'Atención al público', 'Limpieza', 'Administración', 'Otro'];

const visibles = snap => snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.visible !== false);

export async function galeriaPublica() {
  const items = visibles(await getDb().collection(COL.galeria).get())
    .filter(f => typeof f.url === 'string' && f.url)
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
    .map(f => ({ id: f.id, url: f.url, titulo: f.titulo ?? '' }));
  return { fotos: items };
}

export async function prensaPublica() {
  const items = visibles(await getDb().collection(COL.prensa).get())
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
    .map(n => ({
      id: n.id,
      medio: n.medio ?? '',
      titulo: n.titulo ?? '',
      descripcion: n.descripcion ?? '',
      fecha: n.fecha ?? '',
      url: n.url ?? '',
      imagen: n.imagen ?? '',
    }));
  return { notas: items };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validarPostulacion(datos = {}) {
  const p = {
    nombre: texto(datos.nombre, 100),
    email: texto(datos.email, 120).toLowerCase(),
    telefono: texto(datos.telefono, 40),
    puesto: texto(datos.puesto, 40),
    mensaje: texto(datos.mensaje, 2000),
  };
  const errores = [];
  if (p.nombre.length < 2) errores.push('Falta tu nombre');
  if (!EMAIL_RE.test(p.email)) errores.push('El email no es válido');
  if (!PUESTOS.includes(p.puesto)) errores.push('Elegí un puesto de la lista');
  if (errores.length) throw Object.assign(new Error(errores.join('; ')), { status: 400 });
  return p;
}

export async function crearPostulacion(datos, { pruebaV2 = false } = {}) {
  const p = validarPostulacion(datos);
  const ref = await getDb().collection(pruebaV2 ? COL.postulacionesPrueba : COL.postulaciones).add({
    ...p,
    fecha: admin.firestore.Timestamp.now(),
    estado: 'pendiente',
    origen: 'web-v2',
  });
  return { ok: true, id: ref.id, prueba: pruebaV2 };
}
