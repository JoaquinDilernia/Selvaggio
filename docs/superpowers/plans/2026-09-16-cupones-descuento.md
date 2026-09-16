# Cupones de descuento para Take Away — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear y administrar cupones de descuento (% o monto fijo, con límites de uso y vigencia) desde el Admin, y que se puedan aplicar en el checkout de Take Away, con estadísticas de uso por cupón.

**Architecture:** Todo corre client-side contra Firestore (sin backend propio), igual que el resto del sitio. La lógica de cupones vive en un módulo compartido (`src/utils/cupones.js`) usado tanto por el checkout de Take Away como, indirectamente, por el Admin. El canje se hace en una única transacción de Firestore que crea el pedido y actualiza los contadores del cupón de forma atómica, para que dos clientes no puedan pisarse el último uso disponible.

**Tech Stack:** React 19, Firebase v12 (Firestore, SDK modular `firebase/firestore`), Vite. Sin test runner en el proyecto (no hay Jest/Vitest) — cada tarea se verifica manualmente en `npm run dev`, con pasos y valores concretos a comprobar.

**Spec:** `docs/superpowers/specs/2026-09-16-cupones-descuento-design.md`

## Global Constraints

- El ID del documento de cada cupón en `selvaggio_cupones` es el código en mayúsculas (no un ID autogenerado).
- El descuento del cupón se aplica sobre el subtotal, y el 10% de efectivo se aplica sobre el subtotal ya descontado por el cupón (subtotales encadenados, no se suman sobre el mismo monto).
- La validación final de límites (usos totales, usos por cliente) se hace siempre dentro de una `runTransaction` de Firestore al confirmar el pedido — la validación al aplicar el cupón en el formulario es solo un preview, nunca la fuente de verdad.
- `canjearCupon(...)` es el único camino para crear un pedido de Take Away desde el checkout, tenga o no cupón aplicado (no hay una rama de código separada para "pedido sin cupón").
- Los montos de descuento se redondean con `Math.round` (igual que el descuento de efectivo existente).
- No se toca la lógica de Reservas ni de pedidos de mesa/salón (`selvaggio_pedidos`) — esto es exclusivo de Take Away.

---

### Task 1: Módulo `src/utils/cupones.js`

**Files:**
- Create: `src/utils/cupones.js`

**Interfaces:**
- Produces (usado por las Tasks 2-5):
  - `class CuponInvalidoError extends Error` con propiedad `.motivo: string`
  - `sanitizeEmailCupon(email: string): string`
  - `async buscarCupon(codigo: string): Promise<{ id: string, ...camposDelCupon } | null>`
  - `calcularDescuentoCupon(cupon: object, subtotal: number): number`
  - `validarCupon(cupon: object, { subtotal: number, cantidadUsosCliente: number }): { valido: boolean, motivo?: string }`
  - `async obtenerUsosCliente(cuponId: string, email: string): Promise<number>`
  - `async canjearCupon({ cuponId: string|null, email: string, subtotal: number, pedidoData: object }): Promise<{ pedidoRef: DocumentReference, numeroPedido: string }>`

No hay tests automatizados en el proyecto (ver Tech Stack). Esta tarea se verifica con un repaso de código contra la tabla de casos de abajo; el comportamiento real se termina de confirmar de punta a punta en las Tasks 4 y 5, cuando hay UI para crear cupones y usarlos.

- [ ] **Step 1: Escribir el módulo completo**

