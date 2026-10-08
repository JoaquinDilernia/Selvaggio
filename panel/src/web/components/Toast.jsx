import { createContext, useContext, useState } from 'react';
import './Toast.css';

/**
 * Sistema de notificaciones Toast profesional
 * Reemplaza los alert() por notificaciones elegantes
 */

let toastId = 0;

// Contexto global para los toasts
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = toastId++;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (message, duration = 3000) => addToast(message, 'success', duration);
  const error = (message, duration = 3000) => addToast(message, 'error', duration);
  const warning = (message, duration = 3000) => addToast(message, 'warning', duration);
  const info = (message, duration = 3000) => addToast(message, 'info', duration);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

function Toast({ toast, onClose }) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => onClose(toast.id)}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={() => onClose(toast.id)}>×</button>
    </div>
  );
}

// Export para compatibilidad (ya no se usa directamente)
export function ToastContainer() {
  return null;
}

export default Toast;
