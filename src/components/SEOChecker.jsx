import { useState, useEffect } from 'react';
import './SEOChecker.css';

/**
 * Componente para validar y verificar SEO en desarrollo
 * Solo se muestra en modo desarrollo
 */
function SEOChecker() {
  const [checks, setChecks] = useState({
    title: false,
    description: false,
    ogTitle: false,
    ogDescription: false,
    ogImage: false,
    canonical: false,
    robots: false,
    sitemap: false,
    manifest: false,
    imagesWithAlt: 0,
    imagesWithoutAlt: 0,
    h1Count: 0,
    internalLinks: 0
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE !== 'development') return;

    const performChecks = () => {
      const newChecks = {
        // Title
        title: document.title.length > 0 && document.title.length < 60,
        
        // Meta description
        description: (() => {
          const desc = document.querySelector('meta[name="description"]');
          return desc && desc.content.length > 50 && desc.content.length < 160;
        })(),
        
        // Open Graph
        ogTitle: !!document.querySelector('meta[property="og:title"]'),
        ogDescription: !!document.querySelector('meta[property="og:description"]'),
        ogImage: !!document.querySelector('meta[property="og:image"]'),
        
        // Canonical
        canonical: !!document.querySelector('link[rel="canonical"]'),
        
        // Robots
        robots: fetch('/robots.txt').then(r => r.ok).catch(() => false),
        
        // Sitemap
        sitemap: fetch('/sitemap.xml').then(r => r.ok).catch(() => false),
        
        // Manifest
        manifest: !!document.querySelector('link[rel="manifest"]'),
        
        // Images
        imagesWithAlt: document.querySelectorAll('img[alt]:not([alt=""])').length,
        imagesWithoutAlt: document.querySelectorAll('img:not([alt]), img[alt=""]').length,
        
        // H1
        h1Count: document.querySelectorAll('h1').length,
        
        // Internal links
        internalLinks: document.querySelectorAll('a[href^="/"], a[href^="#"]').length
      };

      // Resolver promesas
      Promise.all([newChecks.robots, newChecks.sitemap]).then(([robots, sitemap]) => {
        setChecks({
          ...newChecks,
          robots,
          sitemap
        });
      });
    };

    performChecks();
    
    // Re-check cada 5 segundos
    const interval = setInterval(performChecks, 5000);
    return () => clearInterval(interval);
  }, []);

  if (import.meta.env.MODE !== 'development') return null;

  const allGood = 
    checks.title &&
    checks.description &&
    checks.ogTitle &&
    checks.ogDescription &&
    checks.canonical &&
    checks.imagesWithoutAlt === 0 &&
    checks.h1Count === 1;

  return (
    <div className={`seo-checker ${isOpen ? 'open' : ''}`}>
      <button 
        className="seo-checker-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="SEO Checker"
      >
        {allGood ? '✅' : '⚠️'} SEO
      </button>

      {isOpen && (
        <div className="seo-checker-panel">
          <h3>🔍 SEO Checker</h3>
          
          <div className="seo-section">
            <h4>Meta Tags</h4>
            <CheckItem 
              label="Title (< 60 caracteres)" 
              status={checks.title}
              info={document.title}
            />
            <CheckItem 
              label="Meta Description (50-160 chars)" 
              status={checks.description}
              info={document.querySelector('meta[name="description"]')?.content}
            />
          </div>

          <div className="seo-section">
            <h4>Open Graph</h4>
            <CheckItem label="OG Title" status={checks.ogTitle} />
            <CheckItem label="OG Description" status={checks.ogDescription} />
            <CheckItem label="OG Image" status={checks.ogImage} />
          </div>

          <div className="seo-section">
            <h4>Estructura</h4>
            <CheckItem 
              label={`H1 (debe ser 1, encontrados: ${checks.h1Count})`}
              status={checks.h1Count === 1}
              warning={checks.h1Count > 1 ? 'Múltiples H1 encontrados' : null}
            />
            <CheckItem label="Canonical URL" status={checks.canonical} />
            <CheckItem label="Manifest.json" status={checks.manifest} />
          </div>

          <div className="seo-section">
            <h4>Imágenes</h4>
            <CheckItem 
              label={`Con alt text: ${checks.imagesWithAlt}`}
              status={true}
              success
            />
            <CheckItem 
              label={`Sin alt text: ${checks.imagesWithoutAlt}`}
              status={checks.imagesWithoutAlt === 0}
              warning={checks.imagesWithoutAlt > 0 ? 'Agregar alt text' : null}
            />
          </div>

          <div className="seo-section">
            <h4>Archivos</h4>
            <CheckItem label="robots.txt" status={checks.robots} />
            <CheckItem label="sitemap.xml" status={checks.sitemap} />
          </div>

          <div className="seo-section">
            <h4>Enlaces</h4>
            <CheckItem 
              label={`Enlaces internos: ${checks.internalLinks}`}
              status={checks.internalLinks > 0}
              success
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, status, info, success, warning }) {
  return (
    <div className={`check-item ${status ? 'success' : 'error'}`}>
      <span className="check-icon">{status ? '✅' : '❌'}</span>
      <span className="check-label">{label}</span>
      {info && <span className="check-info">{info.substring(0, 50)}...</span>}
      {warning && <span className="check-warning">⚠️ {warning}</span>}
    </div>
  );
}

export default SEOChecker;
