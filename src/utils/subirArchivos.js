// Helpers para subir archivos a Firebase Storage sin fundir la factura.
//
// Contexto: Storage sirve los archivos con `Cache-Control: private, max-age=0`
// salvo que se le mande metadata explícita. Con ese header ningún navegador
// cachea nada, así que cada visita vuelve a descargar todas las imágenes
// enteras y cada descarga se factura como transferencia de salida.

// Pasar SIEMPRE como tercer argumento de uploadBytes / uploadBytesResumable.
// Es seguro cachear un año porque subimos con nombre `${Date.now()}_archivo`:
// una imagen nueva siempre tiene URL nueva y se ve al instante.
export const METADATA_CACHE = { cacheControl: 'public, max-age=31536000' };

const MB = 1024 * 1024;

/** Corta subidas absurdas (había TIFFs de 341 MB en el bucket). */
export function validarPeso(file, maxMB = 25) {
  if (file.size > maxMB * MB) {
    throw new Error(
      `"${file.name}" pesa ${(file.size / MB).toFixed(1)} MB y el máximo es ${maxMB} MB. ` +
      `Si es una foto de cámara, exportala como JPG antes de subirla.`
    );
  }
}

/**
 * Redimensiona y recomprime una imagen en el navegador antes de subirla.
 * Una foto de 1 MB queda en ~100-150 KB sin diferencia visible en pantalla.
 * Los que no son imagen (video, PDF) pasan sin tocar.
 */
export async function comprimirImagen(file, { maxLado = 1600, calidad = 0.82 } = {}) {
  if (!file) return file;
  if (!file.type?.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // TIFF, RAW de cámara (.CR3), HEIC: el navegador no los decodifica y
    // tampoco los muestra, así que no tiene sentido subirlos.
    throw new Error(
      `No se puede procesar "${file.name}". Convertilo a JPG o PNG antes de subirlo.`
    );
  }

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', calidad));
  let ext = 'webp';
  if (!blob) {
    blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', calidad));
    ext = 'jpg';
  }
  if (!blob || blob.size >= file.size) return file; // si no mejora, dejamos el original

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: blob.type });
}

/** Valida el peso y comprime en un solo paso. */
export async function prepararImagen(file, opts) {
  validarPeso(file, opts?.maxMB ?? 25);
  return comprimirImagen(file, opts);
}
