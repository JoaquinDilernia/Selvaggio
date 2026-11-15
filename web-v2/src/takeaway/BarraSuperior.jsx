import { Link } from 'react-router-dom';

export default function BarraSuperior() {
  return (
    <div className="tw2-top">
      <Link to="/" className="tw2-top__logo" aria-label="Selvaggio · inicio">
        <img src="/assets/logo-cream.png" alt="Selvaggio" />
      </Link>
      <nav className="tw2-top__nav">
        <Link to="/take-away">Take away</Link>
        <Link to="/take-away/seguimiento">Seguí tu pedido</Link>
        <Link to="/" className="tw2-top__volver">Volver al inicio</Link>
      </nav>
    </div>
  );
}
