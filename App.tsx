import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Transaction, TransactionType, InventoryState, PortfolioPosition, AssetType, Asset, AccountingMethod } from './types';
import { calculateInventoryState } from './engine';
import { loadAll, readCache, clearCache, pingBackend, createAsset, createTransaction, updateAsset, updateTransaction, deleteAsset, deleteTransaction } from './services/storage';
import { TransactionForm } from './components/TransactionForm';
import { LedgerTable } from './components/LedgerTable';
import { InventoryTable } from './components/InventoryTable';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { AddAssetForm } from './components/AddAssetForm';
import { DataManagement } from './components/DataManagement';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { round, formatCurrency, formatUnit } from './utils';

const ASSET_TYPES = [AssetType.GOLD, AssetType.ETF, AssetType.STOCK, AssetType.CRYPTO];
const TYPE_ICONS: Record<string, string> = { [AssetType.GOLD]: '🥇', [AssetType.ETF]: '📊', [AssetType.STOCK]: '📈', [AssetType.CRYPTO]: '₿' };
const TYPE_DOT_CLASS: Record<string, string> = { [AssetType.GOLD]: 'type-dot-gold', [AssetType.ETF]: 'type-dot-etf', [AssetType.STOCK]: 'type-dot-stock', [AssetType.CRYPTO]: 'type-dot-crypto' };

type ViewState = 'HOME' | 'ASSET_DETAIL';

