# SEO Implementation Guide - Selvaggio

## 📋 Resumen de Mejoras SEO Implementadas

### ✅ Meta Tags Optimizados

#### Meta Tags Básicos
- **Title**: Optimizado con palabras clave principales
- **Description**: Descriptivo y dentro del límite de 155-160 caracteres
- **Keywords**: Palabras clave relevantes al negocio
- **Language**: Configurado para español (es)
- **Theme Color**: Color corporativo (#430a33)

#### Open Graph (Facebook, LinkedIn)
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:url" content="..." />
```

#### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="..." />
```

### 📍 Geolocalización
- Meta tags de geolocalización configurados para Buenos Aires
- Coordenadas GPS incluidas para mejor ranking local

### 🗺️ Archivos Creados

#### `robots.txt`
- Permite rastreo de páginas públicas
- Bloquea secciones administrativas
- Referencia al sitemap

#### `sitemap.xml`
- URLs principales del sitio
- Frecuencia de actualización
- Prioridades configuradas
- **Importante**: Actualizar fechas cuando haya cambios

#### `manifest.json`
- Progressive Web App (PWA) ready
- Iconos configurados
- Theme colors
- Mejora experiencia móvil

#### `.htaccess` / `_headers`
- Compresión GZIP/Brotli
- Cache de navegador
- Headers de seguridad
- Redirect HTTPS
- Manejo de rutas React

### 🔧 Utilidades SEO (`src/utils/seo.js`)

#### Funciones Disponibles

```javascript
import { updateAllSEO, generateProductSchema, generateReviewsSchema } from './utils/seo';

// Actualizar SEO de una página
updateAllSEO({
  title: 'Título de la Página',
  description: 'Descripción breve...',
  image: 'https://...',
  url: 'https://...'
});

// Generar Schema para productos
const productSchema = generateProductSchema(producto);

// Generar Schema para reseñas
const reviewsSchema = generateReviewsSchema(reseñas);
```

### 📊 Schema.org (Structured Data)

#### Restaurant Schema
Configurado en `index.html` con:
- Nombre del negocio
- Dirección
- Teléfono
- Horarios de apertura
- Tipo de cocina
- Geolocalización

#### Product Schema
Genera automáticamente para cada producto:
- Nombre
- Descripción
- Marca/Bodega
- Precio
- Disponibilidad

#### Review Schema
Genera para las reseñas:
- Rating promedio
- Cantidad de reseñas
- Reseñas individuales

## 🎯 Próximos Pasos

### 1. Imágenes para SEO
Crear y agregar:
- [ ] `/public/og-image.jpg` (1200x630px) - Para Open Graph
- [ ] `/public/twitter-image.jpg` (1200x600px) - Para Twitter Card
- [ ] `/public/icon-192.png` (192x192px) - PWA icon
- [ ] `/public/icon-512.png` (512x512px) - PWA icon
- [ ] `/public/logo.jpg` - Logo del restaurante

**Recomendaciones de imágenes:**
- Formato: JPG para fotos, PNG para logos
- Optimizar tamaño (usar TinyPNG o similar)
- Incluir alt text descriptivo
- Nombres de archivo descriptivos (ej: `selvaggio-tabla-quesos.jpg`)

### 2. Datos del Negocio
Actualizar en `index.html` la información real:
```javascript
"telephone": "+54-11-XXXX-XXXX",
"streetAddress": "Dirección Real",
"postalCode": "XXXX",
"geo": {
  "latitude": -34.603722,  // Coordenadas reales
  "longitude": -58.381592
}
```

### 3. Google Tools

#### Google Search Console
1. Verificar propiedad del sitio
2. Enviar sitemap: `https://selvaggio.com.ar/sitemap.xml`
3. Monitorear indexación
4. Revisar errores de rastreo

#### Google Business Profile
1. Crear perfil del negocio
2. Verificar ubicación
3. Agregar fotos
4. Configurar horarios
5. Solicitar reseñas

#### Google Analytics 4
```javascript
// Agregar en index.html antes de </head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 4. Redes Sociales
- [ ] Facebook Business Page
- [ ] Instagram Business
- [ ] Google Business Profile
- [ ] TripAdvisor (si aplica)

### 5. Performance

#### Optimización de Imágenes
```bash
# Instalar herramienta de optimización
npm install --save-dev vite-plugin-imagemin

# Configurar en vite.config.js
import viteImagemin from 'vite-plugin-imagemin'

plugins: [
  viteImagemin({
    gifsicle: { optimizationLevel: 7 },
    optipng: { optimizationLevel: 7 },
    mozjpeg: { quality: 80 },
    svgo: { plugins: [{ removeViewBox: false }] },
    webp: { quality: 80 }
  })
]
```

#### Lazy Loading
Agregar a imágenes:
```jsx
<img src="..." alt="..." loading="lazy" />
```

### 6. Core Web Vitals

Métricas a monitorear:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

Herramientas:
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [WebPageTest](https://www.webpagetest.org/)

## 📱 Mobile-First

### Checklist
- [x] Viewport meta tag configurado
- [x] Diseño responsive
- [ ] Prueba en diferentes dispositivos
- [ ] Touch targets > 48px
- [ ] Texto legible sin zoom
- [x] PWA manifest

### Pruebas Recomendadas
- Chrome DevTools (Mobile simulation)
- Real device testing
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

## 🔐 Seguridad

Headers configurados:
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection: 1; mode=block
- [x] Referrer-Policy
- [x] HTTPS redirect

## 📈 Monitoreo

### KPIs a Seguir
1. **Ranking de palabras clave**
   - "wine bar buenos aires"
   - "quesos importados"
   - "picadas gourmet"
   
2. **Tráfico orgánico**
   - Sesiones
   - Usuarios nuevos
   - Bounce rate
   
3. **Conversiones**
   - Consultas vía formulario
   - Clicks en WhatsApp
   - Newsletter subscriptions

### Herramientas
- Google Search Console
- Google Analytics
- Google Business Insights
- SEMrush / Ahrefs (opcional)

## 🎨 Contenido

### Blog (Futuro)
Temas recomendados:
- Maridajes perfectos
- Historia de quesos franceses
- Guía de vinos argentinos
- Recetas con productos gourmet
- Eventos y catas

### Palabras Clave Objetivo
**Principales:**
- wine bar buenos aires
- quesos importados
- picadas gourmet
- maridajes vinos

**Long-tail:**
- mejor wine bar fondo de la legua
- dónde comprar quesos franceses buenos aires
- tabla de quesos y vinos
- cava privada eventos

## 📞 Contacto y Ubicación

Asegurarse que esté visible:
- [x] Dirección completa
- [ ] Teléfono clickeable
- [x] WhatsApp flotante
- [ ] Mapa embebido (Google Maps)
- [ ] Horarios de atención
- [ ] Botón de reservas

## ✅ Checklist Final

Antes de lanzar:
- [ ] Todas las imágenes optimizadas
- [ ] Datos reales en Schema.org
- [ ] Google Analytics instalado
- [ ] Google Search Console verificado
- [ ] Sitemap enviado
- [ ] robots.txt accesible
- [ ] HTTPS funcionando
- [ ] Test mobile-friendly passed
- [ ] PageSpeed score > 80
- [ ] Alt text en todas las imágenes
- [ ] Meta descriptions únicas por página
- [ ] Enlaces internos funcionando
- [ ] 404 page configurada
- [ ] Favicon visible

---

## 🚀 Deploy

Al hacer deploy, verificar:
1. ✅ Todos los archivos en `/public` se copian correctamente
2. ✅ URLs canónicas apuntan al dominio de producción
3. ✅ Redirect HTTP → HTTPS funciona
4. ✅ Sitemap accesible en `/sitemap.xml`
5. ✅ robots.txt accesible en `/robots.txt`

## 📚 Recursos

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Web.dev](https://web.dev/)
- [MDN Web Docs - SEO](https://developer.mozilla.org/en-US/docs/Glossary/SEO)

---

**Última actualización**: Diciembre 2025
