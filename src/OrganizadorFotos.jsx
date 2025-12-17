import { useState, useEffect } from 'react';
import './OrganizadorFotos.css';

/**
 * Herramienta para organizar y renombrar fotos
 * Solo usar en desarrollo
 */
function OrganizadorFotos() {
  const [fotos, setFotos] = useState([]);
  const [categorias, setCategorias] = useState({});

  // Lista de todas las fotos de WhatsApp
  const fotosWhatsApp = [
    'WhatsApp Image 2025-12-05 at 14.33.46.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.47 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.47 (2).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.47.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.48 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.48 (2).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.48.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49 (2).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49 (3).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49 (4).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49 (5).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.49.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.50 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.50 (2).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.50 (3).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.50.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.51 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.51 (2).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.51.jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.52 (1).jpeg',
    'WhatsApp Image 2025-12-05 at 14.33.52.jpeg'
  ];

  const opcionesCategorias = [
    { value: '', label: 'Sin categoría' },
    { value: 'hero', label: '⭐ Hero/Principal', desc: 'Foto principal del sitio' },
    { value: 'galeria', label: '📸 Galería', desc: 'Galería general' },
    { value: 'productos', label: '🧀 Productos', desc: 'Quesos, fiambres, tablas' },
    { value: 'ambiente', label: '🏠 Ambiente', desc: 'Interior del local' },
    { value: 'vinos', label: '🍷 Vinos', desc: 'Botellas y cava' },
    { value: 'eventos', label: '🎉 Eventos', desc: 'Eventos y clientes' },
    { value: 'og-image', label: '🔗 OG Image', desc: 'Para redes sociales (1200x630)' }
  ];

  useEffect(() => {
    setFotos(fotosWhatsApp.map((nombre, index) => ({
      id: index,
      nombre,
      url: `/${nombre}`,
      categoria: '',
      descripcion: ''
    })));
  }, []);

  const handleCategoriaChange = (id, categoria) => {
    setCategorias(prev => ({
      ...prev,
      [id]: { ...prev[id], categoria }
    }));
  };

  const handleDescripcionChange = (id, descripcion) => {
    setCategorias(prev => ({
      ...prev,
      [id]: { ...prev[id], descripcion }
    }));
  };

  const generarComandos = () => {
    const comandos = [];
    
    fotos.forEach(foto => {
      const cat = categorias[foto.id];
      if (cat && cat.categoria && cat.descripcion) {
        const nuevoNombre = `selvaggio-${cat.categoria}-${cat.descripcion}.jpeg`;
        comandos.push(
          `Rename-Item ".\\public\\${foto.nombre}" "${nuevoNombre}"`
        );
      }
    });

    return comandos;
  };

  const copiarComandos = () => {
    const comandos = generarComandos().join('\n');
    navigator.clipboard.writeText(comandos);
    alert('📋 Comandos copiados al portapapeles!\n\nPegá en PowerShell para renombrar las fotos.');
  };

  const descargarScript = () => {
    const comandos = [
      '# Script de renombrado automático - Selvaggio',
      '# Ejecutar desde la raíz del proyecto: .\\renombrar-fotos.ps1',
      '',
      'Write-Host "🔄 Renombrando fotos..." -ForegroundColor Cyan',
      '',
      ...generarComandos(),
      '',
      'Write-Host "✅ Fotos renombradas!" -ForegroundColor Green'
    ].join('\n');

    const blob = new Blob([comandos], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'renombrar-fotos.ps1';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="organizador-fotos">
      <div className="organizador-header">
        <h1>📸 Organizador de Fotos - Selvaggio</h1>
        <p>Asigna categoría y descripción a cada foto para generar los comandos de renombrado</p>
      </div>

      <div className="organizador-actions">
        <button onClick={copiarComandos} className="btn-primary">
          📋 Copiar Comandos PowerShell
        </button>
        <button onClick={descargarScript} className="btn-secondary">
          💾 Descargar Script .ps1
        </button>
      </div>

      <div className="fotos-grid">
        {fotos.map(foto => (
          <div key={foto.id} className="foto-card">
            <div className="foto-preview">
              <img 
                src={foto.url} 
                alt={foto.nombre}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="foto-error" style={{ display: 'none' }}>
                <span>🖼️</span>
                <small>Imagen no disponible</small>
              </div>
            </div>

            <div className="foto-info">
              <div className="foto-nombre">{foto.nombre}</div>
              
              <select 
                value={categorias[foto.id]?.categoria || ''}
                onChange={(e) => handleCategoriaChange(foto.id, e.target.value)}
                className="foto-select"
              >
                {opcionesCategorias.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="ej: tabla-principal, interior-1, malbec-copa"
                value={categorias[foto.id]?.descripcion || ''}
                onChange={(e) => handleDescripcionChange(foto.id, e.target.value)}
                className="foto-input"
              />

              {categorias[foto.id]?.categoria && categorias[foto.id]?.descripcion && (
                <div className="foto-preview-nombre">
                  ✅ selvaggio-{categorias[foto.id].categoria}-{categorias[foto.id].descripcion}.jpeg
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {generarComandos().length > 0 && (
        <div className="comandos-preview">
          <h3>🔧 Comandos PowerShell generados ({generarComandos().length})</h3>
          <pre>{generarComandos().join('\n')}</pre>
        </div>
      )}
    </div>
  );
}

export default OrganizadorFotos;
