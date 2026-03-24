import { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, InventoryState, PortfolioPosition, AssetType, Asset, AccountingMethod } from './types';
import { calculateInventoryState, runGoldenTest } from './engine';
import { loadAll, readCache, clearCache, pingBackend, createAsset, createTransaction, updateAsset, updateTransaction, deleteAsset, deleteTransaction } from './services/storage';
import { TransactionForm } from './components/TransactionForm';
import { LedgerTable } from './components/LedgerTable';
import { InventoryTable } from './components/InventoryTable';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { AddAssetForm } from './components/AddAssetForm';
import { DataManagement } from './components/DataManagement';
import { round, formatCurrency, formatUnit } from './utils';

const ASSET_TYPES = [AssetType.GOLD, AssetType.ETF, AssetType.STOCK, AssetType.CRYPTO];

const TYPE_ICONS: Record<string, string> = {
  [AssetType.GOLD]: '🥇',
  [AssetType.ETF]: '📊',
  [AssetType.STOCK]: '📈',
  [AssetType.CRYPTO]: '₿',
};

const TYPE_DOT_CLASS: Record<string, string> = {
  [AssetType.GOLD]: 'type-dot-gold',
  [AssetType.ETF]: 'type-dot-etf',
  [AssetType.STOCK]: 'type-dot-stock',
  [AssetType.CRYPTO]: 'type-dot-crypto',
};

type ViewState = 'HOME' | 'ASSET_DETAIL';

