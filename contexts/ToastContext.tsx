import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 5000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-24 right-6 z-[200] space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border animate-fade-in-right max-w-sm ${
              toast.type === 'success' ? 'bg-ug-navy border-ug-teal text-white' :
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-white border-gray-100 text-ug-navy'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="text-ug-teal shrink-0" size={20} />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
            ) : (
              <AlertCircle size={20} className="shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 p-1 hover:bg-white/10 rounded-full transition">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
