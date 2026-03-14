import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType, InventoryState, PortfolioPosition, AssetType, Asset, AccountingMethod } from './types';
import { calculateInventoryState, runGoldenTest } from './engine';
import { API_URL, loadAll, readCache, clearCache, pingBackend, createAsset, createTransaction, updateAsset, updateTransaction, deleteAsset, deleteTransaction } from './services/storage';
import { TransactionForm } from './components/TransactionForm';
import { LedgerTable } from './components/LedgerTable';
import { InventoryTable } from './components/InventoryTable';
import { PortfolioDashboard, PortfolioSummary, PortfolioHoldings } from './components/PortfolioDashboard';
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

type ViewState = 'HOME' | 'TYPE_LIST' | 'ASSET_DETAIL';

function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'inventory'>('dashboard');

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'none' | 'cache' | 'live'>('none');
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
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

  const goldenTestResult = useMemo(() => runGoldenTest(), []);

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
  const handleSelectType = (type: AssetType) => {
    setSelectedType(type);
    setView('TYPE_LIST');
    setSelectedAssetId('');
    setEditingTransaction(null);
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setView('ASSET_DETAIL');
    setActiveTab('dashboard');
    setEditingTransaction(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setView('HOME');
    setSelectedType(null);
    setSelectedAssetId('');
    setEditingTransaction(null);
  };

  const handleBackToTypeList = () => {
    setView('TYPE_LIST');
    setSelectedAssetId('');
    setEditingTransaction(null);
  };

  const handleAddTransaction = async (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => {
    try {
      const newTx = { assetId, date, type, quantity, pricePerUnit: price, fees, totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2) };
      const created = await createTransaction(newTx);
      setTransactions(prev => [...prev, created]);
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

  const handleSaveNewAsset = async (symbol: string, name: string, currency: string, method: AccountingMethod) => {
    try {
      if (!selectedType) return;
      const newAsset = { symbol, name, type: selectedType, method, currency, currentMarketPrice: 0 };
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
    } catch (e) {
      console.error("Failed to delete asset", e);
      alert("Failed to delete asset");
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab('ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditingTransaction(null); };

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
  const typePositions = selectedType ? portfolioPositions.filter(p => p.asset.type === selectedType) : [];
  const currentAssetPosition = selectedAssetId ? portfolioPositions.find(p => p.asset.id === selectedAssetId) : null;
  const currentAssetTransactions = selectedAssetId ? transactions.filter(t => t.assetId === selectedAssetId) : [];
  const currentAssetInventory = selectedAssetId ? inventoryState[selectedAssetId] : [];

  // --- Total Portfolio ---
  const totalValue = portfolioPositions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = portfolioPositions.reduce((s, p) => s + p.investmentAmount, 0);
  const totalPnl = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? totalPnl / totalCost : 0;

  return (
    <div className="min-h-screen min-h-[100dvh] pb-6">
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
            {view !== 'HOME' && (
              <button
                onClick={view === 'ASSET_DETAIL' ? handleBackToTypeList : handleBackToHome}
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

      {/* Modal */}
      {showAddAssetModal && selectedType && (
        <AddAssetForm type={selectedType} onSave={handleSaveNewAsset} onCancel={() => setShowAddAssetModal(false)} />
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

        {/* ===== VIEW 1: HOME ===== */}
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

            {/* Asset Type Cards */}
            <div className="grid grid-cols-2 gap-3 stagger-children">
              {ASSET_TYPES.map(type => {
                const stat = statsByType[type];
                const isPositive = stat.pnl >= 0;
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="glass text-left p-4 transition-all duration-300 active:scale-[0.97]"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[18px]">{TYPE_ICONS[type]}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-glass-elevated)', color: 'var(--text-tertiary)' }}>
                        {stat.count}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>{type}</div>
                    <div className="text-[17px] font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(stat.value)}
                    </div>
                    <div className="text-[11px] font-mono mt-1.5" style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {isPositive ? '+' : ''}{formatCurrency(stat.pnl)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Holdings List */}
            <PortfolioHoldings positions={portfolioPositions} />
          </div>
        )}

        {/* ===== VIEW 2: TYPE LIST ===== */}
        {view === 'TYPE_LIST' && selectedType && (
          <div className="space-y-5 animate-slide-up">
            {/* Type Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[26px]">{TYPE_ICONS[selectedType]}</span>
                <div>
                  <h2 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{selectedType}</h2>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{typePositions.length} assets</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="glass-btn-primary glass-btn flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
            </div>

            {/* Type Summary */}
            <PortfolioSummary positions={typePositions} />

            {/* Asset Cards */}
            <div className="space-y-3 stagger-children">
              {typePositions.map(pos => (
                <button
                  key={pos.asset.id}
                  onClick={() => handleSelectAsset(pos.asset.id)}
                  className="glass w-full text-left p-4 transition-all duration-300 active:scale-[0.98] flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`type-dot ${TYPE_DOT_CLASS[pos.asset.type]}`} />
                      <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.asset.symbol}</span>
                      <span className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{pos.asset.name}</span>
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatUnit(pos.units)} units · {pos.asset.currency}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[15px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pos.marketValue)}</div>
                    <div className="text-[11px] font-mono" style={{ color: pos.returnPercentage >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {(pos.returnPercentage * 100).toFixed(2)}%
                    </div>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}

              {typePositions.length === 0 && (
                <button
                  onClick={() => setShowAddAssetModal(true)}
                  className="glass w-full p-8 flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
                  style={{ borderStyle: 'dashed' }}
                >
                  <svg className="w-6 h-6" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Start tracking {selectedType}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===== VIEW 3: ASSET DETAIL ===== */}
        {view === 'ASSET_DETAIL' && currentAssetPosition && (
          <div className="space-y-5 animate-slide-up">
            {/* Asset Header */}
            <div className="glass-elevated p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`type-dot ${TYPE_DOT_CLASS[currentAssetPosition.asset.type]}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {currentAssetPosition.asset.type} · {currentAssetPosition.asset.method} · {currentAssetPosition.asset.currency}
                </span>
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
                  <TransactionForm
                    assets={[currentAssetPosition.asset]}
                    onAddTransaction={handleAddTransaction}
                    onUpdateTransaction={handleUpdateTransaction}
                    initialData={editingTransaction}
                    onCancel={handleCancelEdit}
                  />
                  <LedgerTable
                    transactions={currentAssetTransactions}
                    onEdit={handleEditClick}
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
    </div>
  );
}

export default App;
