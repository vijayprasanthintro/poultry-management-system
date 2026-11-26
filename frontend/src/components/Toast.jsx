import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type = 'success', message = '') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4200);
  }, [remove]);

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  const icons = {
    success: (
      <span className="h-4 w-4 text-emerald-500 text-lg leading-none">✓</span>
    ),
    error: <span className="h-4 w-4 text-red-500 text-lg leading-none">✕</span>,
    info: (
      <span className="h-4 w-4 text-brand-500 text-lg leading-none">i</span>
    ),
  };

  const bg = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-brand-200 bg-brand-50 text-brand-900',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 shadow-lg ${bg[t.type]}`}
          >
            <span className="mt-0.5">{icons[t.type]}</span>
            <p className="flex-1 text-sm font-medium break-words">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);