```js
// src/utils/cupones.js
import {
  doc, getDoc, collection, runTransaction, increment, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export class CuponInvalidoError extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = 'CuponInvalidoError';
    this.motivo = motivo;
  }
}

export const sanitizeEmailCupon = (email) => (email || '').toLowerCase().trim();

const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export async function buscarCupon(codigoRaw) {
  const codigo = (codigoRaw || '').toUpperCase().trim();
  if (!codigo) return null;
  const snap = await getDoc(doc(db, 'selvaggio_cupones', codigo));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function calcularDescuentoCupon(cupon, subtotal) {
  if (!cupon || subtotal <= 0) return 0;
  if (cupon.tipoDescuento === 'porcentaje') {
    return Math.round(subtotal * (cupon.valor || 0) / 100);
  }
  return Math.min(cupon.valor || 0, subtotal);
}

export function validarCupon(cupon, { subtotal, cantidadUsosCliente = 0 }) {
  if (!cupon.activo) return { valido: false, motivo: 'este cupón no está activo' };

  const hoy = new Date().toISOString().split('T')[0];
  if (cupon.fechaDesde && hoy < cupon.fechaDesde) {
    return { valido: false, motivo: 'este cupón todavía no está vigente' };
  }
  if (cupon.fechaHasta && hoy > cupon.fechaHasta) {
    return { valido: false, motivo: 'este cupón ya venció' };
  }
  if (cupon.montoMinimo && subtotal < cupon.montoMinimo) {
    return { valido: false, motivo: `requiere una compra mínima de ${formatARS(cupon.montoMinimo)}` };
  }
  if (cupon.limiteUsosTotal != null && (cupon.usosTotales || 0) >= cupon.limiteUsosTotal) {
    return { valido: false, motivo: 'este cupón alcanzó el límite de usos' };
  }
  if (cupon.limiteUsosPorCliente != null && cantidadUsosCliente >= cupon.limiteUsosPorCliente) {
    return { valido: false, motivo: 'ya alcanzaste el límite de usos de este cupón' };
  }
  return { valido: true };
}

export async function obtenerUsosCliente(cuponId, email) {
  const emailSanitizado = sanitizeEmailCupon(email);
  if (!cuponId || !emailSanitizado) return 0;
  const snap = await getDoc(doc(db, 'selvaggio_cupones', cuponId, 'usosPorCliente', emailSanitizado));
  return snap.exists() ? (snap.data().cantidad || 0) : 0;
}

export async function canjearCupon({ cuponId, email, subtotal, pedidoData }) {
  const pedidoRef = doc(collection(db, 'selvaggio_takeaway_pedidos'));
  const numeroPedido = 'TW-' + pedidoRef.id.slice(-6).toUpperCase();
  const emailSanitizado = sanitizeEmailCupon(email);

  await runTransaction(db, async (tx) => {
    let cupon = null;
    let cuponRef = null;
    let usosClienteRef = null;

    if (cuponId) {
      cuponRef = doc(db, 'selvaggio_cupones', cuponId);
      const cuponSnap = await tx.get(cuponRef);
      if (!cuponSnap.exists()) throw new CuponInvalidoError('el cupón ya no existe');
      cupon = { id: cuponSnap.id, ...cuponSnap.data() };

      let cantidadUsosCliente = 0;
      if (emailSanitizado) {
        usosClienteRef = doc(db, 'selvaggio_cupones', cuponId, 'usosPorCliente', emailSanitizado);
        const usosSnap = await tx.get(usosClienteRef);
        cantidadUsosCliente = usosSnap.exists() ? (usosSnap.data().cantidad || 0) : 0;
      }

      const { valido, motivo } = validarCupon(cupon, { subtotal, cantidadUsosCliente });
      if (!valido) throw new CuponInvalidoError(motivo);
    }

    tx.set(pedidoRef, { ...pedidoData, numeroPedido });

    if (cupon) {
      const descuentoCupon = pedidoData.descuentoCupon || 0;
      tx.update(cuponRef, {
        usosTotales: increment(1),
        montoDescontadoTotal: increment(descuentoCupon),
        ingresosGenerados: increment(pedidoData.total || 0),
      });
      if (usosClienteRef) {
        tx.set(usosClienteRef, { cantidad: increment(1) }, { merge: true });
      }
      const usoLogRef = doc(collection(db, 'selvaggio_cupones', cuponId, 'usos'));
      tx.set(usoLogRef, {
        email: emailSanitizado,
        nombre: `${pedidoData.nombre || ''}${pedidoData.apellido ? ' ' + pedidoData.apellido : ''}`,
        pedidoId: pedidoRef.id,
        numeroPedido,
        descuentoAplicado: descuentoCupon,
        totalPedido: pedidoData.total || 0,
        fecha: Timestamp.now(),
      });
    }
  });

  return { pedidoRef, numeroPedido };
}
```

- [ ] **Step 2: Repasar contra esta tabla de casos** (verificación manual, sin runner — leer el código y confirmar que cada fila se cumple)

| Entrada a `validarCupon` | Resultado esperado |
|---|---|
| `activo: false` | `{ valido: false, motivo: 'este cupón no está activo' }` |
| `fechaDesde` mañana | `valido: false`, "todavía no está vigente" |
| `fechaHasta` ayer | `valido: false`, "ya venció" |
| `montoMinimo: 5000`, `subtotal: 3000` | `valido: false`, "requiere una compra mínima..." |
| `limiteUsosTotal: 10`, `usosTotales: 10` | `valido: false`, "alcanzó el límite de usos" |
| `limiteUsosPorCliente: 1`, `cantidadUsosCliente: 1` | `valido: false`, "ya alcanzaste el límite..." |
| Todo dentro de los límites | `{ valido: true }` |

| Entrada a `calcularDescuentoCupon` | Resultado esperado |
|---|---|
| `{ tipoDescuento: 'porcentaje', valor: 10 }`, `subtotal: 8530` | `853` (`Math.round(853)`) |
| `{ tipoDescuento: 'monto_fijo', valor: 2000 }`, `subtotal: 1500` | `1500` (no puede superar el subtotal) |
| `{ tipoDescuento: 'monto_fijo', valor: 2000 }`, `subtotal: 9000` | `2000` |

- [ ] **Step 3: Commit**

```bash
git add src/utils/cupones.js
git commit -m "feat: agregar modulo de logica de cupones de descuento"
```

---

### Task 2: Admin — tab "Cupones" (listado, alta, edición, activar/desactivar, eliminar)

**Files:**
- Create: `src/Admin/tabs/CuponesTab.jsx`
- Modify: `src/Admin/AdminNew.jsx:14` (import), `src/Admin/AdminNew.jsx:19-31` (array `tabs`)

**Interfaces:**
- Consumes: ninguna de las funciones de `cupones.js` (esta tarea escribe directo a Firestore, igual que los demás tabs del Admin — ver `EventosTab.jsx` como referencia de patrón).
- Produces: documentos en `selvaggio_cupones` con la forma exacta descripta en el spec (sección "Modelo de datos"), que la Task 1 y las Tasks 4-5 dan por sentada.

- [ ] **Step 1: Crear `CuponesTab.jsx`**

