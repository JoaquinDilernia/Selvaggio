# 🍷 Selvaggio - Wine Bar & Delicatessen

Sistema completo de gestión para wine bar con autoservicio, picadas premium y cava privada.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview
```

## 📁 Estructura del Proyecto

```
molina/
├── public/              # Archivos estáticos
│   ├── robots.txt      # SEO - Control de rastreo
│   ├── sitemap.xml     # SEO - Mapa del sitio
│   └── manifest.json   # PWA manifest
├── src/
│   ├── Landing/        # Landing page pública
│   ├── Admin/          # Paneles administrativos
│   ├── Caja/           # Sistema de caja
│   ├── Cocina/         # Pantalla de cocina
│   ├── components/     # Componentes reutilizables
│   ├── utils/          # Utilidades (SEO, alt text, etc)
│   └── firebase/       # Configuración Firebase
├── SEO_GUIDE.md        # Guía completa de SEO
└── SEO_RESUMEN.md      # Resumen ejecutivo SEO
```

## 🛠️ Herramientas de Desarrollo

### Organizador de Fotos
Herramienta visual para renombrar y categorizar fotos:
```
http://localhost:3000/#/organizar-fotos
```

**Uso:**
1. Abre la URL en tu navegador
2. Ve las fotos en una grilla
3. Asigna categoría y descripción a cada foto
4. Copia los comandos de PowerShell o descarga el script
5. Ejecuta en PowerShell para renombrar

### SEO Checker
Verificador de SEO en tiempo real (solo en desarrollo):
- Botón flotante "✅ SEO" en la esquina inferior derecha
- Verifica meta tags, alt text, H1, enlaces, etc.

### Cargar Datos de Prueba
```
http://localhost:3000/#/cargar-datos
```
Carga datos de ejemplo (vinos, productos, maridajes, etc.) en Firebase.

## 📸 Gestión de Imágenes

### Organizar Fotos

**Opción 1: Herramienta Visual (Recomendado)**
```bash
npm run dev
# Ir a http://localhost:3000/#/organizar-fotos
```

**Opción 2: Script PowerShell**
```powershell
.\organizar-fotos.ps1
```

**Opción 3: Manual**
```powershell
Rename-Item ".\public\WhatsApp Image 2025-12-05 at 14.33.46.jpeg" "selvaggio-hero-principal.jpeg"
```

### Categorías de Fotos
- `hero` - Foto principal del sitio
- `galeria` - Galería general
- `productos` - Quesos, fiambres, tablas
- `ambiente` - Interior del local
- `vinos` - Botellas y cava
- `eventos` - Eventos y clientes
- `og-image` - Para redes sociales (1200x630px)

## 🔑 Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Página "Próximamente" |
| `/landing` | Landing page principal |
| `/admin` | Panel admin principal |
| `/admin-contenidos` | Admin de contenidos (galería, reseñas, prensa) |
| `/caja` | Sistema de caja |
| `/cocina` | Pantalla de cocina |
| `/organizar-fotos` | Organizador de fotos |
| `/cargar-datos` | Cargar datos de prueba |

## 🎨 SEO & Performance

### Meta Tags Configurados
✅ Title y Description optimizados
✅ Open Graph (Facebook, LinkedIn)
✅ Twitter Cards
✅ Schema.org (Restaurant, Products, Reviews)
✅ Canonical URLs
✅ Geolocalización

### Archivos SEO
- `robots.txt` - Control de rastreo
- `sitemap.xml` - Mapa del sitio
- `manifest.json` - PWA ready

Ver **SEO_GUIDE.md** para más detalles.

## 🔧 Tecnologías

- **React 18** + Vite
- **React Router** para navegación
- **Firebase** (Firestore) para base de datos
- **CSS Modules** para estilos

## 📋 Tareas Pendientes

### Antes del Lanzamiento
- [ ] Completar organización de fotos reales
- [ ] Crear imágenes para SEO (og-image, icons)
- [ ] Actualizar datos reales en Schema.org (teléfono, dirección, GPS)
- [ ] Instalar Google Analytics
- [ ] Verificar Google Search Console
- [ ] Crear Google Business Profile

Ver **SEO_RESUMEN.md** para checklist completo.

## 🚀 Deploy

```bash
# Build
npm run build

# Los archivos estarán en /dist
```

**Asegurarse de:**
- ✅ Variables de entorno configuradas (Firebase)
- ✅ Archivos en /public se copian a /dist
- ✅ HTTPS habilitado
- ✅ Redirect HTTP → HTTPS

## 📱 PWA

El sitio está preparado para funcionar como PWA:
- Manifest.json configurado
- Service Worker ready
- Icons 192x192 y 512x512
- Theme colors

## 🆘 Soporte

- **SEO**: Ver `SEO_GUIDE.md`
- **Fotos**: Usar `/organizar-fotos`
- **Datos**: Usar `/cargar-datos`

---

**Selvaggio** - Wine Bar & Delicatessen

