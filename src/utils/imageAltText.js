/**
 * Generador de alt text descriptivo para imágenes
 * basado en el contexto del producto/vino/foto
 */

/**
 * Genera alt text para vinos
 * @param {Object} vino - Objeto del vino
 * @returns {string} Alt text optimizado
 */
export const generateVinoAltText = (vino) => {
  return `${vino.nombre} - ${vino.varietal} de ${vino.bodega} | Selvaggio Wine Bar`;
};

/**
 * Genera alt text para productos (quesos, fiambres)
 * @param {Object} producto - Objeto del producto
 * @returns {string} Alt text optimizado
 */
export const generateProductoAltText = (producto) => {
  const categoria = producto.categoria?.toLowerCase() || 'producto';
  return `${producto.nombre} - ${categoria} de ${producto.origen} | Selvaggio Delicatessen`;
};

/**
 * Genera alt text para galería
 * @param {Object} foto - Objeto de la foto
 * @returns {string} Alt text optimizado
 */
export const generateGaleriaAltText = (foto) => {
  return `${foto.titulo} - ${foto.descripcion || ''} | Selvaggio ${foto.categoria}`;
};

/**
 * Genera title text para imágenes (aparece en hover)
 * @param {Object} item - Objeto del item
 * @param {string} type - Tipo de item (vino, producto, galeria)
 * @returns {string} Title text
 */
export const generateImageTitle = (item, type) => {
  switch (type) {
    case 'vino':
      return `${item.nombre} - ${item.descripcion}`;
    case 'producto':
      return `${item.nombre} - ${item.descripcion}`;
    case 'galeria':
      return item.titulo;
    default:
      return item.nombre || item.titulo;
  }
};

/**
 * Genera nombre de archivo optimizado para SEO
 * @param {string} nombre - Nombre original
 * @param {string} tipo - Tipo de contenido
 * @returns {string} Nombre de archivo optimizado
 */
export const generateSEOFileName = (nombre, tipo) => {
  const slug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales
    .replace(/^-+|-+$/g, ''); // Remover guiones al inicio/final
  
  return `selvaggio-${tipo}-${slug}.jpg`;
};

/**
 * Genera texto descriptivo completo para accesibilidad
 * @param {Object} item - Objeto del item
 * @param {string} context - Contexto adicional
 * @returns {string} Descripción completa
 */
export const generateAccessibleDescription = (item, context = '') => {
  let description = item.nombre || item.titulo || '';
  
  if (item.descripcion) {
    description += `. ${item.descripcion}`;
  }
  
  if (item.precio) {
    description += `. Precio: $${item.precio}`;
  }
  
  if (context) {
    description += `. ${context}`;
  }
  
  return description;
};

/**
 * Valida si una imagen tiene alt text apropiado
 * @param {string} altText - Alt text a validar
 * @returns {boolean} Es válido
 */
export const validateAltText = (altText) => {
  if (!altText || altText.trim().length === 0) {
    console.warn('⚠️ Imagen sin alt text');
    return false;
  }
  
  if (altText.length < 10) {
    console.warn('⚠️ Alt text muy corto:', altText);
    return false;
  }
  
  if (altText.length > 125) {
    console.warn('⚠️ Alt text muy largo (>125 caracteres):', altText);
    return false;
  }
  
  // Evitar palabras redundantes
  const redundantWords = ['imagen de', 'foto de', 'picture of', 'image of'];
  const hasRedundant = redundantWords.some(word => 
    altText.toLowerCase().includes(word)
  );
  
  if (hasRedundant) {
    console.warn('⚠️ Alt text contiene palabras redundantes:', altText);
  }
  
  return true;
};

export default {
  generateVinoAltText,
  generateProductoAltText,
  generateGaleriaAltText,
  generateImageTitle,
  generateSEOFileName,
  generateAccessibleDescription,
  validateAltText
};
