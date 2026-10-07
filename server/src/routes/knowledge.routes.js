import { Router } from 'express';
import multer from 'multer';
import {
  getAllKnowledgeItems,
  getKnowledgeItem,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
} from '../services/knowledge.service.js';
import { subirArchivo, borrarArchivo } from '../services/storage.service.js';
import { transcribirPdf } from '../services/claude.service.js';

const router = Router();

// Para qué sirve cada PDF: el bot elige cuál mandar según esto.
export const USOS_PDF = ['carta', 'eventos', 'cava', 'takeaway', 'politicas', 'otro'];
const MAX_PDF_MB = 20;
// Un documento de Firestore admite ~1 MB; una carta transcripta ronda los 10-20 mil caracteres.
const MAX_TEXTO = 60000;

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

router.get('/', async (req, res) => {
  try {
    const items = await getAllKnowledgeItems();
    res.json({ items, usos: USOS_PDF });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, category, order, active } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title y content son requeridos' });

    const item = await createKnowledgeItem({ title, content, category, order, active });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Sube un PDF: queda en Storage (selvaggio/kb/), Claude lo transcribe para que
 * el bot lo lea, y el bot puede mandarlo como archivo según su `uso`.
 * multipart: file, title, uso, category?
 */
router.post('/pdf', (req, res, next) => {
  uploadPdf.single('file')(req, res, err => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: `El PDF no puede pesar más de ${MAX_PDF_MB} MB` });
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const uso = USOS_PDF.includes(req.body.uso) ? req.body.uso : 'otro';
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo (tiene que ser PDF)' });
  if (!title) return res.status(400).json({ error: 'Falta el nombre' });

  let subido;
  try {
    subido = await subirArchivo(req.file.buffer, {
      carpeta: 'kb',
      nombre: req.file.originalname,
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    });
    let content = '';
    let transcripcionError = null;
    try {
      content = (await transcribirPdf(req.file.buffer, title)).slice(0, MAX_TEXTO);
    } catch (e) {
      // El PDF igual sirve para mandarlo; el texto se puede cargar a mano después.
      console.error('[kb] No se pudo transcribir el PDF:', e.message);
      transcripcionError = 'No se pudo leer el contenido del PDF. El bot lo puede mandar, pero conviene escribir un resumen en el contenido.';
    }
    const item = await createKnowledgeItem({
      title,
      content,
      category: req.body.category || 'Documentos',
      uso,
      tipo: 'pdf',
      fileName: req.file.originalname,
      fileUrl: subido.url,
      storagePath: subido.path,
      fileSize: req.file.size,
      order: 99,
      active: true,
    });
    res.status(201).json({ item, aviso: transcripcionError });
  } catch (err) {
    if (subido) borrarArchivo(subido.path).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    // El archivo no se cambia por acá (se sube uno nuevo y se borra el viejo).
    const { fileUrl, storagePath, fileName, fileSize, tipo, ...updates } = req.body ?? {};
    if (updates.uso !== undefined && !USOS_PDF.includes(updates.uso)) delete updates.uso;
    await updateKnowledgeItem(req.params.id, updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await getKnowledgeItem(req.params.id);
    await deleteKnowledgeItem(req.params.id);
    if (item?.storagePath) await borrarArchivo(item.storagePath).catch(e => console.error('[kb] borrar PDF:', e.message));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