```jsx
// src/Admin/tabs/CuponesTab.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TabsShared.css';

const FORM_INICIAL = {
  codigo: '', tipoDescuento: 'porcentaje', valor: '',
  activo: true, fechaDesde: '', fechaHasta: '', montoMinimo: '',
  limiteUsosTotal: '', limiteUsosPorCliente: '', descripcion: '',
};

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

function CuponesTab() {
  const [cupones, setCupones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // id del cupón (código) o null
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_cupones'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.creado?.toMillis?.() || 0) - (a.creado?.toMillis?.() || 0));
      setCupones(items);
    } catch (err) {
      console.error('Error cargando cupones:', err);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => { setForm(FORM_INICIAL); setEditando(null); setShowForm(false); };

  const editar = (c) => {
    setForm({
      codigo: c.id,
      tipoDescuento: c.tipoDescuento || 'porcentaje',
      valor: c.valor ?? '',
      activo: c.activo !== false,
      fechaDesde: c.fechaDesde || '',
      fechaHasta: c.fechaHasta || '',
      montoMinimo: c.montoMinimo || '',
      limiteUsosTotal: c.limiteUsosTotal ?? '',
      limiteUsosPorCliente: c.limiteUsosPorCliente ?? '',
      descripcion: c.descripcion || '',
    });
    setEditando(c.id);
    setShowForm(true);
  };

  const guardar = async () => {
    const codigo = form.codigo.toUpperCase().trim().replace(/\s+/g, '');
    if (!codigo || !form.valor) { alert('Completá al menos código y valor del descuento'); return; }

    setGuardando(true);
    try {
      const data = {
        codigo,
        tipoDescuento: form.tipoDescuento,
        valor: Number(form.valor),
        activo: form.activo,
        fechaDesde: form.fechaDesde || '',
        fechaHasta: form.fechaHasta || '',
        montoMinimo: form.montoMinimo ? Number(form.montoMinimo) : 0,
        limiteUsosTotal: form.limiteUsosTotal ? Number(form.limiteUsosTotal) : null,
        limiteUsosPorCliente: form.limiteUsosPorCliente ? Number(form.limiteUsosPorCliente) : null,
        descripcion: form.descripcion || '',
      };

      if (editando) {
        await updateDoc(doc(db, 'selvaggio_cupones', editando), data);
      } else {
        const existente = await getDoc(doc(db, 'selvaggio_cupones', codigo));
        if (existente.exists()) { alert(`Ya existe un cupón con el código "${codigo}"`); setGuardando(false); return; }
        await setDoc(doc(db, 'selvaggio_cupones', codigo), {
          ...data,
          usosTotales: 0,
          montoDescontadoTotal: 0,
          ingresosGenerados: 0,
          creado: Timestamp.now(),
        });
      }
      await cargar();
      resetForm();
    } catch (err) {
      console.error('Error guardando cupón:', err);
      alert('Error al guardar el cupón');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (c) => {
    try {
      await updateDoc(doc(db, 'selvaggio_cupones', c.id), { activo: !c.activo });
      setCupones(cupones.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x));
    } catch {
      alert('Error al actualizar el cupón');
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón "${c.id}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'selvaggio_cupones', c.id));
      setCupones(cupones.filter(x => x.id !== c.id));
    } catch {
      alert('Error al eliminar el cupón');
    }
  };

  const vigencia = (c) => {
    if (!c.fechaDesde && !c.fechaHasta) return 'Sin límite';
    return `${c.fechaDesde || '…'} → ${c.fechaHasta || '…'}`;
  };

  return (
    <div className="tab-inner">
      <div className="tab-header">
        <h2>🎟️ Cupones</h2>
        <p>Creá y gestioná cupones de descuento para Take Away.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-box highlight"><div className="stat-num">{cupones.filter(c => c.activo).length}</div><div className="stat-label">Activos</div></div>
        <div className="stat-box"><div className="stat-num">{cupones.length}</div><div className="stat-label">Total</div></div>
        <div className="stat-box"><div className="stat-num">{cupones.reduce((a, c) => a + (c.usosTotales || 0), 0)}</div><div className="stat-label">Usos totales</div></div>
        <div className="stat-box"><div className="stat-num">{fmt(cupones.reduce((a, c) => a + (c.montoDescontadoTotal || 0), 0))}</div><div className="stat-label">Descontado</div></div>
      </div>

      {!showForm && <button className="btn-action" onClick={() => setShowForm(true)}>+ Nuevo cupón</button>}

      {showForm && (
        <div className="cal-form" style={{ marginBottom: 28 }}>
          <h3 className="cal-form__title">{editando ? '✏️ Editar cupón' : '🆕 Nuevo cupón'}</h3>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Código *</label>
              <input type="text" value={form.codigo} disabled={!!editando}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ej: PROMO10" />
            </div>
            <div className="cal-form__field">
              <label>Tipo de descuento *</label>
              <select value={form.tipoDescuento} onChange={e => setForm(p => ({ ...p, tipoDescuento: e.target.value }))}>
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="monto_fijo">Monto fijo ($)</option>
              </select>
            </div>
            <div className="cal-form__field">
              <label>Valor *</label>
              <input type="number" min="1" value={form.valor}
                onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                placeholder={form.tipoDescuento === 'porcentaje' ? 'Ej: 10' : 'Ej: 2000'} />
            </div>
          </div>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Vigente desde</label>
              <input type="date" value={form.fechaDesde} onChange={e => setForm(p => ({ ...p, fechaDesde: e.target.value }))} />
            </div>
            <div className="cal-form__field">
              <label>Vigente hasta</label>
              <input type="date" value={form.fechaHasta} onChange={e => setForm(p => ({ ...p, fechaHasta: e.target.value }))} />
            </div>
            <div className="cal-form__field">
              <label>Compra mínima ($)</label>
              <input type="number" min="0" value={form.montoMinimo} onChange={e => setForm(p => ({ ...p, montoMinimo: e.target.value }))} placeholder="Sin mínimo" />
            </div>
          </div>

          <div className="cal-form__row">
            <div className="cal-form__field">
              <label>Límite de usos totales</label>
              <input type="number" min="1" value={form.limiteUsosTotal} onChange={e => setForm(p => ({ ...p, limiteUsosTotal: e.target.value }))} placeholder="Sin límite" />
            </div>
            <div className="cal-form__field">
              <label>Límite de usos por cliente</label>
              <input type="number" min="1" value={form.limiteUsosPorCliente} onChange={e => setForm(p => ({ ...p, limiteUsosPorCliente: e.target.value }))} placeholder="Sin límite" />
            </div>
          </div>

          <div className="cal-form__field">
            <label>Descripción interna</label>
            <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Nota para uso interno, no se muestra al cliente" />
          </div>

          <div className="cal-form__field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
              Activo
            </label>
          </div>

          <div className="cal-form__actions">
            <button className="btn-action" onClick={guardar} disabled={guardando}>{editando ? 'Guardar cambios' : 'Crear cupón'}</button>
            <button className="btn-action btn-danger" onClick={resetForm}>Cancelar</button>
          </div>
        </div>
      )}

      {cargando ? (
        <div className="loading-state">Cargando...</div>
      ) : cupones.length === 0 ? (
        <div className="empty-state">No hay cupones creados aún.</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th><th>Tipo</th><th>Valor</th><th>Activo</th><th>Vigencia</th>
                <th>Usos</th><th>Descontado</th><th>Ingresos</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cupones.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.id}</strong></td>
                  <td>{c.tipoDescuento === 'porcentaje' ? '%' : '$ fijo'}</td>
                  <td>{c.tipoDescuento === 'porcentaje' ? `${c.valor}%` : fmt(c.valor)}</td>
                  <td>
                    <button className="btn-action" onClick={() => toggleActivo(c)}>
                      {c.activo ? '✓ Activo' : '✕ Inactivo'}
                    </button>
                  </td>
                  <td>{vigencia(c)}</td>
                  <td>{c.usosTotales || 0}{c.limiteUsosTotal != null ? ` / ${c.limiteUsosTotal}` : ''}</td>
                  <td>{fmt(c.montoDescontadoTotal)}</td>
                  <td>{fmt(c.ingresosGenerados)}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-action" onClick={() => editar(c)} title="Editar">✏️</button>
                    <button className="btn-action btn-danger-sm" onClick={() => eliminar(c)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CuponesTab;
```

