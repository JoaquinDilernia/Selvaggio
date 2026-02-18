import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AdminContenidos.css';

function AdminConfiguracion() {
  const [config, setConfig] = useState({
    mensajeWhatsApp: 'Hola {nombre}! Tu pedido #{numeroPedido} está listo para retirar. Te esperamos! 🍇 - Selvaggio'
  });
  const [badges, setBadges] = useState([]);
  const [productos, setProductos] = useState([]);
  const [vinos, setVinos] = useState([]);
  const [mostrarFormBadge, setMostrarFormBadge] = useState(false);
  const [badgeEditando, setBadgeEditando] = useState(null);
  const [nuevoBadge, setNuevoBadge] = useState({
    nombre: '',
    textoVisible: '',
    tipoRegla: 'productos-nuevos',
    diasNuevo: 7,
    productosSeleccionados: [],
    vinosSeleccionados: [],
    activo: true,
    estilo: {
      backgroundColor: '#ff6b6b',
      color: '#ffffff',
      fontSize: '12px',
      padding: '4px 8px',
      borderRadius: '4px'
    }
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    cargarConfiguracion();
    cargarBadges();
    cargarProductos();
    cargarVinos();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const docRef = doc(db, 'selvaggio_config', 'general');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      mostrarMensaje('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const cargarBadges = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_badges'));
      const badgesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBadges(badgesData);
    } catch (error) {
      console.error('Error al cargar badges:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_productos'));
      const productosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const cargarVinos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'selvaggio_vinos'));
      const vinosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVinos(vinosData);
    } catch (error) {
      console.error('Error al cargar vinos:', error);
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      const docRef = doc(db, 'selvaggio_config', 'general');
      await setDoc(docRef, config, { merge: true });
      mostrarMensaje('success', '✓ Configuración guardada correctamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      mostrarMensaje('error', 'Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetearMensaje = () => {
    setConfig(prev => ({
      ...prev,
      mensajeWhatsApp: 'Hola {nombre}! Tu pedido #{numeroPedido} está listo para retirar. Te esperamos! 🍇 - Selvaggio'
    }));
  };

  const handleBadgeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoBadge(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEstiloChange = (e) => {
    const { name, value } = e.target;
    setNuevoBadge(prev => ({
      ...prev,
      estilo: {
        ...prev.estilo,
        [name]: value
      }
    }));
  };

  const handleProductoToggle = (productoId) => {
    setNuevoBadge(prev => ({
      ...prev,
      productosSeleccionados: prev.productosSeleccionados.includes(productoId)
        ? prev.productosSeleccionados.filter(id => id !== productoId)
        : [...prev.productosSeleccionados, productoId]
    }));
  };

  const handleVinoToggle = (vinoId) => {
    setNuevoBadge(prev => ({
      ...prev,
      vinosSeleccionados: prev.vinosSeleccionados.includes(vinoId)
        ? prev.vinosSeleccionados.filter(id => id !== vinoId)
        : [...prev.vinosSeleccionados, vinoId]
    }));
  };

  const guardarBadge = async () => {
    if (!nuevoBadge.nombre || !nuevoBadge.textoVisible) {
      mostrarMensaje('error', 'Completa todos los campos requeridos');
      return;
    }

    setGuardando(true);
    try {
      if (badgeEditando) {
        const docRef = doc(db, 'selvaggio_badges', badgeEditando);
        await updateDoc(docRef, nuevoBadge);
        mostrarMensaje('success', '✓ Badge actualizado correctamente');
      } else {
        await addDoc(collection(db, 'selvaggio_badges'), nuevoBadge);
        mostrarMensaje('success', '✓ Badge creado correctamente');
      }
      
      await cargarBadges();
      cancelarFormBadge();
    } catch (error) {
      console.error('Error al guardar badge:', error);
      mostrarMensaje('error', 'Error al guardar el badge');
    } finally {
      setGuardando(false);
    }
  };

  const editarBadge = (badge) => {
    setNuevoBadge({
      nombre: badge.nombre,
      textoVisible: badge.textoVisible,
      tipoRegla: badge.tipoRegla,
      diasNuevo: badge.diasNuevo || 7,
      productosSeleccionados: badge.productosSeleccionados || [],
      vinosSeleccionados: badge.vinosSeleccionados || [],
      activo: badge.activo,
      estilo: badge.estilo
    });
    setBadgeEditando(badge.id);
    setMostrarFormBadge(true);
  };

  const eliminarBadge = async (badgeId) => {
    if (!confirm('¿Estás seguro de eliminar este badge?')) return;

    try {
      await deleteDoc(doc(db, 'selvaggio_badges', badgeId));
      mostrarMensaje('success', '✓ Badge eliminado correctamente');
      await cargarBadges();
    } catch (error) {
      console.error('Error al eliminar badge:', error);
      mostrarMensaje('error', 'Error al eliminar el badge');
    }
  };

  const cancelarFormBadge = () => {
    setNuevoBadge({
      nombre: '',
      textoVisible: '',
      tipoRegla: 'productos-nuevos',
      diasNuevo: 7,
      productosSeleccionados: [],
      vinosSeleccionados: [],
      activo: true,
      estilo: {
        backgroundColor: '#ff6b6b',
        color: '#ffffff',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '4px'
      }
    });
    setBadgeEditando(null);
    setMostrarFormBadge(false);
  };

  if (loading) {
    return <div className="loading">Cargando configuración...</div>;
  }

  return (
    <div className="admin-configuracion">
      <div className="config-header">
        <h2>⚙️ Configuración del Sistema</h2>
        <p>Personaliza los mensajes, badges y ajustes de la aplicación</p>
      </div>

      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Sección de Badges */}
      <div className="config-seccion">
        <div className="seccion-header">
          <div>
            <h3>🏷️ Gestión de Badges</h3>
            <p className="config-descripcion">
              Crea y personaliza badges para destacar productos y vinos
            </p>
          </div>
          <button 
            onClick={() => setMostrarFormBadge(true)}
            className="btn-nuevo-badge"
          >
            + Nuevo Badge
          </button>
        </div>

        {/* Lista de Badges */}
        <div className="badges-lista">
          {badges.length === 0 ? (
            <div className="estado-vacio">
              <p>No hay badges creados aún. ¡Crea tu primer badge!</p>
            </div>
          ) : (
            badges.map(badge => (
              <div key={badge.id} className="badge-card">
                <div className="badge-card-header">
                  <div className="badge-preview" style={badge.estilo}>
                    {badge.textoVisible}
                  </div>
                  <div className="badge-acciones">
                    <button 
                      onClick={() => editarBadge(badge)}
                      className="btn-editar"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => eliminarBadge(badge.id)}
                      className="btn-eliminar"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="badge-card-info">
                  <p><strong>Nombre:</strong> {badge.nombre}</p>
                  <p><strong>Tipo:</strong> {
                    badge.tipoRegla === 'productos-nuevos' ? `Productos creados hace menos de ${badge.diasNuevo} días` :
                    badge.tipoRegla === 'productos-especificos' ? 'Productos seleccionados' :
                    badge.tipoRegla === 'vinos-nuevos' ? `Vinos agregados hace menos de ${badge.diasNuevo} días` :
                    'Vinos seleccionados'
                  }</p>
                  <p><strong>Estado:</strong> <span className={badge.activo ? 'estado-activo' : 'estado-inactivo'}>
                    {badge.activo ? '✓ Activo' : '✗ Inactivo'}
                  </span></p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulario de Badge */}
        {mostrarFormBadge && (
          <div className="modal-overlay" onClick={cancelarFormBadge}>
            <div className="modal-badge" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{badgeEditando ? 'Editar Badge' : 'Nuevo Badge'}</h3>
                <button onClick={cancelarFormBadge} className="btn-cerrar-modal">✕</button>
              </div>

              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre del Badge (Interno) *</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={nuevoBadge.nombre}
                      onChange={handleBadgeChange}
                      placeholder="ej: Badge Productos Nuevos"
                      className="config-input"
                    />
                    <small className="field-hint">Este nombre es solo para identificar el badge en tu panel</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="textoVisible">Texto del Badge (Visible) *</label>
                    <input
                      type="text"
                      id="textoVisible"
                      name="textoVisible"
                      value={nuevoBadge.textoVisible}
                      onChange={handleBadgeChange}
                      placeholder="ej: NUEVO, OFERTA, DESTACADO"
                      className="config-input"
                    />
                    <small className="field-hint">Este texto se mostrará en los productos</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tipoRegla">Tipo de Regla *</label>
                  <select
                    id="tipoRegla"
                    name="tipoRegla"
                    value={nuevoBadge.tipoRegla}
                    onChange={handleBadgeChange}
                    className="config-select"
                  >
                    <option value="productos-nuevos">📦 Productos Nuevos</option>
                    <option value="productos-especificos">✅ Productos Específicos</option>
                    <option value="vinos-nuevos">🍷 Vinos Nuevos</option>
                    <option value="vinos-especificos">✅ Vinos Específicos</option>
                  </select>
                </div>

                {(nuevoBadge.tipoRegla === 'productos-nuevos' || nuevoBadge.tipoRegla === 'vinos-nuevos') && (
                  <div className="form-group">
                    <label htmlFor="diasNuevo">Días para mostrar como "Nuevo" *</label>
                    <input
                      type="number"
                      id="diasNuevo"
                      name="diasNuevo"
                      value={nuevoBadge.diasNuevo}
                      onChange={handleBadgeChange}
                      min="1"
                      className="config-input"
                    />
                    <small className="field-hint">
                      {nuevoBadge.tipoRegla === 'productos-nuevos' ? 'Productos' : 'Vinos'} creados hace menos de {nuevoBadge.diasNuevo} días mostrarán este badge
                    </small>
                  </div>
                )}

                {nuevoBadge.tipoRegla === 'productos-especificos' && (
                  <div className="form-group">
                    <label>Seleccionar Productos *</label>
                    <div className="items-seleccion">
                      {productos.map(producto => (
                        <label key={producto.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={nuevoBadge.productosSeleccionados.includes(producto.id)}
                            onChange={() => handleProductoToggle(producto.id)}
                          />
                          <span>{producto.nombre}</span>
                        </label>
                      ))}
                    </div>
                    <small className="field-hint">
                      {nuevoBadge.productosSeleccionados.length} productos seleccionados
                    </small>
                  </div>
                )}

                {nuevoBadge.tipoRegla === 'vinos-especificos' && (
                  <div className="form-group">
                    <label>Seleccionar Vinos *</label>
                    <div className="items-seleccion">
                      {vinos.map(vino => (
                        <label key={vino.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={nuevoBadge.vinosSeleccionados.includes(vino.id)}
                            onChange={() => handleVinoToggle(vino.id)}
                          />
                          <span>{vino.nombre}</span>
                        </label>
                      ))}
                    </div>
                    <small className="field-hint">
                      {nuevoBadge.vinosSeleccionados.length} vinos seleccionados
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="activo"
                      checked={nuevoBadge.activo}
                      onChange={handleBadgeChange}
                    />
                    {' '}Badge activo
                  </label>
                  <small className="field-hint">Desactiva el badge para ocultarlo sin eliminarlo</small>
                </div>

                <div className="seccion-diseno">
                  <h4>🎨 Diseño del Badge</h4>
                  
                  <div className="form-grid-diseno">
                    <div className="form-group">
                      <label htmlFor="backgroundColor">Color de Fondo</label>
                      <div className="color-picker-wrapper">
                        <input
                          type="color"
                          id="backgroundColor"
                          name="backgroundColor"
                          value={nuevoBadge.estilo.backgroundColor}
                          onChange={handleEstiloChange}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={nuevoBadge.estilo.backgroundColor}
                          onChange={(e) => handleEstiloChange({target: {name: 'backgroundColor', value: e.target.value}})}
                          className="color-input"
                          placeholder="#ff6b6b"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="color">Color del Texto</label>
                      <div className="color-picker-wrapper">
                        <input
                          type="color"
                          id="color"
                          name="color"
                          value={nuevoBadge.estilo.color}
                          onChange={handleEstiloChange}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={nuevoBadge.estilo.color}
                          onChange={(e) => handleEstiloChange({target: {name: 'color', value: e.target.value}})}
                          className="color-input"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="fontSize">Tamaño de Fuente</label>
                      <select
                        id="fontSize"
                        name="fontSize"
                        value={nuevoBadge.estilo.fontSize}
                        onChange={handleEstiloChange}
                        className="config-select"
                      >
                        <option value="10px">Pequeño (10px)</option>
                        <option value="12px">Mediano (12px)</option>
                        <option value="14px">Grande (14px)</option>
                        <option value="16px">Extra Grande (16px)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="borderRadius">Bordes Redondeados</label>
                      <select
                        id="borderRadius"
                        name="borderRadius"
                        value={nuevoBadge.estilo.borderRadius}
                        onChange={handleEstiloChange}
                        className="config-select"
                      >
                        <option value="0px">Sin redondeo</option>
                        <option value="2px">Levemente (2px)</option>
                        <option value="4px">Normal (4px)</option>
                        <option value="8px">Redondeado (8px)</option>
                        <option value="20px">Completamente (20px)</option>
                      </select>
                    </div>
                  </div>

                  <div className="preview-seccion">
                    <label>Vista Previa:</label>
                    <div className="preview-badge" style={nuevoBadge.estilo}>
                      {nuevoBadge.textoVisible || 'TU BADGE'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button onClick={cancelarFormBadge} className="btn-cancelar">
                  Cancelar
                </button>
                <button 
                  onClick={guardarBadge} 
                  className="btn-guardar"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : (badgeEditando ? 'Actualizar Badge' : 'Crear Badge')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección de Mensajes WhatsApp */}
      <div className="config-seccion">
        <h3>📱 Mensaje de WhatsApp - Pedido Listo</h3>
        <p className="config-descripcion">
          Este mensaje se envía desde la cocina cuando marcan un pedido como listo.
        </p>

        <div className="config-variables">
          <strong>Variables disponibles:</strong>
          <div className="variables-lista">
            <code>{'{nombre}'}</code> - Nombre del cliente
            <code>{'{numeroPedido}'}</code> - Número del pedido
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="mensajeWhatsApp">Mensaje personalizado:</label>
          <textarea
            id="mensajeWhatsApp"
            name="mensajeWhatsApp"
            value={config.mensajeWhatsApp}
            onChange={handleChange}
            rows={4}
            placeholder="Escribe el mensaje aquí..."
            className="config-textarea"
          />
          <small className="field-hint">
            ✅ Los emojis SÍ funcionan en WhatsApp. Puedes usar: 🍷 🍇 🧀 ✨ 🎉 etc.
          </small>
        </div>

        <div className="config-preview">
          <strong>Vista previa del mensaje:</strong>
          <div className="preview-box">
            {config.mensajeWhatsApp
              .replace('{nombre}', 'Gustavo')
              .replace('{numeroPedido}', '203')}
          </div>
        </div>

        <div className="config-acciones">
          <button 
            onClick={resetearMensaje}
            className="btn-secundario"
          >
            Restaurar mensaje predeterminado
          </button>
          <button 
            onClick={guardarConfiguracion}
            className="btn-guardar"
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .admin-configuracion {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .config-header {
          margin-bottom: 30px;
        }

        .config-header h2 {
          color: #6b1c4e;
          margin-bottom: 8px;
        }

        .config-header p {
          color: #666;
          margin: 0;
        }

        .mensaje {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .mensaje.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .mensaje.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .config-seccion {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .seccion-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 20px;
        }

        .config-seccion h3 {
          color: #6b1c4e;
          margin-bottom: 8px;
        }

        .config-descripcion {
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .btn-nuevo-badge {
          padding: 10px 20px;
          background: #6b1c4e;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .btn-nuevo-badge:hover {
          background: #551638;
        }

        .badges-lista {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .badge-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          background: #fafafa;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .badge-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .badge-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .badge-preview {
          display: inline-block;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-acciones {
          display: flex;
          gap: 8px;
        }

        .btn-editar,
        .btn-eliminar {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .btn-editar:hover {
          background: #e3f2fd;
        }

        .btn-eliminar:hover {
          background: #ffebee;
        }

        .badge-card-info {
          font-size: 13px;
          color: #666;
        }

        .badge-card-info p {
          margin: 6px 0;
        }

        .estado-activo {
          color: #28a745;
          font-weight: 600;
        }

        .estado-inactivo {
          color: #dc3545;
          font-weight: 600;
        }

        .estado-vacio {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-badge {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          color: #6b1c4e;
        }

        .btn-cerrar-modal {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 4px 8px;
          line-height: 1;
        }

        .btn-cerrar-modal:hover {
          color: #333;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .config-input,
        .config-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .config-input:focus,
        .config-select:focus {
          outline: none;
          border-color: #6b1c4e;
          box-shadow: 0 0 0 3px rgba(107, 28, 78, 0.1);
        }

        .field-hint {
          display: block;
          margin-top: 6px;
          color: #666;
          font-size: 12px;
        }

        .items-seleccion {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 12px;
          background: #fafafa;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .checkbox-item:hover {
          background: #f0f0f0;
        }

        .checkbox-item input[type="checkbox"] {
          cursor: pointer;
        }

        .seccion-diseno {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-top: 24px;
        }

        .seccion-diseno h4 {
          margin: 0 0 16px 0;
          color: #6b1c4e;
        }

        .form-grid-diseno {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .color-picker-wrapper {
          display: flex;
          gap: 8px;
        }

        .color-picker {
          width: 50px;
          height: 38px;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
        }

        .color-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }

        .preview-seccion {
          padding: 20px;
          background: white;
          border-radius: 8px;
          text-align: center;
        }

        .preview-seccion label {
          display: block;
          margin-bottom: 12px;
          font-weight: 600;
          color: #333;
        }

        .preview-badge {
          display: inline-block;
          font-weight: 600;
          text-transform: uppercase;
          margin: 0 auto;
        }

        .btn-cancelar {
          padding: 10px 20px;
          background: #f8f9fa;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-cancelar:hover {
          background: #e9ecef;
          border-color: #999;
        }

        .config-variables {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .config-variables strong {
          display: block;
          margin-bottom: 10px;
          color: #333;
        }

        .variables-lista {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .variables-lista code {
          background: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          color: #6b1c4e;
          border: 1px solid #ddd;
          font-size: 13px;
        }

        .config-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .config-textarea:focus {
          outline: none;
          border-color: #6b1c4e;
          box-shadow: 0 0 0 3px rgba(107, 28, 78, 0.1);
        }

        .config-preview {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .config-preview strong {
          display: block;
          margin-bottom: 10px;
          color: #333;
        }

        .preview-box {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #ddd;
          color: #333;
          line-height: 1.6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .config-acciones {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-secundario {
          padding: 10px 20px;
          background: #f8f9fa;
          color: #6b1c4e;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-secundario:hover {
          background: #e9ecef;
          border-color: #6b1c4e;
        }

        .btn-guardar {
          padding: 10px 24px;
          background: #6b1c4e;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-guardar:hover:not(:disabled) {
          background: #551638;
        }

        .btn-guardar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        @media (max-width: 768px) {
          .admin-configuracion {
            padding: 16px;
          }

          .config-seccion {
            padding: 16px;
          }

          .seccion-header {
            flex-direction: column;
          }

          .btn-nuevo-badge {
            width: 100%;
          }

          .badges-lista {
            grid-template-columns: 1fr;
          }

          .form-grid,
          .form-grid-diseno {
            grid-template-columns: 1fr;
          }

          .config-acciones,
          .modal-footer {
            flex-direction: column;
          }

          .btn-secundario,
          .btn-guardar,
          .btn-cancelar {
            width: 100%;
          }

          .modal-badge {
            max-height: 95vh;
          }
        }
      `}</style>
    </div>
  );
}

export default AdminConfiguracion;
