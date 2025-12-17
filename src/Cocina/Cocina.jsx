import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Cocina.css';

function Cocina() {
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [filtroEstado, setFiltroEstado] = useState('pendiente'); // pendiente, completado, todos
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarPedidos();
  }, [filtroEstado]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      let q;
      if (filtroEstado === 'todos') {
        q = query(collection(db, 'selvaggio_pedidos'));
      } else {
        q = query(
          collection(db, 'selvaggio_pedidos'),
          where('estado', '==', filtroEstado)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const pedidos = [];
      
      querySnapshot.forEach((doc) => {
        pedidos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Ordenar manualmente por fecha de creación
      pedidos.sort((a, b) => {
        if (!a.pedido_creado || !b.pedido_creado) return 0;
        return a.pedido_creado.toDate() - b.pedido_creado.toDate();
      });
      
      setPedidosPendientes(pedidos);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar pedidos' });
    } finally {
      setLoading(false);
    }
  };

  const formatearHora = (timestamp) => {
    if (!timestamp) return '-';
    const fecha = timestamp.toDate();
    return fecha.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calcularTiempoEspera = (timestamp, pedido) => {
    if (!timestamp) return '-';
    
    // Si el pedido está completado, calcular tiempo hasta que fue marcado listo
    const tiempoFinal = pedido.estado === 'completado' && pedido.pedido_listo 
      ? pedido.pedido_listo.toDate() 
      : new Date();
    
    const creado = timestamp.toDate();
    const diffMs = tiempoFinal - creado;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Recién ingresado';
    if (diffMins === 1) return '1 minuto';
    return `${diffMins} minutos`;
  };

  const marcarListo = async (pedido) => {
    try {
      // Actualizar estado en Firebase
      const pedidoRef = doc(db, 'selvaggio_pedidos', pedido.id);
      await updateDoc(pedidoRef, {
        estado: 'completado',
        pedido_listo: Timestamp.now()
      });

      // Preparar mensaje de WhatsApp
      const mensaje = `Hola ${pedido.nombre}! Tu pedido #${pedido.numeroPedido} está listo para retirar. Te esperamos! 🍷 - Selvaggio`;
      const telefono = pedido.telefono.replace(/\D/g, ''); // Eliminar caracteres no numéricos
      const whatsappUrl = `https://wa.me/549${telefono}?text=${encodeURIComponent(mensaje)}`;
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Recargar pedidos
      await cargarPedidos();
      
      setMensaje({ tipo: 'success', texto: `Pedido #${pedido.numeroPedido} marcado como listo ✓` });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);

    } catch (error) {
      console.error('Error al marcar pedido:', error);
      setMensaje({ tipo: 'error', texto: 'Error al marcar pedido como listo' });
    }
  };

  const pedidosFiltrados = pedidosPendientes.filter(pedido => {
    if (!busqueda) return true;
    const termino = busqueda.toLowerCase();
    return (
      pedido.numeroPedido?.toLowerCase().includes(termino) ||
      pedido.nombre?.toLowerCase().includes(termino) ||
      pedido.telefono?.includes(termino)
    );
  });

  return (
    <div className="cocina-container">
      <div className="cocina-header">
        <div className="header-content">
          <h1>👨‍🍳 Cocina - Gestión de Pedidos</h1>
          <button onClick={cargarPedidos} className="btn-refresh">
            🔄 Actualizar
          </button>
        </div>
        {mensaje.texto && (
          <div className={`mensaje-top ${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}
      </div>

      <div className="cocina-filtros">
        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filtro-select"
        >
          <option value="pendiente">Pendientes</option>
          <option value="completado">Completados</option>
          <option value="todos">Todos</option>
        </select>

        <input
          type="text"
          placeholder="🔍 Buscar por N° pedido, nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="busqueda-input"
        />
      </div>

      <div className="pedidos-container">
        {loading ? (
          <div className="loading">Cargando pedidos...</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="sin-pedidos">
            <span className="emoji-grande">✨</span>
            <p>{busqueda ? 'No se encontraron pedidos' : filtroEstado === 'pendiente' ? 'No hay pedidos pendientes' : 'No hay pedidos'}</p>
          </div>
        ) : (
          <div className="pedidos-grid">
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-numero">
                  Pedido #{pedido.numeroPedido}
                </div>
                
                <div className="pedido-info">
                  <div className="info-row">
                    <span className="label">👤 Cliente:</span>
                    <span className="valor">{pedido.nombre}</span>
                  </div>
                  
                  <div className="info-row">
                    <span className="label">📱 Teléfono:</span>
                    <span className="valor">{pedido.telefono}</span>
                  </div>
                  
                  <div className="info-row">
                    <span className="label">🕐 Ingresado:</span>
                    <span className="valor">{formatearHora(pedido.pedido_creado)}</span>
                  </div>
                  
                  <div className="info-row tiempo-espera">
                    <span className="label">⏱️ Esperando:</span>
                    <span className="valor destacado">{calcularTiempoEspera(pedido.pedido_creado, pedido)}</span>
                  </div>
                  
                  {pedido.observaciones && (
                    <div className="observaciones">
                      <span className="label">📝 Observaciones:</span>
                      <p className="obs-texto">{pedido.observaciones}</p>
                    </div>
                  )}
                </div>

                {pedido.estado === 'pendiente' ? (
                  <button 
                    onClick={() => marcarListo(pedido)}
                    className="btn-listo"
                  >
                    ✓ Marcar Listo y Notificar
                  </button>
                ) : (
                  <div className="pedido-completado">
                    <span className="badge-completado">✓ Completado</span>
                    {pedido.pedido_listo && (
                      <span className="hora-completado">
                        {formatearHora(pedido.pedido_listo)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Cocina;
