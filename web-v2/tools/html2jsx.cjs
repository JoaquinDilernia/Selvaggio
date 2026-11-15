// Convierte el body del diseño de Selvaggio a componentes JSX (uno por bloque de primer nivel).
// Uso: node html2jsx.cjs <index.html> <outDir>
const fs = require('fs');
const path = require('path');
const [, , inFile, outDir] = process.argv;
const html = fs.readFileSync(inFile, 'utf8');
const bodyStart = html.indexOf('<body>') + 6;
const bodyEnd = html.indexOf('<script>');
const body = html.slice(bodyStart, bodyEnd);

const VOID = new Set(['img', 'br', 'input', 'source', 'meta', 'hr', 'link', 'wbr', 'col', 'area', 'track']);
const RENAME = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength',
  autoplay: 'autoPlay', playsinline: 'playsInline', srcset: 'srcSet', crossorigin: 'crossOrigin', autocomplete: 'autoComplete', inputmode: 'inputMode',
  viewbox: 'viewBox', 'xlink:href': 'xlinkHref', enctype: 'encType', novalidate: 'noValidate', contenteditable: 'contentEditable', colspan: 'colSpan', rowspan: 'rowSpan', datetime: 'dateTime' };
const BOOL = new Set(['autoPlay', 'muted', 'loop', 'playsInline', 'disabled', 'checked', 'required', 'readOnly', 'noValidate', 'multiple', 'selected', 'hidden', 'open', 'controls']);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function styleObj(str) {
  // Map: si una propiedad se repite, gana la última (igual que en CSS).
  const out = new Map();
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    let prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    if (prop.startsWith('--')) { out.delete(prop); out.set(prop, `'${prop}': ${JSON.stringify(val)}`); continue; }
    if (prop.startsWith('-webkit-')) prop = 'Webkit' + camel(prop.slice(8)).replace(/^./, c => c.toUpperCase());
    else prop = camel(prop);
    out.delete(prop);
    out.set(prop, `${prop}: ${JSON.stringify(val)}`);
  }
  return `{{ ${[...out.values()].join(', ')} }}`;
}

function convertAttrs(tag, raw, ctx) {
  const attrs = [];
  const re = /([^\s=\/]+)(?:\s*=\s*"([^"]*)")?/g;
  let m; const classes = []; let styleStr = null;
  while ((m = re.exec(raw))) {
    const name = m[1];
    let val = m[2];
    const lower = name.toLowerCase();
    if (lower === 'class') { classes.push(val); continue; }
    if (lower === 'style') { styleStr = val; continue; }
    if (lower.startsWith('on')) { ctx.warn.push(`handler inline ${name} en <${tag}>`); continue; }
    let jsx = RENAME[lower] ?? (lower.startsWith('aria-') || lower.startsWith('data-') ? lower : (lower.includes('-') || lower.includes(':') ? camel(lower.replace(':', '-')) : name));
    if (val === undefined || BOOL.has(jsx)) { attrs.push(jsx); continue; }
    val = val.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    if (jsx === 'value' && ['input', 'textarea', 'select'].includes(tag)) jsx = 'defaultValue';
    attrs.push(`${jsx}=${JSON.stringify(val)}`);
  }
  // Reglas del diseño que dependían de [style*=...]: pasan a clases.
  if (styleStr) {
    if (/padding: (90|70)px clamp/.test(styleStr)) classes.push('v2-padsec');
    if (ctx.parentId === 'inicio' && /bottom: 0/.test(styleStr)) classes.push('v2-herobottom');
  }
  if (classes.length) attrs.unshift(`className=${JSON.stringify(classes.join(' '))}`);
  if (styleStr !== null) attrs.push(`style=${styleObj(styleStr)}`);
  return attrs.length ? ' ' + attrs.join(' ') : '';
}

const escText = (t) => t.replace(/[{}]/g, c => `{'${c}'}`).replace(/>/g, '&gt;');

// Tokenizar
const tokens = [];
const reTok = /<!--([\s\S]*?)-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>\/]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/g;
let last = 0; let m;
while ((m = reTok.exec(body))) {
  if (m.index > last) tokens.push({ t: 'text', v: body.slice(last, m.index) });
  if (m[1] !== undefined) tokens.push({ t: 'comment', v: m[1] });
  else if (m[2]) tokens.push({ t: 'close', name: m[2].toLowerCase() });
  else tokens.push({ t: 'open', name: m[3].toLowerCase(), raw: m[4] || '', self: !!m[5] });
  last = reTok.lastIndex;
}
if (last < body.length) tokens.push({ t: 'text', v: body.slice(last) });

