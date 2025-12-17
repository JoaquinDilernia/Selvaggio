import PropTypes from 'prop-types';

/**
 * Componente optimizado para imágenes con SEO
 * Incluye lazy loading, alt text, y aspect ratio
 */
function OptimizedImage({ 
  src, 
  alt, 
  title, 
  className = '', 
  loading = 'lazy',
  width,
  height,
  aspectRatio,
  objectFit = 'cover'
}) {
  const style = aspectRatio 
    ? { aspectRatio, objectFit }
    : (width && height) 
      ? { width, height, objectFit }
      : { objectFit };

  return (
    <img
      src={src}
      alt={alt}
      title={title || alt}
      className={className}
      loading={loading}
      style={style}
      decoding="async"
    />
  );
}

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  title: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  aspectRatio: PropTypes.string,
  objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down'])
};

export default OptimizedImage;
