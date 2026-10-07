import { useEffect, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './KnowledgeBase.module.css';

const CATEGORIES = ['Info general', 'Documentos', 'Reservas', 'Eventos', 'Take away', 'Pagos', 'FAQs', 'Derivación', 'Otro'];

// Para qué sirve cada PDF: el bot elige cuál mandar según esto.
const USOS = [
  { value: 'carta',     label: 'Carta del salón' },
  { value: 'eventos',   label: 'Eventos' },
  { value: 'cava',      label: 'La Cava' },
  { value: 'takeaway',  label: 'Take away' },
  { value: 'politicas', label: 'Políticas' },
  { value: 'otro',      label: 'Otro' },
];
const usoLabel = (v) => USOS.find(u => u.value === v)?.label ?? 'Otro';

const EMPTY_FORM = { title: '', content: '', category: 'Info general', order: 99, active: true, uso: 'otro' };
const EMPTY_PDF = { title: '', uso: 'carta', file: null };

export default function KnowledgeBase() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [pdfForm, setPdfForm] = useState(null); // null = cerrado
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(BASE_URL + '/api/knowledge');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let res;
      if (editing) {
        res = await authFetch(BASE_URL + `/api/knowledge/${editing}`, {
          method: 'PUT',
          body: form,
        });
      } else {
        res = await authFetch(BASE_URL + '/api/knowledge', {
          method: 'POST',
          body: form,
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      resetForm();
      await fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPdf(e) {
    e.preventDefault();
    if (!pdfForm?.file) return;
    setUploading(true);
    setError(null);
    setAviso(null);
    try {
      const fd = new FormData();
      fd.append('file', pdfForm.file);
      fd.append('title', pdfForm.title.trim());
      fd.append('uso', pdfForm.uso);
      const res = await authFetch(BASE_URL + '/api/knowledge/pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (data.aviso) setAviso(data.aviso);
      setPdfForm(null);
      await fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este item?')) return;
    await authFetch(BASE_URL + `/api/knowledge/${id}`, { method: 'DELETE' });
    fetchItems();
  }

  async function handleToggle(item) {
    await authFetch(BASE_URL + `/api/knowledge/${item.id}`, {
      method: 'PUT',
      body: { active: !item.active },
    });
    fetchItems();
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({ title: item.title, content: item.content, category: item.category, order: item.order, active: item.active, uso: item.uso ?? 'otro' });
    setShowForm(true);
    setPdfForm(null);
  }

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  const editingItem = editing ? items.find(i => i.id === editing) : null;
  const editingPdf = editingItem?.tipo === 'pdf';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Knowledge Base</h1>
          <p className={styles.subtitle}>Información que usa el bot para responder</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => { resetForm(); setPdfForm(EMPTY_PDF); }}>
            Subir PDF
          </button>
          <button className={styles.btnPrimary} onClick={() => { resetForm(); setPdfForm(null); setShowForm(true); }}>
            + Nuevo item
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          Error: {error}
        </div>
      )}

      {aviso && <div className={styles.avisoBanner}>{aviso}</div>}

      {pdfForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Subir PDF</h2>
          <p className={styles.formHint}>
            El bot lee el contenido para responder y, si el cliente lo pide, lo manda como archivo por WhatsApp.
            Leer el PDF tarda unos segundos.
          </p>
          <form onSubmit={handleUploadPdf} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input
                  className={styles.input}
                  value={pdfForm.title}
                  onChange={(e) => setPdfForm({ ...pdfForm, title: e.target.value })}
                  placeholder="ej: Carta de vinos"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Para qué se usa</label>
                <select
                  className={styles.input}
                  value={pdfForm.uso}
                  onChange={(e) => setPdfForm({ ...pdfForm, uso: e.target.value })}
                >
                  {USOS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Archivo (PDF, hasta 20 MB)</label>
              <input
                className={styles.input}
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPdfForm(f => ({ ...f, file, title: f.title || (file?.name ?? '').replace(/\.pdf$/i, '') }));
                }}
                required
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setPdfForm(null)} disabled={uploading}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={uploading || !pdfForm.file}>
                {uploading ? 'Subiendo y leyendo…' : 'Subir PDF'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>{editing ? 'Editar item' : 'Nuevo item'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="ej: Política de cambios"
                  required
                />
              </div>
              {editingPdf ? (
                <div className={styles.field}>
                  <label className={styles.label}>Para qué se usa</label>
                  <select
                    className={styles.input}
                    value={form.uso}
                    onChange={(e) => setForm({ ...form, uso: e.target.value })}
                  >
                    {USOS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>Categoría</label>
                  <select
                    className={styles.input}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {[...new Set([...CATEGORIES, form.category].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
            {editingPdf && (
              <p className={styles.formHint}>
                Archivo: <a href={editingItem.fileUrl} target="_blank" rel="noreferrer">{editingItem.fileName}</a>.
                El contenido de abajo es lo que leyó el bot del PDF: si algo quedó mal, corregilo acá.
                Para cambiar el archivo, subí uno nuevo y eliminá este.
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Contenido</label>
              <textarea
                className={styles.textarea}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escribí aquí la información que el bot debe saber..."
                rows={editingPdf ? 14 : 6}
                required={!editingPdf}
              />
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando...</p>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Sin contenido aún</p>
          <p className={styles.emptyText}>Agregá información para que el bot pueda responder mejor.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item.id} className={`${styles.card} ${!item.active ? styles.cardInactive : ''}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  {item.tipo === 'pdf'
                    ? <span className={`${styles.cardCategory} ${styles.cardPdf}`}>PDF · {usoLabel(item.uso)}</span>
                    : <span className={styles.cardCategory}>{item.category}</span>}
                  <span className={`${styles.cardStatus} ${item.active ? styles.cardStatusActive : styles.cardStatusOff}`}>
                    {item.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.tipo === 'pdf' && (
                  <a className={styles.cardFile} href={item.fileUrl} target="_blank" rel="noreferrer">{item.fileName}</a>
                )}
                <p className={styles.cardContent}>{item.content || 'Sin contenido leído: el bot solo puede mandar el archivo.'}</p>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => handleToggle(item)}>
                  {item.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className={styles.actionBtn} onClick={() => startEdit(item)}>
                  Editar
                </button>
                <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => handleDelete(item.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
