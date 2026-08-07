import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Undo2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onUndo?: () => void;
  duration?: number;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', onUndo?: () => void, duration = 4000) => {
  if (toastListener) {
    toastListener({
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      onUndo,
      duration
    });
  } else {
    console.log(`[Toast ${type}] ${message}`);
  }
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, newToast.duration || 4000);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col space-y-3 max-w-lg w-full px-4 pointer-events-none">
      {toasts.map(toast => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between p-4 sm:p-4.5 bg-zinc-950/95 dark:bg-zinc-900/95 text-white dark:text-slate-100 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-700 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200 gap-3"
          >
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />}
              <span className="text-sm font-extrabold leading-snug">{toast.message}</span>
            </div>

            <div className="flex items-center space-x-2.5 flex-shrink-0">
              {toast.onUndo && (
                <button
                  onClick={() => {
                    toast.onUndo?.();
                    removeToast(toast.id);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-black dark:hover:bg-slate-100 border border-zinc-700 dark:border-zinc-200 rounded-xl font-black text-xs transition shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition rounded-xl cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