- [ ] **Step 2: Registrar el tab en `AdminNew.jsx`**

En `src/Admin/AdminNew.jsx:14`, agregar el import justo después del de `AdminTakeAway`:

```js
import AdminTakeAway from './AdminTakeAway';
import CuponesTab from './tabs/CuponesTab';
```

En el array `tabs` (línea 19-31), agregar la entrada después de `'takeaway'`:

```js
  const tabs = [
    { id: 'reservas',      nombre: 'Reservas',      componente: AdminReservas },
    { id: 'takeaway',      nombre: 'Take Away',     componente: AdminTakeAway },
    { id: 'cupones',       nombre: 'Cupones',       componente: CuponesTab },
    { id: 'analytics',     nombre: 'Analytics',     componente: AnalyticsTab },
    // ...el resto igual...
```

- [ ] **Step 3: Verificación manual**

1. Correr `npm run dev`, entrar al Admin, abrir el tab "Cupones" (debe aparecer vacío, sin errores en consola).
2. Crear un cupón `TEST10`, tipo porcentaje, valor `10`, sin fechas ni mínimo ni límites, activo. Confirmar que aparece en la tabla con "Usos: 0", "Descontado: $0", "Ingresos: $0".
3. Intentar crear otro cupón con el mismo código `TEST10` → debe mostrar el alert de "Ya existe un cupón con el código...".
4. Crear un segundo cupón `FIJO2000`, tipo monto fijo, valor `2000`, límite de usos totales `2`, límite por cliente `1`.
5. Click en "✓ Activo" de `TEST10` → debe pasar a "✕ Inactivo" y reflejarse sin recargar la página. Volver a activarlo.
6. Editar `FIJO2000`, cambiar el valor a `2500`, guardar → confirmar que se actualiza en la tabla y que el campo Código queda deshabilitado en el formulario de edición.
7. Eliminar `FIJO2000` → confirmar que desaparece de la tabla. Volver a crearlo igual que en el paso 4 (se necesita para la Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/Admin/tabs/CuponesTab.jsx src/Admin/AdminNew.jsx
git commit -m "feat: agregar tab de Cupones al Admin (alta, edicion, activo/inactivo)"
```

---

### Task 3: `CuponesTab.jsx` — historial de usos ("Ver uso")

**Files:**
- Modify: `src/Admin/tabs/CuponesTab.jsx`

**Interfaces:**
- Consumes: nada nuevo de otras tasks (lee `selvaggio_cupones/{id}/usos` directo).

- [ ] **Step 1: Agregar estado y carga del historial**

Agregar al principio del componente, junto a los otros `useState`:

```jsx
  const [historialDe, setHistorialDe] = useState(null); // id del cupón cuyo historial se está viendo, o null
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
```

Agregar la función de carga (junto a `cargar`):

```jsx
  const verHistorial = async (c) => {
    setHistorialDe(c.id);
    setCargandoHistorial(true);
    try {
      const snap = await getDocs(collection(db, 'selvaggio_cupones', c.id, 'usos'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));
      setHistorial(items);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };
```

- [ ] **Step 2: Agregar el botón "Ver uso" en cada fila**

En la celda de acciones de la tabla (dentro de `<td style={{ display: 'flex', gap: 6 }}>`), agregar antes del botón de eliminar:

```jsx
                    <button className="btn-action" onClick={() => verHistorial(c)} title="Ver historial de uso">📊</button>
```

- [ ] **Step 3: Agregar el bloque de historial**

Justo antes del cierre `</div>` final del componente (después del bloque de la tabla), agregar:

```jsx
      {historialDe && (
        <div className="cal-form" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="cal-form__title">Historial de uso — {historialDe}</h3>
            <button className="btn-action btn-danger" onClick={() => setHistorialDe(null)}>Cerrar</button>
          </div>
          {cargandoHistorial ? (
            <div className="loading-state">Cargando...</div>
          ) : historial.length === 0 ? (
            <div className="empty-state">Este cupón todavía no fue usado.</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Cliente</th><th>Pedido</th><th>Descuento</th><th>Total pedido</th></tr>
                </thead>
                <tbody>
                  {historial.map(u => (
                    <tr key={u.id}>
                      <td>{u.fecha?.toDate ? u.fecha.toDate().toLocaleString('es-AR') : '-'}</td>
                      <td>{u.nombre} ({u.email})</td>
                      <td>{u.numeroPedido}</td>
                      <td>{fmt(u.descuentoAplicado)}</td>
                      <td>{fmt(u.totalPedido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 4: Verificación manual**

1. `npm run dev`, ir al tab Cupones, click en "📊" de `TEST10` → debe mostrar "Este cupón todavía no fue usado." (todavía no hay canjes reales, eso se prueba en la Task 5).
2. Click en "Cerrar" → el bloque desaparece.

- [ ] **Step 5: Commit**

```bash
git add src/Admin/tabs/CuponesTab.jsx
git commit -m "feat: agregar historial de uso por cupon en el Admin"
```

---

### Task 4: Checkout de Take Away — aplicar/quitar cupón y fórmula de descuento encadenada

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx` (función `CheckoutScreen`, líneas 161-431 aprox.)
- Modify: `src/TakeAway/TakeAway.css`

**Interfaces:**
- Consumes de `cupones.js` (Task 1): `buscarCupon`, `calcularDescuentoCupon`, `validarCupon`, `obtenerUsosCliente`.
- Produces: `onConfirmar` ahora recibe, además de los campos existentes, `descuentoCupon`, `descuentoEfectivo`, `cuponId`, `cuponCodigo` en el objeto que pasa (usados por la Task 5).

- [ ] **Step 1: Importar las funciones de cupones**

En `src/TakeAway/TakeAway.jsx:1-11`, agregar el import:

```js
import { buscarCupon, calcularDescuentoCupon, validarCupon, obtenerUsosCliente } from '../utils/cupones';
```

- [ ] **Step 2: Agregar estado de cupón en `CheckoutScreen`**

Reemplazar las líneas 162-176 (declaración de `formData`, `toast`, y el cálculo de `subtotal`/`descuento`/`total`):

```jsx
function CheckoutScreen({ carrito, onVolver, onConfirmar, loading, config }) {
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', email: '', telefono: '', metodoPago: 'efectivo', comentarios: '',
    fechaRetiro: '', horaRetiro: '',
    metodoEnvio: 'retiro',
    localidadEnvio: '', direccionEnvio: '', pisoDeptoEnvio: '', referenciaEnvio: '',
  });
  const [toast, setToast] = useState(null);
  const [mostrarCupon, setMostrarCupon] = useState(false);
  const [codigoCupon, setCodigoCupon] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState(null); // { id, codigo, tipoDescuento, valor, ... } o null
  const [errorCupon, setErrorCupon] = useState('');
  const [verificandoCupon, setVerificandoCupon] = useState(false);

  const subtotal  = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const esEfectivo = formData.metodoPago === 'efectivo';
  const zonasEnvio = config?.zonasEnvio || [];
  const hayEnvioDisponible = zonasEnvio.length > 0;
  const esEnvio = formData.metodoEnvio === 'envio';
  const descuentoCupon    = cuponAplicado ? calcularDescuentoCupon(cuponAplicado, subtotal) : 0;
  const subtotalPostCupon = subtotal - descuentoCupon;
  const descuentoEfectivo = esEfectivo ? Math.round(subtotalPostCupon * 0.10) : 0;
  const total = subtotalPostCupon - descuentoEfectivo;
```

- [ ] **Step 3: Agregar los handlers de aplicar/quitar cupón**

Agregar después de `handleChange` (la línea que sigue a `const handleChange = e => ...`):

```jsx
  const handleAplicarCupon = async () => {
    const codigo = codigoCupon.trim();
    if (!codigo) return;
    setVerificandoCupon(true);
    setErrorCupon('');
    try {
      const cupon = await buscarCupon(codigo);
      if (!cupon) { setErrorCupon('Cupón no encontrado'); return; }

      const cantidadUsosCliente = formData.email ? await obtenerUsosCliente(cupon.id, formData.email) : 0;
      const { valido, motivo } = validarCupon(cupon, { subtotal, cantidadUsosCliente });
      if (!valido) { setErrorCupon(motivo.charAt(0).toUpperCase() + motivo.slice(1)); return; }

      setCuponAplicado(cupon);
      setCodigoCupon('');
    } catch (err) {
      console.error('Error aplicando cupón:', err);
      setErrorCupon('No se pudo validar el cupón, intentá nuevamente');
    } finally {
      setVerificandoCupon(false);
    }
  };

  const handleQuitarCupon = () => {
    setCuponAplicado(null);
    setErrorCupon('');
  };
```

- [ ] **Step 4: Actualizar `handleSubmit`**

Reemplazar el `handleSubmit` existente (línea 204-208):

```jsx
  const handleSubmit = e => {
    e.preventDefault();
    if (carrito.length === 0) { setToast({ message: 'El carrito está vacío', type: 'error' }); return; }
    onConfirmar({
      ...formData,
      subtotal,
      descuentoCupon,
      descuentoEfectivo,
      descuento: descuentoCupon + descuentoEfectivo,
      totalFinal: total,
      cuponId: cuponAplicado ? cuponAplicado.id : '',
      cuponCodigo: cuponAplicado ? cuponAplicado.codigo : '',
    });
  };
```

- [ ] **Step 5: Actualizar el bloque de resumen (JSX)**

Reemplazar las líneas 226-273 (todo el bloque `<div className="tw-resumen">...</div>`):

```jsx
        <div className="tw-resumen">
          <h3 className="tw-resumen__title">Resumen</h3>
          {carrito.map(item => (
            <div key={item.cartId} className="tw-resumen__item">
              <div className="tw-resumen__row">
                <span className="tw-resumen__qty">{item.cantidad}×</span>
                <span className="tw-resumen__nombre">{item.nombre}</span>
                <span className="tw-resumen__precio">{formatPrecio(item.precio * item.cantidad)}</span>
              </div>
              {item.selecciones && Object.values(item.selecciones).map((sec, i) =>
                sec.items && sec.items.length > 0 ? (
                  <div key={i} className="tw-resumen__selec">
                    <span className="tw-resumen__selec-sec">{sec.nombre}:</span>
                    <span className="tw-resumen__selec-items">{sec.items.map(x => x.nombre).join(', ')}</span>
                  </div>
                ) : null
              )}
            </div>
          ))}

          <div className="tw-cupon">
            {cuponAplicado ? (
              <div className="tw-cupon__aplicado">
                <span>🎟 Cupón <strong>{cuponAplicado.codigo}</strong> aplicado</span>
                <button type="button" className="tw-cupon__quitar" onClick={handleQuitarCupon}>Quitar</button>
              </div>
            ) : mostrarCupon ? (
              <div className="tw-cupon__form">
                <input
                  className="tw-input tw-input--code"
                  type="text"
                  value={codigoCupon}
                  onChange={e => setCodigoCupon(e.target.value.toUpperCase())}
                  placeholder="Código de cupón"
                  disabled={verificandoCupon}
                />
                <button type="button" className="tw-cupon__aplicar" onClick={handleAplicarCupon} disabled={verificandoCupon || !codigoCupon.trim()}>
                  {verificandoCupon ? 'Verificando…' : 'Aplicar'}
                </button>
              </div>
            ) : (
              <button type="button" className="tw-cupon__toggle" onClick={() => setMostrarCupon(true)}>¿Tenés un cupón?</button>
            )}
            {errorCupon && <p className="tw-cupon__error">{errorCupon}</p>}
          </div>

          {(cuponAplicado || esEfectivo) && (
            <div className="tw-resumen__row tw-resumen__row--sub">
              <span className="tw-resumen__qty" />
              <span className="tw-resumen__nombre" style={{ color: '#8a7e76' }}>Subtotal</span>
              <span className="tw-resumen__precio" style={{ color: '#8a7e76' }}>{formatPrecio(subtotal)}</span>
            </div>
          )}
          {cuponAplicado && (
            <div className="tw-resumen__row tw-resumen__row--descuento">
              <span className="tw-resumen__qty">🎟</span>
              <span className="tw-resumen__nombre tw-resumen__descuento-label">Cupón {cuponAplicado.codigo}</span>
              <span className="tw-resumen__precio tw-resumen__descuento-val">−{formatPrecio(descuentoCupon)}</span>
            </div>
          )}
          {esEfectivo && (
            <div className="tw-resumen__row tw-resumen__row--descuento">
              <span className="tw-resumen__qty">🏷</span>
              <span className="tw-resumen__nombre tw-resumen__descuento-label">10% descuento efectivo</span>
              <span className="tw-resumen__precio tw-resumen__descuento-val">−{formatPrecio(descuentoEfectivo)}</span>
            </div>
          )}
          {esEnvio && (
            <div className="tw-resumen__row tw-resumen__row--envio">
              <span className="tw-resumen__qty">🚚</span>
              <span className="tw-resumen__nombre">Envío Selvaggio</span>
              <span className="tw-resumen__precio tw-resumen__precio--gratis">Gratis</span>
            </div>
          )}
          <div className="tw-resumen__total">
            <span>Total{(esEfectivo || cuponAplicado) ? ' a pagar' : ''}</span>
            <span>{formatPrecio(total)}</span>
          </div>
          <p className="tw-resumen__nota">
            {esEnvio ? 'El pago se realiza al momento de la entrega.' : 'El pago se realiza al momento de retirar en el local.'}
          </p>
        </div>
```

- [ ] **Step 6: Agregar CSS del bloque de cupón**

Al final de `src/TakeAway/TakeAway.css`, agregar:

```css
.tw-cupon { margin: 4px 0 10px; }
.tw-cupon__toggle {
  background: none; border: none; padding: 0; cursor: pointer;
  color: #7c3f2f; font-size: 13px; text-decoration: underline;
}
.tw-cupon__form { display: flex; gap: 8px; }
.tw-cupon__form .tw-input--code { flex: 1; }
.tw-cupon__aplicar {
  background: #2a2420; color: #fff; border: none; border-radius: 6px;
  padding: 0 16px; font-size: 13px; cursor: pointer; white-space: nowrap;
}
.tw-cupon__aplicar:disabled { opacity: 0.55; cursor: not-allowed; }
.tw-cupon__aplicado {
  display: flex; justify-content: space-between; align-items: center;
  background: #f0f7f2; border: 1px solid #cfe8d6; border-radius: 6px;
  padding: 8px 12px; font-size: 13px; color: #1a6b3a;
}
.tw-cupon__quitar { background: none; border: none; color: #7c3f2f; text-decoration: underline; cursor: pointer; font-size: 12px; }
.tw-cupon__error { color: #a93226; font-size: 12px; margin: 6px 0 0; }
```

- [ ] **Step 7: Verificación manual**

Requiere los cupones `TEST10` (10% sin restricciones) y `FIJO2000` (monto fijo $2000/$2500, límite total 2, límite por cliente 1) creados en la Task 2.

1. `npm run dev`, ir a Take Away, agregar productos por un subtotal conocido (ej. $8000), ir al checkout.
2. Click en "¿Tenés un cupón?", escribir `TEST10`, click "Aplicar" → debe aparecer "Cupón TEST10 aplicado", la línea Subtotal, la línea "Cupón TEST10 −$800", y el Total debe bajar a $7200. Click "Quitar" → vuelve al estado sin cupón.
3. Escribir un código inexistente, ej. `NOEXISTE` → debe mostrar "Cupón no encontrado".
4. Aplicar `TEST10` de nuevo, elegir método de pago "Efectivo" → debe aparecer también la línea "10% descuento efectivo" calculada sobre el subtotal **ya descontado** ($7200 × 10% = $720), Total final $6480. Confirmar el cálculo a mano.
5. Cambiar el carrito para que el subtotal sea menor a un monto mínimo alto (o editar `FIJO2000` en el Admin poniéndole `montoMinimo: 999999` temporalmente) y aplicarlo → debe mostrar el mensaje de compra mínima. Revertir el `montoMinimo` después.

- [ ] **Step 8: Commit**

```bash
git add src/TakeAway/TakeAway.jsx src/TakeAway/TakeAway.css
git commit -m "feat: agregar aplicar/quitar cupon en el checkout de take away"
```

---

### Task 5: Canje real del cupón al confirmar el pedido

**Files:**
- Modify: `src/TakeAway/TakeAway.jsx` (imports, y la función `handleConfirmarFinalConData`, líneas ~1-11 y ~720-745)

**Interfaces:**
- Consumes: `canjearCupon`, `CuponInvalidoError` de `src/utils/cupones.js` (Task 1); `descuentoCupon`, `descuentoEfectivo`, `cuponId`, `cuponCodigo` en `formData` (Task 4).

- [ ] **Step 1: Ajustar imports**

En `src/TakeAway/TakeAway.jsx:3-6`, quitar `addDoc` (ya no se usa directo) y agregar el import de cupones:

```js
import {
  collection, getDocs, getDoc, doc, setDoc, increment, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { canjearCupon, CuponInvalidoError } from '../utils/cupones';
```

(el import de `buscarCupon, calcularDescuentoCupon, validarCupon, obtenerUsosCliente` agregado en la Task 4 se mantiene como una línea aparte, sin tocar)

- [ ] **Step 2: Reemplazar la creación del pedido en `handleConfirmarFinalConData`**

Reemplazar las líneas 723-744 (desde `const docRef = await addDoc(...)` hasta `await setDoc(docRef, { numeroPedido: numStr }, { merge: true });`):

```jsx
      const pedidoData = {
        nombre: formData.nombre, apellido: formData.apellido,
        email: formData.email, telefono: formData.telefono,
        items: carrito.map(i => ({ ...i, subtotal: i.precio * i.cantidad })),
        subtotal: formData.subtotal,
        descuentoCupon: formData.descuentoCupon || 0,
        descuentoEfectivo: formData.descuentoEfectivo || 0,
        descuento: formData.descuento || 0,
        cuponCodigo: formData.cuponCodigo || '',
        cuponId: formData.cuponId || '',
        total: formData.totalFinal,
        metodoPago: formData.metodoPago,
        comentarios: formData.comentarios,
        fechaRetiro: formData.fechaRetiro || '',
        horaRetiro: formData.horaRetiro || '',
        metodoEnvio: formData.metodoEnvio || 'retiro',
        localidadEnvio: formData.metodoEnvio === 'envio' ? (formData.localidadEnvio || '') : '',
        direccionEnvio: formData.metodoEnvio === 'envio' ? (formData.direccionEnvio || '') : '',
        pisoDeptoEnvio: formData.metodoEnvio === 'envio' ? (formData.pisoDeptoEnvio || '') : '',
        referenciaEnvio: formData.metodoEnvio === 'envio' ? (formData.referenciaEnvio || '') : '',
        estado: 'pendiente',
        createdAt: Timestamp.now(),
      };

      const { pedidoRef: docRef, numeroPedido: numStr } = await canjearCupon({
        cuponId: formData.cuponId || null,
        email: formData.email,
        subtotal: formData.subtotal,
        pedidoData,
      });
```

El resto del `try` (upsert de `selvaggio_clientes`, notificación, tracking, `setStep('exito')`, etc.) sigue igual — usa `docRef` y `numStr` que ahora vienen de `canjearCupon` en vez de `addDoc`/`setDoc`.

- [ ] **Step 3: Manejar `CuponInvalidoError` en el `catch` existente**

Reemplazar el bloque `catch` (líneas 803-807):

```jsx
    } catch (err) {
      console.error(err);
      const mensaje = err instanceof CuponInvalidoError
        ? `El cupón ya no es válido (${err.motivo}). Volvé a intentar tu pedido.`
        : 'Error al procesar el pedido. Intentá nuevamente.';
      setToast({ message: mensaje, type: 'error' });
      setStep(verificacionActiva ? 'verificacion' : 'checkout');
    } finally { setLoading(false); }
```

- [ ] **Step 4: Verificación manual — camino feliz**

1. `npm run dev`, hacer un pedido de Take Away aplicando `TEST10`, confirmar. Debe llegar a la pantalla de éxito con el número de pedido.
2. Ir al Admin → Take Away, confirmar que el pedido aparece con el descuento total correcto (cupón + efectivo si aplica).
3. Ir al Admin → Cupones, confirmar que `TEST10` ahora muestra `usosTotales: 1`, `montoDescontadoTotal` y `ingresosGenerados` actualizados.
4. Click en "📊 Ver uso" de `TEST10` → debe aparecer una fila con el pedido recién creado, cliente, fecha y descuento aplicado.

- [ ] **Step 5: Verificación manual — límite de usos totales**

1. Usar `FIJO2000` (límite total 2, límite por cliente 1) para hacer un pedido con `email-a@test.com` → debe funcionar, `usosTotales` pasa a 1.
2. Hacer otro pedido con `email-b@test.com` usando `FIJO2000` → debe funcionar, `usosTotales` pasa a 2.
3. Intentar un tercer pedido con `email-c@test.com` usando `FIJO2000` → al aplicarlo en el checkout puede pasar el preview (si `usosTotales` todavía no se refrescó en ese momento) pero **al confirmar** debe fallar con el toast "El cupón ya no es válido (este cupón alcanzó el límite de usos)..." y quedar en la pantalla de checkout sin crear el pedido. Confirmar en el Admin que no se creó un tercer pedido y que `usosTotales` sigue en 2.

- [ ] **Step 6: Verificación manual — límite por cliente**

1. Con `FIJO2000` todavía con cupos totales disponibles (editar en el Admin para subir `limiteUsosTotal` si hace falta), intentar usarlo dos veces con el mismo email `email-a@test.com` → la segunda vez, al aplicar el cupón en el checkout (ya con el email cargado desde el primer intento, o completándolo antes de aplicar), debe rechazarlo con "ya alcanzaste el límite de usos de este cupón".

- [ ] **Step 7: Commit**

```bash
git add src/TakeAway/TakeAway.jsx
git commit -m "feat: canjear cupon de forma atomica al confirmar el pedido de take away"
```

---

### Task 6: `AdminTakeAway.jsx` — mostrar el cupón usado en las tarjetas de pedidos

**Files:**
- Modify: `src/Admin/AdminTakeAway.jsx:170-174`

**Interfaces:**
- Consumes: `cuponCodigo`, `descuentoCupon` del documento de pedido (Task 5).

- [ ] **Step 1: Agregar la línea de cupón antes de la de efectivo**

Reemplazar las líneas 170-174:

```jsx
                      {p.descuentoCupon > 0 && (
                        <div className="atw__total atw__total--desc">
                          <span>Cupón {p.cuponCodigo}</span><span>−{fmt(p.descuentoCupon)}</span>
                        </div>
                      )}
                      {p.descuentoEfectivo > 0 && (
                        <div className="atw__total atw__total--desc">
                          <span>Desc. efectivo 10%</span><span>−{fmt(p.descuentoEfectivo)}</span>
                        </div>
                      )}
```

(Nota: se reemplaza la condición `p.descuento > 0` por los campos específicos `descuentoCupon`/`descuentoEfectivo`; pedidos viejos sin estos campos simplemente no muestran ninguna de las dos líneas, lo cual es aceptable ya que tampoco tenían cupones.)

- [ ] **Step 2: Verificación manual**

1. `npm run dev`, Admin → Take Away, ubicar el pedido creado en la Task 5 con `TEST10` → debe mostrar la línea "Cupón TEST10 −$XXX" arriba de la de efectivo (si corresponde) y el total sigue siendo correcto.
2. Ubicar un pedido viejo (anterior a este cambio, sin cupón) → debe seguir mostrando su línea de efectivo igual que antes (si pagó en efectivo) sin errores en consola.

- [ ] **Step 3: Commit**

```bash
git add src/Admin/AdminTakeAway.jsx
git commit -m "feat: mostrar cupon aplicado en las tarjetas de pedidos de take away"
```

---

## Self-Review

**Cobertura del spec:**
- Modelo de datos (`selvaggio_cupones`, `usosPorCliente`, `usos`, campos del pedido) → Tasks 1, 2, 5.
- Fórmula de descuento encadenada → Task 4 (cálculo) y Task 5 (persistencia).
- Validación/canje atómico → Task 1 (`canjearCupon`), verificado end-to-end en Task 5.
- Admin: CRUD + activo/inactivo + estadísticas agregadas → Task 2.
- Admin: historial de uso → Task 3.
- Checkout: aplicar/quitar cupón → Task 4.
- `AdminTakeAway.jsx` mostrando el cupón → Task 6.

**Sin placeholders:** todos los steps tienen código completo, sin TODOs ni "similar a la task N".

**Consistencia de tipos:** `canjearCupon` devuelve `{ pedidoRef, numeroPedido }` en Task 1 y se consume exactamente así en Task 5 (`const { pedidoRef: docRef, numeroPedido: numStr } = await canjearCupon(...)`). `CuponInvalidoError.motivo` se usa igual en Task 1 (se lanza) y Task 5 (se lee en el catch). Los nombres de campos del cupón (`tipoDescuento`, `valor`, `activo`, `fechaDesde`, `fechaHasta`, `montoMinimo`, `limiteUsosTotal`, `limiteUsosPorCliente`, `usosTotales`, `montoDescontadoTotal`, `ingresosGenerados`) son los mismos en Task 1 (`validarCupon`/`calcularDescuentoCupon`), Task 2 (formulario y tabla) y Task 5 (increments).