function App() {
  // View
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'inventory'>('dashboard');
  const [expandedTypes, setExpandedTypes] = useState<Set<AssetType>>(new Set(ASSET_TYPES));
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataSource, setDataSource] = useState<'none' | 'cache' | 'live'>('none');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const hasFetched = useRef(false);

  // Modals
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [addAssetType, setAddAssetType] = useState<AssetType>(AssetType.STOCK);
  const [showQuickTrade, setShowQuickTrade] = useState(false);
  const [quickTradeAssetId, setQuickTradeAssetId] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  // Toast & Confirm
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void; danger?: boolean } | null>(null);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: Date.now().toString() + Math.random(), text, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void, danger?: boolean) => {
    setConfirmState({ title, message, onConfirm, danger });
  }, []);

  // ===== DATA LOADING =====
  const fetchData = useCallback(async (showRefresh: boolean) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      setLoadError(null);
      const result = await loadAll();
      if (result) {
        setAssets(result.assets);
        setTransactions(result.transactions);
        setDataSource('live');
        setLastSyncTime(Date.now());
      }
      return !!result;
    } catch (e) {
      console.error('Failed to load data', e);
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const cached = readCache();
    if (cached) {
      setAssets(cached.assets);
      setTransactions(cached.transactions);
      setDataSource('cache');
      setLastSyncTime(cached.ts);
      setIsLoading(false);
    }
    pingBackend();
    (async () => {
      const ok = await fetchData(!cached);
      if (!ok && !cached) {
        setLoadError('Could not reach database. Check your connection.');
        setIsLoading(false);
      }
    })();
  }, [fetchData]);

  // Sync cache
  useEffect(() => {
    if (dataSource !== 'none' && (assets.length > 0 || transactions.length > 0)) {
      try {
        localStorage.setItem('it_cache_assets', JSON.stringify(assets));
        localStorage.setItem('it_cache_transactions', JSON.stringify(transactions));
        localStorage.setItem('it_cache_ts', String(Date.now()));
      } catch { /* ignore */ }
    }
  }, [assets, transactions, dataSource]);

  // ===== PULL TO REFRESH =====
  const handlePullStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) { pullStartY.current = e.touches[0].clientY; setIsPulling(true); }
  };
  const handlePullMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const diff = Math.max(0, (e.touches[0].clientY - pullStartY.current) * 0.4);
    setPullDistance(Math.min(diff, 100));
  };
  const handlePullEnd = () => {
    if (pullDistance > 60 && !isRefreshing) {
      fetchData(true).then(() => toast('Refreshed', 'success'));
    }
    setPullDistance(0);
    setIsPulling(false);
  };

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleOpenQuickTrade(selectedAssetId || undefined); }
      if (e.key === 'Escape') { if (showQuickTrade) handleCloseQuickTrade(); if (showAddAssetModal) setShowAddAssetModal(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ===== COMPUTED STATE =====
  const inventoryState = useMemo(() => {
    const map: Record<string, InventoryState[]> = {};
    assets.forEach(asset => { map[asset.id] = calculateInventoryState(transactions, asset); });
    return map;
  }, [transactions, assets]);

  const portfolioPositions: PortfolioPosition[] = useMemo(() => {
    return assets.map(asset => {
      const history = inventoryState[asset.id];
      const latest = history[history.length - 1];
      const units = latest ? latest.unitsAfter : 0;
      const avgCost = latest ? latest.avgCostAfter : 0;
      const investmentAmount = latest ? latest.inventoryValueAfter : 0;
      const marketPrice = asset.currentMarketPrice || 0;
      const marketValue = round(units * marketPrice, 2);
      const unrealizedPnl = round(marketValue - investmentAmount, 2);
      const returnPercentage = investmentAmount > 0 ? unrealizedPnl / investmentAmount : 0;
      return { asset, units, avgCost, investmentAmount, marketPrice, marketValue, unrealizedPnl, returnPercentage };
    });
  }, [inventoryState, assets]);

  const statsByType = useMemo(() => {
    const stats: Record<string, { value: number; cost: number; pnl: number; count: number }> = {};
    ASSET_TYPES.forEach(t => {
      const tp = portfolioPositions.filter(p => p.asset.type === t);
      stats[t] = { value: tp.reduce((s, p) => s + p.marketValue, 0), cost: tp.reduce((s, p) => s + p.investmentAmount, 0), pnl: 0, count: tp.length };
      stats[t].pnl = stats[t].value - stats[t].cost;
    });
    return stats;
  }, [portfolioPositions]);

  // Search filter
  const filteredPositions = useMemo(() => {
    if (!searchQuery) return portfolioPositions;
    const q = searchQuery.toLowerCase();
    return portfolioPositions.filter(p => p.asset.symbol.toLowerCase().includes(q) || p.asset.name.toLowerCase().includes(q));
  }, [portfolioPositions, searchQuery]);

  // Sync time display
  const syncLabel = useMemo(() => {
    if (!lastSyncTime) return null;
    const diff = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [lastSyncTime]);

  // ===== HANDLERS =====
  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setView('ASSET_DETAIL');
    setActiveTab('dashboard');
    setEditingTransaction(null);
    setEditingPriceId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setView('HOME');
    setSelectedAssetId('');
    setEditingTransaction(null);
    setEditingPriceId(null);
  };

  const handleToggleType = (type: AssetType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleOpenQuickTrade = (assetId?: string) => {
    setQuickTradeAssetId(assetId || assets[0]?.id || '');
    setEditingTransaction(null);
    setShowQuickTrade(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setQuickTradeAssetId(tx.assetId);
    setShowQuickTrade(true);
  };

  const handleCloseQuickTrade = () => {
    setShowQuickTrade(false);
    setEditingTransaction(null);
  };

  const handleAddTransaction = async (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number, note: string) => {
    setIsSaving(true);
    try {
      const newTx = { assetId, date, type, quantity, pricePerUnit: price, fees, totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2), note: note || undefined };
      const created = await createTransaction(newTx);
      setTransactions(prev => [...prev, created]);
      setShowQuickTrade(false);
      toast('Transaction added', 'success');
    } catch (e) {
      console.error('Failed to create transaction', e);
      toast('Failed to create transaction', 'error');
    } finally { setIsSaving(false); }
  };

  const handleUpdateTransaction = async (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number, note: string) => {
    setIsSaving(true);
    try {
      const updates = { assetId, type, date, quantity, pricePerUnit: price, fees, totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2), note: note || undefined };
      const updated = await updateTransaction(id, updates);
      setTransactions(prev => prev.map(tx => tx.id === id ? updated : tx));
      setEditingTransaction(null);
      setShowQuickTrade(false);
      toast('Transaction updated', 'success');
    } catch (e) {
      console.error('Failed to update transaction', e);
      toast('Failed to update transaction', 'error');
    } finally { setIsSaving(false); }
  };

  const handleDeleteTransaction = (id: string) => {
    requestConfirm('Delete Transaction', 'This action cannot be undone.', async () => {
      try {
        await deleteTransaction(id);
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        toast('Transaction deleted', 'success');
      } catch (e) {
        console.error('Failed to delete transaction', e);
        toast('Failed to delete transaction', 'error');
      }
    }, true);
  };

  const handleStartEditPrice = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    setEditingPriceId(assetId);
    setEditingPriceValue(asset?.currentMarketPrice?.toString() || '');
  };

  const handleSavePrice = async () => {
    if (!editingPriceId) return;
    const price = editingPriceValue === '' ? 0 : parseFloat(editingPriceValue);
    const asset = assets.find(a => a.id === editingPriceId);
    if (!asset) return;
    try {
      const updated = await updateAsset(editingPriceId, { ...asset, currentMarketPrice: price });
      setAssets(prev => prev.map(a => a.id === editingPriceId ? updated : a));
      setEditingPriceId(null);
      toast('Price updated', 'success');
    } catch (e) {
      console.error('Failed to update price', e);
      toast('Failed to update price', 'error');
    }
  };

  const handleCancelEditPrice = () => { setEditingPriceId(null); };

  const handleOpenAddAsset = (type: AssetType) => { setAddAssetType(type); setShowAddAssetModal(true); };

  const handleSaveNewAsset = async (symbol: string, name: string, currency: string, method: AccountingMethod) => {
    setIsSaving(true);
    try {
      const created = await createAsset({ symbol, name, type: addAssetType, method, currency, currentMarketPrice: 0 });
      setAssets(prev => [...prev, created]);
      setShowAddAssetModal(false);
      toast(`${symbol} added`, 'success');
    } catch (e) {
      console.error('Failed to create asset', e);
      toast('Failed to create asset', 'error');
    } finally { setIsSaving(false); }
  };

  const handleDeleteAsset = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    requestConfirm('Delete Asset', `Delete ${asset?.symbol || 'this asset'} and all its transactions? This cannot be undone.`, async () => {
      try {
        await deleteAsset(assetId);
        setAssets(prev => prev.filter(a => a.id !== assetId));
        setTransactions(prev => prev.filter(tx => tx.assetId !== assetId));
        if (selectedAssetId === assetId) handleBackToHome();
        toast('Asset deleted', 'success');
      } catch (e) {
        console.error('Failed to delete asset', e);
        toast('Failed to delete asset', 'error');
      }
    }, true);
  };

  const handleDataImport = (newAssets: Asset[], newTransactions: Transaction[]) => {
    setAssets(newAssets);
    setTransactions(newTransactions);
    try {
      localStorage.setItem('it_cache_assets', JSON.stringify(newAssets));
      localStorage.setItem('it_cache_transactions', JSON.stringify(newTransactions));
      localStorage.setItem('it_cache_ts', String(Date.now()));
    } catch { /* ignore */ }
    setDataSource('live');
    setLastSyncTime(Date.now());
    setView('HOME');
  };

  const handleDataReset = () => {
    clearCache();
    setAssets([]);
    setTransactions([]);
    setDataSource('none');
    setView('HOME');
    toast('All data reset', 'info');
  };

  // ===== DERIVED =====
  const currentAssetPosition = selectedAssetId ? portfolioPositions.find(p => p.asset.id === selectedAssetId) : null;
  const currentAssetTransactions = selectedAssetId ? transactions.filter(t => t.assetId === selectedAssetId) : [];
  const currentAssetInventory = selectedAssetId ? inventoryState[selectedAssetId] || [] : [];
  const totalValue = portfolioPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = portfolioPositions.reduce((s, p) => s + p.investmentAmount, 0);
  const totalPnl = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? totalPnl / totalCost : 0;

  return (
    <div className="min-h-screen min-h-[100dvh] pb-24" ref={mainRef}
      onTouchStart={handlePullStart} onTouchMove={handlePullMove} onTouchEnd={handlePullEnd}>
      <div className="ambient-glow" />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal title={confirmState.title} message={confirmState.message} danger={confirmState.danger}
          confirmLabel={confirmState.danger ? 'Delete' : 'Confirm'}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)} />
      )}

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 transition-all" style={{ opacity: pullDistance / 80 }}>
          <div className={`w-8 h-8 border-2 border-transparent border-t-[var(--accent-blue)] rounded-full ${pullDistance > 60 ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
        </div>
      )}

      {/* ===== HEADER ===== */}
      <header className="glass-header fixed top-0 w-full z-50">
        <div className="desktop-header-inner px-4 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleBackToHome}>
            <div className="h-7 w-7 rounded-[10px] bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-[11px] font-bold text-black shadow-lg shadow-amber-500/20">I</div>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Portfolio</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync indicator */}
            {syncLabel && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: dataSource === 'live' ? 'var(--accent-green)' : 'var(--accent-orange)' }} />
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-quaternary)' }}>{dataSource === 'cache' ? 'Cached' : syncLabel}</span>
              </div>
            )}
            {isRefreshing && <div className="w-4 h-4 border-2 border-transparent border-t-[var(--accent-blue)] rounded-full animate-spin" />}
            {/* Refresh button (desktop) */}
            <button onClick={() => fetchData(true).then(() => toast('Refreshed', 'success'))}
              className="hidden sm:flex items-center gap-1 text-[12px] font-medium transition-opacity active:opacity-60"
              style={{ color: 'var(--accent-blue)' }} title="Refresh">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            {view === 'ASSET_DETAIL' && (
              <button onClick={handleBackToHome} className="flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--accent-blue)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Add Asset Modal */}
      {showAddAssetModal && <AddAssetForm type={addAssetType} onSave={handleSaveNewAsset} onCancel={() => setShowAddAssetModal(false)} />}

      {/* ===== QUICK TRADE BOTTOM SHEET ===== */}
      {showQuickTrade && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) handleCloseQuickTrade(); }}>
          <div className="w-full max-w-md mx-2 sm:mx-auto glass-elevated overflow-hidden animate-slide-up sm:m-4 bottom-sheet-radius"
            style={{ maxHeight: '85dvh', overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-glass-strong)' }} />
            </div>
            <div className="px-5 pt-3 pb-2 flex justify-between items-center">
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingTransaction ? 'Edit Transaction' : 'Quick Trade'}
              </h3>
              <button onClick={handleCloseQuickTrade} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-glass-elevated)', color: 'var(--text-tertiary)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-6 pt-1 overflow-x-hidden">
              <TransactionForm assets={assets} initialAssetId={quickTradeAssetId} initialData={editingTransaction} isSaving={isSaving}
                onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onCancel={handleCloseQuickTrade}
                showAssetPicker={!editingTransaction && view === 'HOME'} />
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP LAYOUT WRAPPER ===== */}
      <div className="desktop-layout main-content">
        {/* Desktop sidebar */}
        <aside className="desktop-sidebar">
          <div className="p-4 space-y-4 sticky top-20">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search assets…" className="glass-input pl-10 text-[13px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {/* Asset tree */}
            {ASSET_TYPES.map(type => {
              const typeAssets = filteredPositions.filter(p => p.asset.type === type);
              if (searchQuery && typeAssets.length === 0) return null;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                    <span className="text-[14px]">{TYPE_ICONS[type]}</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{type}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-quaternary)' }}>{typeAssets.length}</span>
                  </div>
                  {typeAssets.map(pos => (
                    <button key={pos.asset.id} onClick={() => handleSelectAsset(pos.asset.id)}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all"
                      style={{
                        background: selectedAssetId === pos.asset.id ? 'var(--bg-glass-elevated)' : 'transparent',
                        borderLeft: selectedAssetId === pos.asset.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      }}>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.asset.symbol}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{pos.asset.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pos.marketValue, pos.asset.currency)}</div>
                        <div className="text-[10px] font-mono" style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {pos.unrealizedPnl > 0 ? '+' : ''}{(pos.returnPercentage * 100).toFixed(1)}%
                        </div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => handleOpenAddAsset(type)} className="w-full text-left px-3 py-1.5 text-[11px] font-medium transition-opacity active:opacity-60" style={{ color: 'var(--text-quaternary)' }}>
                    + Add {type}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="desktop-main relative z-10 px-4 pb-8">
          {loadError && (
            <div className="glass mb-4 px-4 py-3 text-[13px]" style={{ borderColor: 'rgba(255,69,58,0.3)', color: 'var(--accent-red)' }}>{loadError}</div>
          )}

          {/* Loading */}
          {isLoading && dataSource === 'none' && (
            <div className="space-y-4 animate-fade-in">
              <div className="skeleton h-32 w-full" />
              <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
              <div className="flex items-center justify-center gap-2 py-8">
                <div className="w-5 h-5 border-2 border-transparent border-t-[var(--accent-blue)] rounded-full animate-spin" />
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading portfolio…</span>
              </div>
            </div>
          )}

          {/* ===== HOME VIEW ===== */}
          {view === 'HOME' && !(isLoading && dataSource === 'none') && (
            <div className="space-y-5 animate-fade-in">
              {/* Hero */}
              <div className="glass-elevated p-5">
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Total Portfolio</div>
                <div className="text-[32px] font-bold font-mono tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalValue)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={totalPnl >= 0 ? 'badge-green' : 'badge-red'}>{totalPnl > 0 ? '+' : ''}{formatCurrency(totalPnl)}</span>
                  <span className="text-[12px] font-mono" style={{ color: totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(totalReturn * 100).toFixed(2)}%</span>
                </div>
              </div>

              <DataManagement currentAssets={assets} currentTransactions={transactions} onImport={handleDataImport} onReset={handleDataReset} onRequestConfirm={requestConfirm} onToast={toast} />

              {/* Mobile search */}
              <div className="sm:hidden relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Search assets…" className="glass-input pl-10 text-[13px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              {/* Asset Groups */}
              {ASSET_TYPES.map(type => {
                const stat = statsByType[type];
                const isExpanded = expandedTypes.has(type);
                const typeAssets = filteredPositions.filter(p => p.asset.type === type);
                if (searchQuery && typeAssets.length === 0) return null;

                return (
                  <div key={type} className="space-y-2">
                    <button onClick={() => handleToggleType(type)} className="w-full flex items-center justify-between px-1 py-2 transition-all active:opacity-80">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[18px]">{TYPE_ICONS[type]}</span>
                        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{type}</span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{stat.count} asset{stat.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(stat.value)}</div>
                          <div className="text-[10px] font-mono" style={{ color: stat.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{stat.pnl > 0 ? '+' : ''}{formatCurrency(stat.pnl)}</div>
                        </div>
                        <svg className="w-4 h-4 transition-transform duration-200" style={{ color: 'var(--text-quaternary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 stagger-children">
                        {typeAssets.map(pos => (
                          <div key={pos.asset.id} className="glass flex items-center gap-3 p-4 transition-all duration-300 active:scale-[0.98] cursor-pointer" onClick={() => handleSelectAsset(pos.asset.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`type-dot ${TYPE_DOT_CLASS[pos.asset.type]}`} />
                                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.asset.symbol}</span>
                                <span className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{pos.asset.name}</span>
                              </div>
                              <div className="text-[11px] font-mono ml-[18px]" style={{ color: 'var(--text-secondary)' }}>{formatUnit(pos.units)} units · {pos.asset.currency}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pos.marketValue, pos.asset.currency)}</div>
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono" style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl, pos.asset.currency)}</span>
                                <span className={pos.returnPercentage >= 0 ? 'badge-green' : 'badge-red'} style={{ fontSize: '9px', padding: '1px 5px' }}>{(pos.returnPercentage * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); handleOpenQuickTrade(pos.asset.id); }}
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                              style={{ background: 'rgba(100,210,255,0.1)', border: '1px solid rgba(100,210,255,0.2)' }} title="Quick trade">
                              <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => handleOpenAddAsset(type)} className="w-full glass p-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98]" style={{ borderStyle: 'dashed', borderColor: 'var(--border-glass)' }}>
                          <svg className="w-4 h-4" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Add {type}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== ASSET DETAIL ===== */}
          {view === 'ASSET_DETAIL' && currentAssetPosition && (
            <div className="space-y-5 animate-slide-up">
              <div className="glass-elevated p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`type-dot ${TYPE_DOT_CLASS[currentAssetPosition.asset.type]}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      {currentAssetPosition.asset.type} · {currentAssetPosition.asset.method.replace('_', ' ')} · {currentAssetPosition.asset.currency}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteAsset(currentAssetPosition.asset.id)} className="text-[11px] font-semibold transition-opacity active:opacity-60" style={{ color: 'var(--accent-red)' }}>Delete</button>
                </div>
                <h2 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{currentAssetPosition.asset.symbol}</h2>
                <p className="text-[13px] mb-4" style={{ color: 'var(--text-tertiary)' }}>{currentAssetPosition.asset.name}</p>

                {/* Tap-to-edit price */}
                <div className="glass p-3 flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Price</span>
                  <span className="text-[13px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{currentAssetPosition.asset.currency}</span>
                  {editingPriceId === currentAssetPosition.asset.id ? (
                    <>
                      <input type="number" step="any" autoFocus value={editingPriceValue} onChange={e => setEditingPriceValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(); if (e.key === 'Escape') handleCancelEditPrice(); }}
                        className="flex-1 bg-transparent text-right text-[18px] font-bold font-mono outline-none" style={{ color: 'var(--accent-blue)' }} placeholder="0.00" />
                      <button onClick={handleSavePrice} className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(48,209,88,0.15)', color: 'var(--accent-green)' }}>Save</button>
                      <button onClick={handleCancelEditPrice} className="text-[11px] font-semibold" style={{ color: 'var(--text-quaternary)' }}>✕</button>
                    </>
                  ) : (
                    <div className="flex-1 text-right cursor-pointer transition-opacity active:opacity-60" onClick={() => handleStartEditPrice(currentAssetPosition.asset.id)}>
                      <span className="text-[18px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                        {currentAssetPosition.asset.currentMarketPrice ? formatCurrency(currentAssetPosition.asset.currentMarketPrice, currentAssetPosition.asset.currency) : '—'}
                      </span>
                      <span className="text-[10px] ml-2" style={{ color: 'var(--text-quaternary)' }}>tap to edit</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="segmented-control w-full flex">
                {(['dashboard', 'ledger', 'inventory'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 ${activeTab === tab ? 'active' : ''}`}>
                    {tab === 'dashboard' ? 'Overview' : tab === 'ledger' ? 'Trades' : 'Audit'}
                  </button>
                ))}
              </div>

              <div className="min-h-[300px]">
                {activeTab === 'dashboard' && <div className="animate-fade-in"><PortfolioDashboard positions={[currentAssetPosition]} /></div>}
                {activeTab === 'ledger' && (
                  <div className="space-y-5 animate-fade-in">
                    <LedgerTable transactions={currentAssetTransactions} currency={currentAssetPosition.asset.currency} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} />
                  </div>
                )}
                {activeTab === 'inventory' && <div className="animate-fade-in"><InventoryTable history={currentAssetInventory} currency={currentAssetPosition.asset.currency} /></div>}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ===== FAB ===== */}
      {!(isLoading && dataSource === 'none') && !showQuickTrade && !showAddAssetModal && assets.length > 0 && (
        <button onClick={() => handleOpenQuickTrade(selectedAssetId || undefined)}
          className="fixed z-40 flex items-center justify-center transition-all duration-200 active:scale-90 fab-button"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', right: '24px',
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(100,210,255,0.3), rgba(125,122,255,0.3))',
            border: '1px solid rgba(100,210,255,0.4)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(100,210,255,0.2), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
          }} title="Quick Trade (N)">
          <svg className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
