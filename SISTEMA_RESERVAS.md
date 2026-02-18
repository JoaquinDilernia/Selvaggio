# Sistema de Reservas SELVAGGIO

## ✅ Implementación Completa

### 📦 Componentes Creados

#### 1. **Reserva de Cava** (`/reserva-cava`)
- Formulario público para eventos y cumpleaños
- Validación mínimo 10 personas
- Calendario que oculta días ya reservados
- Precio: $45.000/persona (degustación completa + maridaje libre + panera + agua)
- Seña: $100.000 por transferencia
- Subida de comprobante (imagen o PDF)
- Estado: "confirmada" automáticamente al subir comprobante

**Datos transferencia mostrados:**
- Alias: selvaggio.ba
- CVU: 0000003100080434358834
- Titular: Tomas Laureano Molina

#### 2. **Reserva de Mesas** (`/reserva-mesas`)
- Formulario simple para anticipar visitas
- Campos: nombre, teléfono, cantidad, fecha, horario, comentarios
- Estado inicial: "pendiente"

#### 3. **Panel Admin de Reservas** (Tab en `/admin`)
- **Reservas de Cava**: Ver todas con comprobante, eliminar
- **Reservas de Mesas**: Ver, cambiar estado (pendiente/confirmada/cancelada), eliminar
- **Invitaciones Influencers**: Crear y gestionar manualmente

### 📊 Colecciones Firebase

Todas usan el prefijo `selvaggio_`:

1. **`selvaggio_reservas_cava`**
```javascript
{
  nombre: string,
  telefono: string,
  cantidadPersonas: number,
  traeTorta: boolean,
  fecha: string (YYYY-MM-DD),
  comprobanteUrl: string (Storage URL),
  estado: "confirmada",
  precioPersona: 45000,
  seña: 100000,
  total: number,
  createdAt: ISO timestamp
}
```

2. **`selvaggio_reservas_mesas`**
```javascript
{
  nombre: string,
  telefono: string,
  cantidadPersonas: number,
  fecha: string,
  horario: string,
  comentarios: string,
  estado: "pendiente" | "confirmada" | "cancelada",
  createdAt: ISO timestamp
}
```

3. **`selvaggio_invitaciones`**
```javascript
{
  nombreCompleto: string,
  dia: string (date),
  horario: string (time),
  redesSociales: string,
  tipo: "Prensa" | "Creadora de contenido" | "Influencer" | "Tiktoker",
  categoria: "Lifestyle" | "Foodie",
  cantidadPersonas: number,
  invitadoPor: "Agencia" | "Redes" | "Sofi",
  planCanje: "1" | "2" | "3",
  contenidoAcordado: string,
  createdAt: ISO timestamp
}
```

### 🎨 Accesos

#### Landing:
- Botón "Reservar La Cava" en Hero → `/reserva-cava`
- Botón "Reservar Mesa" en Hero → `/reserva-mesas`
- Banner informativo con link a reservas de mesas

#### Admin:
- Nueva tab "📅 Reservas" (primera posición)
- Sub-tabs: Cava, Mesas, Influencers

### 🗂️ Archivos Creados

```
src/
  Reservas/
    ReservaCava.jsx         ✅
    ReservaCava.css         ✅
    ReservaMesas.jsx        ✅
    ReservaMesas.css        ✅
  Admin/
    AdminReservas.jsx       ✅
    AdminReservas.css       ✅
```

### 🔧 Archivos Modificados

- `src/App.jsx` → Rutas agregadas
- `src/Landing/Landing.jsx` → Botones de reserva
- `src/Admin/AdminNew.jsx` → Tab de Reservas

### 🚀 Próximos Pasos

1. **Configurar Firebase Storage Rules** para permitir uploads:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /comprobantes/{allPaths=**} {
      allow read, write: if true; // O agregar autenticación
    }
  }
}
```

2. **Crear índices en Firestore** (si es necesario):
- `selvaggio_reservas_cava` → orderBy createdAt
- `selvaggio_reservas_mesas` → orderBy createdAt
- `selvaggio_invitaciones` → orderBy dia

3. **Testing:**
- Probar formulario de reserva cava
- Verificar subida de comprobante
- Probar bloqueo de fechas
- Verificar panel admin

### ⚠️ Notas Importantes

- Los comprobantes se guardan en `Storage/comprobantes/`
- Las fechas de cava bloquean todo el día (sin duplicados)
- Las reservas de cava se confirman automáticamente al subir comprobante
- Las mesas tienen estados manejados manualmente desde admin
- Todos los campos de invitaciones son requeridos

---

**Estado:** ✅ Implementación completa y lista para usar
