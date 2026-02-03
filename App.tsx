import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_ASSETS, INITIAL_TRANSACTIONS, DATA_VERSION } from './data';
import { Transaction, TransactionType, InventoryState, PortfolioPosition, AssetType, Asset, AccountingMethod } from './types';
import { calculateInventoryState, runGoldenTest } from './engine';
import { updateMarketPrices } from './services/marketData';
import { loadAssets, loadTransactions, saveAssets, saveTransactions, clearData, loadDataVersion, saveDataVersion } from './services/storage';
import { TransactionForm } from './components/TransactionForm';
import { LedgerTable } from './components/LedgerTable';
import { InventoryTable } from './components/InventoryTable';
import { PortfolioDashboard, PortfolioSummary, PortfolioHoldings } from './components/PortfolioDashboard';
import { AddAssetForm } from './components/AddAssetForm';
import { DataManagement } from './components/DataManagement';
import { round, formatCurrency, formatUnit } from './utils';

const ASSET_TYPES = [AssetType.GOLD, AssetType.ETF, AssetType.STOCK, AssetType.CRYPTO];

type ViewState = 'HOME' | 'TYPE_LIST' | 'ASSET_DETAIL';

function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // Tab state for ASSET_DETAIL view
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'inventory'>('dashboard');
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Initialization Logic for Data Persistence and Versioning
  useEffect(() => {
    const currentVersion = loadDataVersion();
    const storedAssets = loadAssets();
    const storedTransactions = loadTransactions();

    if (currentVersion < DATA_VERSION || !storedAssets || !storedTransactions) {
      console.log(`Migrating Data from v${currentVersion} to v${DATA_VERSION}`);
      // Force update to new default data
      setAssets(INITIAL_ASSETS);
      setTransactions(INITIAL_TRANSACTIONS);
      saveDataVersion(DATA_VERSION);
    } else {
      setAssets(storedAssets);
      setTransactions(storedTransactions);
    }
  }, []);

  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const goldenTestResult = useMemo(() => runGoldenTest(), []);

  // --- Persistence Effects ---
  useEffect(() => {
    if (assets.length > 0) saveAssets(assets);
  }, [assets]);

  useEffect(() => {
    if (transactions.length > 0) saveTransactions(transactions);
  }, [transactions]);

  // --- Live Price Update on Mount ---
  useEffect(() => {
    const fetchPrices = async () => {
      // Only fetch if we have assets loaded
      if (assets.length === 0) return;

      setIsLoadingPrices(true);
      const updated = await updateMarketPrices(assets);
      setAssets(updated);
      setIsLoadingPrices(false);
    };
    
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length === 0]); // Run when assets are first populated

  // --- Engine & Derivation ---
  // Note: calculateInventoryState depends on transactions, not asset prices.
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

      return {
        asset,
        units,
        avgCost,
        investmentAmount,
        marketPrice,
        marketValue,
        unrealizedPnl,
        returnPercentage
      };
    });
  }, [inventoryState, assets]);

  const statsByType = useMemo(() => {
    const stats: Record<string, { value: number, cost: number, pnl: number, count: number }> = {};
    ASSET_TYPES.forEach(t => {
      const typePositions = portfolioPositions.filter(p => p.asset.type === t);
      const value = typePositions.reduce((sum, p) => sum + p.marketValue, 0);
      const cost = typePositions.reduce((sum, p) => sum + p.investmentAmount, 0);
      stats[t] = {
        value,
        cost,
        pnl: value - cost,
        count: typePositions.length
      };
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

  const handleAddTransaction = (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      assetId,
      date,
      type,
      quantity,
      pricePerUnit: price,
      fees,
      totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2)
    };
    setTransactions(prev => [...prev, newTx]);
  };

  const handleUpdateTransaction = (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        return {
          ...tx,
          assetId,
          type,
          date,
          quantity,
          pricePerUnit: price,
          fees,
          totalAmount: round(quantity * price + (type === TransactionType.BUY ? fees : -fees), 2)
        };
      }
      return tx;
    }));
    setEditingTransaction(null);
  };

  const handleUpdatePrice = (assetId: string, newPrice: string) => {
    // Allow typing, handle empty as 0 but preserve intent if needed in a real form
    // Here we strictly update the numeric value for calculations
    const price = newPrice === '' ? 0 : parseFloat(newPrice);
    setAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, currentMarketPrice: price } : a
    ));
  };

  const handleSaveNewAsset = (symbol: string, name: string, currency: string, method: AccountingMethod) => {
    if (!selectedType) return;
    
    const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        symbol,
        name,
        type: selectedType,
        method,
        currency,
        currentMarketPrice: 0 // Default start at 0
    };
    
    setAssets(prev => [...prev, newAsset]);
    setShowAddAssetModal(false);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab('ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  // --- Data Management Handlers ---
  const handleDataImport = (newAssets: Asset[], newTransactions: Transaction[]) => {
    setAssets(newAssets);
    setTransactions(newTransactions);
    saveDataVersion(DATA_VERSION);
    setView('HOME');
  };

  const handleDataReset = () => {
    clearData();
    setAssets(INITIAL_ASSETS);
    setTransactions(INITIAL_TRANSACTIONS);
    saveDataVersion(DATA_VERSION);
    setView('HOME');
  };

  // --- Derived Data for Views ---
  
  const typePositions = selectedType 
    ? portfolioPositions.filter(p => p.asset.type === selectedType)
    : [];

  const currentAssetPosition = selectedAssetId
    ? portfolioPositions.find(p => p.asset.id === selectedAssetId)
    : null;

  const currentAssetTransactions = selectedAssetId
    ? transactions.filter(t => t.assetId === selectedAssetId)
    : [];

  const currentAssetInventory = selectedAssetId
    ? inventoryState[selectedAssetId]
    : [];

  return (
    <div className="min-h-screen pb-20 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[128px]"></div>
      </div>

      {/* Global Header */}
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleBackToHome}>
            <div className="h-8 w-8 bg-gradient-to-tr from-yellow-600 to-yellow-400 rounded-lg flex items-center justify-center font-bold text-black shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 transition-all">I</div>
            <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">Investment tracker</h1>
          </div>
          <div className="flex items-center space-x-6">
             {isLoadingPrices && (
               <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                 <span className="text-[10px] text-indigo-300 uppercase tracking-widest">Syncing Markets...</span>
               </div>
             )}
             {selectedType && (
                <div className="flex items-center space-x-2 text-[10px] font-bold tracking-widest uppercase hidden md:flex">
                  <span className={`px-2 py-1 rounded cursor-pointer hover:bg-white/10 ${!selectedAssetId ? 'text-indigo-300' : 'text-zinc-500'}`} onClick={handleBackToTypeList}>
                    {selectedType}
                  </span>
                  {currentAssetPosition && (
                    <>
                      <span className="text-zinc-700">/</span>
                      <span className="text-indigo-300">{currentAssetPosition.asset.symbol}</span>
                    </>
                  )}
                </div>
             )}
            <div className="text-[10px] tracking-widest uppercase text-zinc-600 font-mono hidden md:block">
              SYS_STATUS: <span className={goldenTestResult.passed ? 'text-emerald-500' : 'text-rose-500'}>
                {goldenTestResult.passed ? 'NOMINAL' : 'FAILURE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {!goldenTestResult.passed && (
        <div className="fixed top-16 w-full z-40 bg-rose-500/10 border-b border-rose-500/20 text-rose-200 text-center p-2 text-xs font-mono backdrop-blur-md">
           CRITICAL: ENGINE VALIDATION FAILED — {goldenTestResult.details}
        </div>
      )}

      {/* Modal Overlay */}
      {showAddAssetModal && selectedType && (
        <AddAssetForm 
          type={selectedType} 
          onSave={handleSaveNewAsset} 
          onCancel={() => setShowAddAssetModal(false)} 
        />
      )}

      <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 pt-28">
        
        {/* --- VIEW 1: HOME (Global Dashboard) --- */}
        {view === 'HOME' && (
          <div className="space-y-12 animate-fade-in">
            {/* 1. Header & Summary Cards */}
            <div>
              <div className="flex flex-col md:flex-row justify-between items-end pb-8 border-b border-white/5 mb-8">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Portfolio</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-zinc-500 text-sm tracking-wide">ASSET ALLOCATION & INVENTORY</p>
                    {!isLoadingPrices && (
                      <span className="text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                        Prices Updated
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Data Controls */}
                <div className="mt-4 md:mt-0">
                  <DataManagement 
                    currentAssets={assets} 
                    currentTransactions={transactions}
                    onImport={handleDataImport}
                    onReset={handleDataReset}
                  />
                </div>
              </div>
              
              {/* Summary Cards Top */}
              <PortfolioSummary positions={portfolioPositions} hideCostBasis={true} />
            </div>

            {/* 2. Asset Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ASSET_TYPES.map(type => {
                const stat = statsByType[type];
                const isPositive = stat.pnl >= 0;
                
                return (
                  <div 
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="group relative bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 cursor-pointer overflow-hidden transition-all duration-500 hover:bg-zinc-800/60 hover:border-white/10 hover:shadow-[0_0_40px_-15px_rgba(255,255,255,0.05)]"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover:text-white transition-colors">{type}</span>
                      <span className="bg-white/5 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full group-hover:bg-white/10">{stat.count} Items</span>
                    </div>
                    <div className="mb-1 text-xs text-zinc-500 font-medium">Market Value</div>
                    <div className="text-3xl font-bold text-white font-mono mb-6 tracking-tight">{formatCurrency(stat.value)}</div>
                    
                    <div className="flex justify-between items-end border-t border-white/5 pt-4 group-hover:border-white/10 transition-colors">
                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Unrealized P/L</div>
                        <div className={`text-sm font-mono font-medium mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(stat.pnl)}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 group-hover:border-indigo-500/50 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 3. Holdings Table at Bottom */}
            <div className="mt-8">
               <PortfolioHoldings positions={portfolioPositions} />
            </div>
          </div>
        )}

        {/* --- VIEW 2: TYPE LIST (Layer for selecting Asset) --- */}
        {view === 'TYPE_LIST' && selectedType && (
           <div className="space-y-12 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                     <button onClick={handleBackToHome} className="p-2 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     <div>
                       <h2 className="text-3xl font-bold text-white tracking-tight">{selectedType} Portfolio</h2>
                       <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Select an asset to manage</p>
                     </div>
                 </div>
                 <button 
                   onClick={() => setShowAddAssetModal(true)}
                   className="flex items-center px-4 py-2 bg-zinc-900 hover:bg-indigo-600 text-zinc-300 hover:text-white border border-white/10 hover:border-indigo-500 rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-indigo-900/20"
                 >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Asset
                 </button>
              </div>

              {/* Aggregate Dashboard for Type */}
              <PortfolioDashboard positions={typePositions} />

              {/* Asset Selection Grid */}
              <div>
                <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Available Assets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {typePositions.map(pos => (
                      <div 
                        key={pos.asset.id}
                        onClick={() => handleSelectAsset(pos.asset.id)}
                        className="group bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 cursor-pointer hover:bg-zinc-800 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                         
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <div className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{pos.asset.symbol}</div>
                               <div className="text-xs text-zinc-500">{pos.asset.name}</div>
                            </div>
                            <div className="text-right">
                               <span className="bg-black/20 text-zinc-400 text-[10px] font-mono px-2 py-1 rounded border border-white/5 block mb-1">
                                  {pos.asset.currency}
                               </span>
                               {pos.asset.type === AssetType.GOLD && (
                                 <span className="text-[9px] text-amber-500/80 uppercase tracking-wider font-bold">BOT Source</span>
                               )}
                            </div>
                         </div>

                         <div className="space-y-2 font-mono text-sm">
                            <div className="flex justify-between">
                               <span className="text-zinc-600 text-[10px] uppercase">Units</span>
                               <span className="text-zinc-300">{formatUnit(pos.units)}</span>
                            </div>
                            <div className="flex justify-between">
                               <span className="text-zinc-600 text-[10px] uppercase">Value</span>
                               <span className="text-white font-bold">{formatCurrency(pos.marketValue)}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                               <span className="text-zinc-600 text-[10px] uppercase">Return</span>
                               <span className={`${pos.returnPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {(pos.returnPercentage * 100).toFixed(2)}%
                               </span>
                            </div>
                         </div>
                         
                         <div className="mt-4 pt-4 border-t border-white/5 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                               Enter Console &rarr;
                            </span>
                         </div>
                      </div>
                   ))}
                   
                   {/* Empty State / Add Placeholder if none */}
                   {typePositions.length === 0 && (
                     <div 
                        onClick={() => setShowAddAssetModal(true)}
                        className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 text-zinc-600 cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/40 transition-all min-h-[200px]"
                     >
                        <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs font-bold uppercase tracking-wider">Start Tracking {selectedType}</span>
                     </div>
                   )}
                </div>
              </div>
           </div>
        )}


        {/* --- VIEW 3: ASSET DETAIL (Specific Asset Console) --- */}
        {view === 'ASSET_DETAIL' && currentAssetPosition && (
          <div className="space-y-8 animate-fade-in">
            {/* Back Nav */}
            <button 
              onClick={handleBackToTypeList}
              className="group flex items-center text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              <svg className="w-4 h-4 mr-2 text-zinc-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Return to {selectedType} List
            </button>

            {/* HEADER with Interactive Price Editor */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-white/5 pb-8 gap-6">
              <div>
                <h2 className="text-5xl font-bold text-white tracking-tight flex flex-wrap items-baseline gap-4">
                   {currentAssetPosition.asset.symbol} 
                   <span className="text-xl text-zinc-500 font-medium">{currentAssetPosition.asset.name}</span>
                </h2>
                <div className="flex items-center gap-3 mt-4">
                   <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-zinc-400">
                     {currentAssetPosition.asset.type}
                   </span>
                   <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-zinc-400">
                     {currentAssetPosition.asset.method}
                   </span>
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-mono text-zinc-400">
                     {currentAssetPosition.asset.currency}
                   </span>
                </div>
              </div>

              {/* Hero Price Editor */}
              <div className="relative group w-full xl:w-auto">
                 <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
                 <div className="relative bg-zinc-900 border border-white/10 rounded-xl p-4 flex flex-col items-end min-w-[280px]">
                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        Current Market Price
                     </label>
                     <div className="flex items-center justify-end w-full">
                        <span className="text-xl font-mono text-zinc-600 mr-2">{currentAssetPosition.asset.currency}</span>
                        <input 
                            type="number"
                            step="any"
                            value={currentAssetPosition.asset.currentMarketPrice || ''}
                            onChange={(e) => handleUpdatePrice(currentAssetPosition.asset.id, e.target.value)}
                            className="w-full bg-transparent text-4xl font-bold font-mono text-white text-right focus:outline-none placeholder-zinc-800"
                            placeholder="0.00"
                        />
                     </div>
                     {currentAssetPosition.asset.type === AssetType.GOLD && (
                        <div className="mt-2 text-[9px] text-amber-500/80 font-mono text-right">
                           BOT Source (Simulated)
                        </div>
                     )}
                 </div>
              </div>
            </div>

            {/* iOS Styled Segmented Control */}
            <div className="inline-flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'ledger' ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                 Transactions
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'inventory' ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Audit Log
              </button>
            </div>

            {/* Content Container */}
            <div className="min-h-[500px]">
              
              {activeTab === 'dashboard' && (
                <div className="animate-fade-in-up">
                  {/* Reuse PortfolioDashboard but pass only single position array */}
                  <PortfolioDashboard positions={[currentAssetPosition]} />
                </div>
              )}

              {(activeTab === 'ledger' || activeTab === 'inventory') && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
                  
                  {/* Context Sidebar - Simplified now that we are in single asset view */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
                        Asset Metadata
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Method</span>
                            <span className="text-sm font-mono text-white">{currentAssetPosition.asset.method}</span>
                         </div>
                         <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Currency</span>
                            <span className="text-sm font-mono text-white">{currentAssetPosition.asset.currency}</span>
                         </div>
                         {/* Price input removed from here - moved to header */}
                      </div>
                    </div>

                    {/* Transaction Form is always visible here for the active asset */}
                    {activeTab === 'ledger' && (
                       <div className="relative">
                         {editingTransaction && (
                           <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-lg shadow-indigo-500/40">
                             EDITING
                           </div>
                         )}
                         <TransactionForm 
                           assets={[currentAssetPosition.asset]} 
                           onAddTransaction={handleAddTransaction}
                           onUpdateTransaction={handleUpdateTransaction}
                           initialData={editingTransaction}
                           onCancel={handleCancelEdit}
                         />
                       </div>
                    )}
                  </div>

                  {/* Main Data Area */}
                  <div className="lg:col-span-8">
                    
                    {activeTab === 'ledger' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold text-white tracking-tight">Ledger</h3>
                          <div className="flex items-center gap-3">
                             {editingTransaction && (
                               <span className="flex h-2 w-2 relative">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                               </span>
                             )}
                             <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">ID: {currentAssetPosition.asset.id}</span>
                          </div>
                        </div>
                        <LedgerTable 
                          transactions={currentAssetTransactions} 
                          onEdit={handleEditClick}
                        />
                      </div>
                    )}

                    {activeTab === 'inventory' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                           <h3 className="text-xl font-bold text-white tracking-tight">Inventory State</h3>
                           <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-mono">VERIFIED IMMUTABLE</span>
                        </div>
                        <InventoryTable history={currentAssetInventory} currency={currentAssetPosition.asset.currency} />
                      </div>
                    )}
                  </div>
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