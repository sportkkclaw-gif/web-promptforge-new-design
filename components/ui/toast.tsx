'use client';

import * as React from 'react';
import { cn } from '@/lib/ui';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  onClose: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-destructive text-destructive-foreground',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-primary text-primary-foreground',
};

function Toast({ id, message, variant = 'info', onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[300px] max-w-[400px]',
        variantStyles[variant]
      )}
      role="alert"
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="text-sm opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastItem extends Omit<ToastProps, 'onClose'> {}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}