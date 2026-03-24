import { useRef } from 'react';
import { Asset, Transaction } from '../types';

interface DataManagementProps {
  currentAssets: Asset[];
  currentTransactions: Transaction[];
  onImport: (assets: Asset[], transactions: Transaction[]) => void;
  onReset: () => void;
  onRequestConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  currentAssets, currentTransactions, onImport, onReset, onRequestConfirm, onToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = { version: 1, timestamp: new Date().toISOString(), assets: currentAssets, transactions: currentTransactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('Backup exported', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.assets && json.transactions) {
          onRequestConfirm('Import Data', `This will overwrite current data with ${json.transactions.length} transactions. Continue?`, () => {
            onImport(json.assets, json.transactions);
            onToast('Data imported successfully', 'success');
          });
        } else {
          onToast('Invalid file format', 'error');
        }
      } catch {
        onToast('Failed to parse JSON file', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2 justify-center flex-wrap">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      <button onClick={handleExport} className="glass-btn text-[11px] py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Export</button>
      <button onClick={() => fileInputRef.current?.click()} className="glass-btn text-[11px] py-2 px-3" style={{ color: 'var(--text-secondary)' }}>Import</button>
      <button onClick={() => onRequestConfirm('Reset All Data', 'Are you sure? All local data will be permanently lost.', onReset, true)} className="glass-btn glass-btn-danger text-[11px] py-2 px-3">Reset</button>
    </div>
  );
};
