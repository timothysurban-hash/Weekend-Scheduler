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
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col space-y-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map(toast => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200 text-xs font-medium"
          >
            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {toast.onUndo && (
                <button
                  onClick={() => {
                    toast.onUndo?.();
                    removeToast(toast.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] transition shadow-sm cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-white transition rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
