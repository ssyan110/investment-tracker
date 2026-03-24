import { useEffect, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => (
  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
    {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
  </div>
);

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const dismiss = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss]);
  useEffect(() => { const t = setTimeout(dismiss, 3000); return () => clearTimeout(t); }, [dismiss]);

  const c = toast.type === 'success'
    ? { bg: 'rgba(48,209,88,0.15)', border: 'rgba(48,209,88,0.3)', color: 'var(--accent-green)' }
    : toast.type === 'error'
    ? { bg: 'rgba(255,69,58,0.15)', border: 'rgba(255,69,58,0.3)', color: 'var(--accent-red)' }
    : { bg: 'rgba(100,210,255,0.15)', border: 'rgba(100,210,255,0.3)', color: 'var(--accent-blue)' };

  return (
    <div
      className="pointer-events-auto animate-slide-up px-4 py-3 rounded-2xl text-[13px] font-semibold cursor-pointer"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      onClick={dismiss}
    >
      {toast.text}
    </div>
  );
};
