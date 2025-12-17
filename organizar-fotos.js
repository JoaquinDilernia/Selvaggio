/**
 * Script para organizar y renombrar fotos de WhatsApp
 * Uso: node organizar-fotos.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');

// Obtener todas las imágenes de WhatsApp
const files = fs.readdirSync(publicDir).filter(f => f.startsWith('WhatsApp Image'));

console.log('📸 Fotos encontradas:', files.length);
console.log('\n🗂️  ORGANIZACIÓN SUGERIDA:\n');

// Categorías sugeridas
const categorias = {
  'galeria': '📸 Galería general',
  'productos': '🧀 Productos (quesos, fiambres, tablas)',
  'ambiente': '🏠 Ambiente del local',
  'vinos': '🍷 Vinos y botellas',
  'eventos': '🎉 Eventos y gente',
  'hero': '⭐ Hero/Principal',
  'og': '🔗 Open Graph (redes sociales)'
};

console.log('Categorías disponibles:');
Object.entries(categorias).forEach(([key, desc]) => {
  console.log(`  ${key}: ${desc}`);
});

console.log('\n📝 INSTRUCCIONES:');
console.log('1. Revisa las fotos en /public');
console.log('2. Edita este archivo y completa el array "renombrar" abajo');
console.log('3. Ejecuta: node organizar-fotos.js --rename');
console.log('\n---\n');

// Array para configurar el renombrado
// Formato: [nombreActual, nuevaCategoria, descripcionCorta]
const renombrar = [
  // Ejemplo:
  // ['WhatsApp Image 2025-12-05 at 14.33.46.jpeg', 'hero', 'principal'],
  // ['WhatsApp Image 2025-12-05 at 14.33.47.jpeg', 'productos', 'tabla-quesos'],
  // ['WhatsApp Image 2025-12-05 at 14.33.48.jpeg', 'ambiente', 'interior-1'],
  
  // COMPLETA AQUÍ TUS FOTOS:
  
];

// Si se ejecuta con --rename, hacer el renombrado
if (process.argv.includes('--rename')) {
  if (renombrar.length === 0) {
    console.log('⚠️  No hay archivos configurados para renombrar');
    console.log('Edita el array "renombrar" en este archivo primero.');
    process.exit(1);
  }

  console.log('🔄 Renombrando archivos...\n');
  
  renombrar.forEach(([original, categoria, descripcion]) => {
    const extension = path.extname(original);
    const nuevoNombre = `selvaggio-${categoria}-${descripcion}${extension}`;
    const rutaOriginal = path.join(publicDir, original);
    const rutaNueva = path.join(publicDir, nuevoNombre);

    if (fs.existsSync(rutaOriginal)) {
      fs.renameSync(rutaOriginal, rutaNueva);
      console.log(`✅ ${original}`);
      console.log(`   → ${nuevoNombre}\n`);
    } else {
      console.log(`❌ No encontrado: ${original}\n`);
    }
  });

  console.log('✨ ¡Renombrado completado!');
} else {
  // Listar archivos actuales
  console.log('📋 FOTOS ACTUALES EN /public:\n');
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  console.log('\n💡 TIP: Abre las fotos y decide qué categoría corresponde a cada una');
  console.log('Luego edita este archivo y ejecuta: node organizar-fotos.js --rename\n');
}
