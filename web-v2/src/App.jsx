import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TakeAway from './pages/TakeAway.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import { EN_PRUEBA } from './api.js';

function ScrollArriba() {
  const { pathname, hash } = useLocation();
  // 'instant': el CSS tiene scroll-behavior smooth y al cambiar de página quedaba a mitad de camino.
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollArriba />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/take-away" element={<TakeAway />} />
        <Route path="/take-away/seguimiento" element={<Seguimiento />} />
        <Route path="*" element={<Home />} />
      </Routes>
      {EN_PRUEBA && (
        <div className="v2-prueba" role="note">Versión de prueba · los pedidos no llegan a la cocina</div>
      )}
    </>
  );
}