// Árbol
const root = { name: '#root', children: [] };
const stack = [root];
for (const tk of tokens) {
  const top = stack[stack.length - 1];
  if (tk.t === 'open') {
    const id = (tk.raw.match(/\bid="([^"]*)"/) || [])[1];
    const node = { name: tk.name, raw: tk.raw, id, children: [] };
    top.children.push(node);
    if (!tk.self && !VOID.has(tk.name)) stack.push(node);
  } else if (tk.t === 'close') {
    if (VOID.has(tk.name)) continue;
    let i = stack.length - 1;
    while (i > 0 && stack[i].name !== tk.name) i--;
    if (i === 0) throw new Error('cierre sin apertura: ' + tk.name);
    stack.length = i;
  } else top.children.push(tk);
}
if (stack.length !== 1) throw new Error('quedaron abiertos: ' + stack.map(s => s.name).join('>'));

function render(node, ind, ctx, parentId) {
  const pad = '  '.repeat(ind);
  if (node.t === 'text') return node.v.trim() ? pad + escText(node.v.replace(/\s+/g, ' ').trim()) : '';
  if (node.t === 'comment') return pad + `{/* ${node.v.trim().replace(/\*\//g, '* /')} */}`;
  const tag = node.name;
  const attrs = convertAttrs(tag, node.raw, { ...ctx, parentId });
  if (VOID.has(tag) || !node.children.length) return `${pad}<${tag}${attrs} />`;
  if (node.children.every(c => c.t === 'text')) {
    return `${pad}<${tag}${attrs}>${escText(node.children.map(c => c.v).join('').replace(/\s+/g, ' ').trim())}</${tag}>`;
  }
  // Texto mezclado con elementos: conservar los espacios entre ellos.
  const parts = [];
  node.children.forEach((c, i) => {
    if (c.t === 'text') {
      const raw = c.v.replace(/\s+/g, ' ');
      if (!raw.trim()) { if (raw === ' ' && i > 0 && i < node.children.length - 1) parts.push(`${'  '.repeat(ind + 1)}{' '}`); return; }
      const lead = /^\s/.test(raw) && i > 0 ? "{' '}" : '';
      const trail = /\s$/.test(raw) && i < node.children.length - 1 ? "{' '}" : '';
      parts.push('  '.repeat(ind + 1) + lead + escText(raw.trim()) + trail);
    } else {
      const r = render(c, ind + 1, ctx, node.id);
      if (r) parts.push(r);
    }
  });
  return `${pad}<${tag}${attrs}>\n${parts.join('\n')}\n${pad}</${tag}>`;
}

// El body tiene un div contenedor: sus hijos son los bloques.
const wrapper = root.children.find(c => c.name === 'div');
const ctx = { warn: [] };
fs.mkdirSync(outDir, { recursive: true });
const summary = [];
let n = 0; let pendingComment = '';
for (const child of wrapper.children) {
  if (child.t === 'text') continue;
  if (child.t === 'comment') { pendingComment = child.v.trim(); continue; }
  n++;
  const name = (child.id || `${child.name}${n}`).replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, c => c.toUpperCase());
  const comp = `Gen${name}`;
  const jsx = render(child, 2, ctx, wrapper.id);
  const file = `// Generado desde el diseño (index.html) con tools/html2jsx.cjs — ${pendingComment || child.name}\nexport default function ${comp}() {\n  return (\n${jsx}\n  );\n}\n`;
  // Rutas absolutas a assets: la web tiene más páginas que la home.
  fs.writeFileSync(path.join(outDir, `${comp}.jsx`), file.replace(/(["(])assets\//g, '$1/assets/'));
  summary.push(`${String(n).padStart(2)} ${comp} <${child.name}${child.id ? '#' + child.id : ''}> ${pendingComment}`);
  pendingComment = '';
}
console.log('wrapperStyle:', (wrapper.raw.match(/style="([^"]*)"/) || [])[1] || '');
console.log(summary.join('\n'));
if (ctx.warn.length) console.log('AVISOS:\n' + [...new Set(ctx.warn)].join('\n'));