function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'inventory'>('dashboard');
  const [expandedTypes, setExpandedTypes] = useState<Set<AssetType>>(new Set(ASSET_TYPES));

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'none' | 'cache' | 'live'>('none');
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Modals
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [addAssetType, setAddAssetType] = useState<AssetType>(AssetType.STOCK);
  const [showQuickTrade, setShowQuickTrade] = useState(false);
  const [quickTradeAssetId, setQuickTradeAssetId] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const cached = readCache();
    if (cached) {
      setAssets(cached.assets);
      setTransactions(cached.transactions);
      setDataSource('cache');
      setIsLoading(false);
    }

    pingBackend();

    const fetchFresh = async () => {
      try {
        if (!cached) setIsLoading(true);
        else setIsRefreshing(true);
        setLoadError(null);
        const result = await loadAll();
        if (result) {
          setAssets(result.assets);
          setTransactions(result.transactions);
          setDataSource('live');
        } else if (!cached) {
          setLoadError('Could not reach database. Please check your connection.');
        }
      } catch (e) {
        console.error('Failed to load data', e);
        if (!cached) {
          setLoadError('Failed to load data from database.');
          setAssets([]);
          setTransactions([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchFresh();
  }, []);

  // Keep localStorage cache in sync
  useEffect(() => {
    if (dataSource !== 'none' && (assets.length > 0 || transactions.length > 0)) {
      try {
        localStorage.setItem('it_cache_assets', JSON.stringify(assets));
        localStorage.setItem('it_cache_transactions', JSON.stringify(transactions));
        localStorage.setItem('it_cache_ts', String(Date.now()));
      } catch { /* ignore */ }
    }
  }, [assets, transactions, dataSource]);

  // Engine self-test (runs once, result logged to console)
  useMemo(() => runGoldenTest(), []);

  const inventoryState = useMemo(() => {
    const map: Record<string, InventoryState[]> = {};
    assets.forEach(asset => {
      map[asset.id] = calculateInventoryState(transactions, asset);
    });
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
      const typePositions = portfolioPositions.filter(p => p.asset.type === t);
      const value = typePositions.reduce((sum, p) => sum + p.marketValue, 0);
      const cost = typePositions.reduce((sum, p) => sum + p.investmentAmount, 0);
      stats[t] = { value, cost, pnl: value - cost, count: typePositions.length };
    });
    return stats;
  }, [portfolioPositions]);

  // --- Handlers ---
  const handleSelectAsset = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setSelectedAssetId(assetId);
      setView('ASSET_DETAIL');
      setActiveTab('dashboard');
      setEditingTransaction(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToHome = () => {
    setView('HOME');
    setSelectedAssetId('');
    setEditingTransaction(null);
  };

  const handleToggleType = (type: AssetType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Quick Trade: open from FAB or from asset detail
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

  const handleAddTransaction = async (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => {
    try {
      const newTx = { assetId, date, type, quantity, pricePerUnit: price, fees, totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2) };
      const created = await createTransaction(newTx);
      setTransactions(prev => [...prev, created]);
      setShowQuickTrade(false);
    } catch (e) {
      console.error("Failed to create transaction", e);
      alert("Failed to create transaction");
    }
  };

  const handleUpdateTransaction = async (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => {
    try {
      const updates = { assetId, type, date, quantity, pricePerUnit: price, fees, totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2) };
      const updated = await updateTransaction(id, updates);
      setTransactions(prev => prev.map(tx => tx.id === id ? updated : tx));
      setEditingTransaction(null);
      setShowQuickTrade(false);
    } catch (e) {
      console.error("Failed to update transaction", e);
      alert("Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (e) {
      console.error("Failed to delete transaction", e);
      alert("Failed to delete transaction");
    }
  };

  const handleUpdatePrice = async (assetId: string, newPrice: string) => {
    try {
      const price = newPrice === '' ? 0 : parseFloat(newPrice);
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;
      const updated = await updateAsset(assetId, { ...asset, currentMarketPrice: price });
      setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
    } catch (e) {
      console.error("Failed to update price", e);
      alert("Failed to update price");
    }
  };

  const handleOpenAddAsset = (type: AssetType) => {
    setAddAssetType(type);
    setShowAddAssetModal(true);
  };

  const handleSaveNewAsset = async (symbol: string, name: string, currency: string, method: AccountingMethod) => {
    try {
      const newAsset = { symbol, name, type: addAssetType, method, currency, currentMarketPrice: 0 };
      const created = await createAsset(newAsset);
      setAssets(prev => [...prev, created]);
      setShowAddAssetModal(false);
    } catch (e) {
      console.error("Failed to create asset", e);
      alert("Failed to create asset");
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
      setTransactions(prev => prev.filter(tx => tx.assetId !== assetId));
      if (selectedAssetId === assetId) {
        handleBackToHome();
      }
    } catch (e) {
      console.error("Failed to delete asset", e);
      alert("Failed to delete asset");
    }
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
    setView('HOME');
  };

  const handleDataReset = () => {
    clearCache();
    setAssets([]);
    setTransactions([]);
    setDataSource('none');
    setView('HOME');
  };

  // --- Derived Data ---
  const currentAssetPosition = selectedAssetId ? portfolioPositions.find(p => p.asset.id === selectedAssetId) : null;
  const currentAssetTransactions = selectedAssetId ? transactions.filter(t => t.assetId === selectedAssetId) : [];
  const currentAssetInventory = selectedAssetId ? inventoryState[selectedAssetId] || [] : [];

  // --- Total Portfolio ---
  const totalValue = portfolioPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = portfolioPositions.reduce((s, p) => s + p.investmentAmount, 0);
  const totalPnl = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? totalPnl / totalCost : 0;

  return (
    <div className="min-h-screen min-h-[100dvh] pb-24">
      {/* Ambient Glow */}
      <div className="ambient-glow" />

      {/* ===== HEADER ===== */}
      <header className="glass-header fixed top-0 w-full z-50 transition-all duration-300">
        <div className="max-w-lg mx-auto px-4 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleBackToHome}>
            <div className="h-7 w-7 rounded-[10px] bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-[11px] font-bold text-black shadow-lg shadow-amber-500/20">I</div>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Portfolio</span>
          </div>
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="w-4 h-4 border-2 border-transparent border-t-[var(--accent-blue)] rounded-full animate-spin" />
            )}
            {view === 'ASSET_DETAIL' && (
              <button
                onClick={handleBackToHome}
                className="flex items-center gap-1 text-[13px] font-medium"
                style={{ color: 'var(--accent-blue)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Add Asset Modal */}
      {showAddAssetModal && (
        <AddAssetForm type={addAssetType} onSave={handleSaveNewAsset} onCancel={() => setShowAddAssetModal(false)} />
      )}

      {/* ===== QUICK TRADE BOTTOM SHEET ===== */}
      {showQuickTrade && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseQuickTrade(); }}>
          <div className="w-full max-w-md glass-elevated overflow-hidden animate-slide-up m-0 sm:m-4" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', maxHeight: '90dvh', overflowY: 'auto' }}>
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-glass-strong)' }} />
            </div>
            <div className="px-5 pt-3 pb-2 flex justify-between items-center">
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingTransaction ? 'Edit Transaction' : 'Quick Trade'}
              </h3>
              <button onClick={handleCloseQuickTrade} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-glass-elevated)', color: 'var(--text-tertiary)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 pb-5">
              <TransactionForm
                assets={assets}
                initialAssetId={quickTradeAssetId}
                initialData={editingTransaction}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onCancel={handleCloseQuickTrade}
                showAssetPicker={!editingTransaction && view === 'HOME'}
              />
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-lg mx-auto px-4 main-content pb-8">
        {/* Error */}
        {loadError && (
          <div className="glass mb-4 px-4 py-3 text-[13px]" style={{ borderColor: 'rgba(255,69,58,0.3)', color: 'var(--accent-red)' }}>
            {loadError}
          </div>
        )}

        {/* ===== LOADING SKELETON ===== */}
        {isLoading && dataSource === 'none' && (
          <div className="space-y-4 animate-fade-in">
            <div className="skeleton h-32 w-full" />
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
            </div>
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="w-5 h-5 border-2 border-transparent border-t-[var(--accent-blue)] rounded-full animate-spin" />
              <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading portfolio…</span>
            </div>
          </div>
        )}

        {/* ===== HOME VIEW: Flat layout with grouped assets ===== */}
        {view === 'HOME' && !(isLoading && dataSource === 'none') && (
          <div className="space-y-5 animate-fade-in">
            {/* Hero Summary */}
            <div className="glass-elevated p-5">
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Total Portfolio</div>
              <div className="text-[32px] font-bold font-mono tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(totalValue)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={totalPnl >= 0 ? 'badge-green' : 'badge-red'}>
                  {totalPnl > 0 ? '+' : ''}{formatCurrency(totalPnl)}
                </span>
                <span className="text-[12px] font-mono" style={{ color: totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {(totalReturn * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Data Controls */}
            <DataManagement
              currentAssets={assets}
              currentTransactions={transactions}
              onImport={handleDataImport}
              onReset={handleDataReset}
            />

            {/* Asset Groups by Type — flat, expandable */}
            {ASSET_TYPES.map(type => {
              const stat = statsByType[type];
              const isExpanded = expandedTypes.has(type);
              const typeAssets = portfolioPositions.filter(p => p.asset.type === type);

              return (
                <div key={type} className="space-y-2">
                  {/* Type Header — tap to expand/collapse */}
                  <button
                    onClick={() => handleToggleType(type)}
                    className="w-full flex items-center justify-between px-1 py-2 transition-all active:opacity-80"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[18px]">{TYPE_ICONS[type]}</span>
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{type}</span>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {stat.count} asset{stat.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(stat.value)}</div>
                        <div className="text-[10px] font-mono" style={{ color: stat.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {stat.pnl > 0 ? '+' : ''}{formatCurrency(stat.pnl)}
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 transition-transform duration-200"
                        style={{ color: 'var(--text-quaternary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded: asset list */}
                  {isExpanded && (
                    <div className="space-y-2 stagger-children">
                      {typeAssets.map(pos => (
                        <div
                          key={pos.asset.id}
                          className="glass flex items-center gap-3 p-4 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                          onClick={() => handleSelectAsset(pos.asset.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`type-dot ${TYPE_DOT_CLASS[pos.asset.type]}`} />
                              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.asset.symbol}</span>
                              <span className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{pos.asset.name}</span>
                            </div>
                            <div className="text-[11px] font-mono ml-[18px]" style={{ color: 'var(--text-secondary)' }}>
                              {formatUnit(pos.units)} units · {pos.asset.currency}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pos.marketValue)}</div>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono" style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                              </span>
                              <span className={pos.returnPercentage >= 0 ? 'badge-green' : 'badge-red'} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                {(pos.returnPercentage * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          {/* Quick trade shortcut */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenQuickTrade(pos.asset.id); }}
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: 'rgba(100,210,255,0.1)', border: '1px solid rgba(100,210,255,0.2)' }}
                            title="Quick trade"
                          >
                            <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {/* Add asset button inline */}
                      <button
                        onClick={() => handleOpenAddAsset(type)}
                        className="w-full glass p-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ borderStyle: 'dashed', borderColor: 'var(--border-glass)' }}
                      >
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

        {/* ===== ASSET DETAIL VIEW ===== */}
        {view === 'ASSET_DETAIL' && currentAssetPosition && (
          <div className="space-y-5 animate-slide-up">
            {/* Asset Header */}
            <div className="glass-elevated p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`type-dot ${TYPE_DOT_CLASS[currentAssetPosition.asset.type]}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {currentAssetPosition.asset.type} · {currentAssetPosition.asset.method} · {currentAssetPosition.asset.currency}
                  </span>
                </div>
                <button
                  onClick={() => { if (confirm(`Delete ${currentAssetPosition.asset.symbol} and all its transactions?`)) handleDeleteAsset(currentAssetPosition.asset.id); }}
                  className="text-[11px] font-semibold transition-opacity active:opacity-60"
                  style={{ color: 'var(--accent-red)' }}
                >
                  Delete
                </button>
              </div>
              <h2 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {currentAssetPosition.asset.symbol}
              </h2>
              <p className="text-[13px] mb-4" style={{ color: 'var(--text-tertiary)' }}>{currentAssetPosition.asset.name}</p>

              {/* Price Input */}
              <div className="glass p-3 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Price</span>
                <span className="text-[13px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{currentAssetPosition.asset.currency}</span>
                <input
                  type="number"
                  step="any"
                  value={currentAssetPosition.asset.currentMarketPrice || ''}
                  onChange={(e) => handleUpdatePrice(currentAssetPosition.asset.id, e.target.value)}
                  className="flex-1 bg-transparent text-right text-[18px] font-bold font-mono outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Segmented Control */}
            <div className="segmented-control w-full flex">
              {(['dashboard', 'ledger', 'inventory'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 ${activeTab === tab ? 'active' : ''}`}
                >
                  {tab === 'dashboard' ? 'Overview' : tab === 'ledger' ? 'Trades' : 'Audit'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {activeTab === 'dashboard' && (
                <div className="animate-fade-in">
                  <PortfolioDashboard positions={[currentAssetPosition]} />
                </div>
              )}

              {activeTab === 'ledger' && (
                <div className="space-y-5 animate-fade-in">
                  <LedgerTable
                    transactions={currentAssetTransactions}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="animate-fade-in">
                  <InventoryTable history={currentAssetInventory} currency={currentAssetPosition.asset.currency} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== FLOATING ACTION BUTTON ===== */}
      {!(isLoading && dataSource === 'none') && !showQuickTrade && !showAddAssetModal && assets.length > 0 && (
        <button
          onClick={() => handleOpenQuickTrade(selectedAssetId || undefined)}
          className="fixed z-40 flex items-center justify-center transition-all duration-200 active:scale-90"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(100,210,255,0.3), rgba(125,122,255,0.3))',
            border: '1px solid rgba(100,210,255,0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(100,210,255,0.2), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
          }}
          title="Quick Trade"
        >
          <svg className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
