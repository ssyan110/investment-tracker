import React, { useRef } from 'react';
import { Asset, Transaction } from '../types';

interface DataManagementProps {
  currentAssets: Asset[];
  currentTransactions: Transaction[];
  onImport: (assets: Asset[], transactions: Transaction[]) => void;
  onReset: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ 
  currentAssets, 
  currentTransactions, 
  onImport, 
  onReset 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      assets: currentAssets,
      transactions: currentTransactions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-grade-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.assets && json.transactions) {
          if (confirm(`Importing will overwrite current data. Found ${json.transactions.length} transactions. Continue?`)) {
            onImport(json.assets, json.transactions);
          }
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON.');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center space-x-4 text-xs">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json" 
      />
      
      <button onClick={handleExport} className="text-zinc-500 hover:text-white transition-colors">
        Export Data
      </button>
      
      <span className="text-zinc-700">|</span>
      
      <button onClick={handleImportClick} className="text-zinc-500 hover:text-white transition-colors">
        Import JSON
      </button>
      
      <span className="text-zinc-700">|</span>
      
      <button 
        onClick={() => {
            if(confirm('Are you sure you want to reset to default demo data? All local changes will be lost.')) {
                onReset();
            }
        }} 
        className="text-rose-500 hover:text-rose-400 transition-colors"
      >
        Reset App
      </button>
    </div>
  );
};