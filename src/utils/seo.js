// Utilidades para SEO dinámico

/**
 * Actualiza el título de la página
 * @param {string} title - Título de la página
 */
export const updatePageTitle = (title) => {
  if (title) {
    document.title = `${title} | Selvaggio`;
  } else {
    document.title = 'Selvaggio - Wine Bar & Delicatessen | Quesos, Vinos y Fiambres Premium';
  }
};

/**
 * Actualiza la meta descripción
 * @param {string} description - Descripción de la página
 */
export const updateMetaDescription = (description) => {
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && description) {
    metaDescription.setAttribute('content', description);
  }
};

/**
 * Actualiza las meta tags de Open Graph
 * @param {Object} data - Objeto con title, description, image, url
 */
export const updateOpenGraph = ({ title, description, image, url }) => {
  if (title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
  }
  
  if (description) {
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);
  }
  
  if (image) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', image);
  }
  
  if (url) {
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', url);
    
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);
  }
};

/**
 * Actualiza las meta tags de Twitter Card
 * @param {Object} data - Objeto con title, description, image
 */
export const updateTwitterCard = ({ title, description, image }) => {
  if (title) {
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
  }
  
  if (description) {
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description);
  }
  
  if (image) {
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute('content', image);
  }
};

/**
 * Actualiza todos los meta tags de una vez
 * @param {Object} seoData - Objeto completo con todos los datos SEO
 */
export const updateAllSEO = (seoData) => {
  const {
    title = 'Wine Bar & Delicatessen',
    description = 'Elegí tu vino, armá tu picada y creá tu momento. Primera experiencia de autoservicio premium con +150 etiquetas, quesos importados y fiambres artesanales en Buenos Aires.',
    image = 'https://selvaggio.com.ar/og-image.jpg',
    url = 'https://selvaggio.com.ar/'
  } = seoData;

  updatePageTitle(title);
  updateMetaDescription(description);
  updateOpenGraph({ title, description, image, url });
  updateTwitterCard({ title, description, image });
};

/**
 * Genera Schema.org JSON-LD para productos
 * @param {Object} producto - Datos del producto
 * @returns {string} JSON-LD string
 */
export const generateProductSchema = (producto) => {
  return JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": producto.nombre,
    "description": producto.descripcion,
    "brand": {
      "@type": "Brand",
      "name": producto.bodega || producto.origen || "Selvaggio"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://selvaggio.com.ar/#productos`,
      "priceCurrency": "ARS",
      "price": producto.precio,
      "availability": "https://schema.org/InStock"
    }
  });
};

/**
 * Genera Schema.org JSON-LD para reseñas
 * @param {Array} reseñas - Array de reseñas
 * @returns {string} JSON-LD string
 */
export const generateReviewsSchema = (reseñas) => {
  const avgRating = reseñas.reduce((acc, r) => acc + r.calificacion, 0) / reseñas.length;
  
  return JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Restaurant",
    "name": "Selvaggio",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": reseñas.length,
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reseñas.slice(0, 5).map(reseña => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": reseña.nombre
      },
      "datePublished": reseña.fecha,
      "reviewBody": reseña.comentario,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": reseña.calificacion,
        "bestRating": "5",
        "worstRating": "1"
      }
    }))
  });
};
