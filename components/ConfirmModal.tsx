interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-[55] flex items-center justify-center animate-fade-in px-4"
    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
  >
    <div className="w-full max-w-xs glass-elevated p-5 animate-scale-in" style={{ borderRadius: 'var(--radius-xl)' }}>
      <h3 className="text-[17px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="glass-btn flex-1">Cancel</button>
        <button
          onClick={onConfirm}
          className={`glass-btn flex-1 ${danger ? 'glass-btn-danger' : 'glass-btn-primary'}`}
          style={danger ? { background: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.3)' } : {}}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
