import React from 'react';
import { PortfolioPosition } from '../types';
import { formatCurrency, formatUnit } from '../utils';

interface PortfolioDashboardProps {
  positions: PortfolioPosition[];
  hideCostBasis?: boolean;
}

export const PortfolioSummary: React.FC<PortfolioDashboardProps> = ({ positions, hideCostBasis = false }) => {
  const totalValue = positions.reduce((acc, p) => acc + p.marketValue, 0);
  const totalCost = positions.reduce((acc, p) => acc + p.investmentAmount, 0);
  const totalUnrealized = totalValue - totalCost;

  return (
    <div className={`grid grid-cols-1 ${hideCostBasis ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
      <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl group hover:bg-zinc-900/60 transition-all duration-500">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
        <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">Total Asset Value</div>
        <div className="text-3xl font-bold text-white font-mono tracking-tight">
          {formatCurrency(totalValue)}
        </div>
      </div>

      {!hideCostBasis && (
        <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl group hover:bg-zinc-900/60 transition-all duration-500">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
          <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">Cost Basis</div>
          <div className="text-3xl font-bold text-zinc-300 font-mono tracking-tight">
            {formatCurrency(totalCost)}
          </div>
        </div>
      )}

      <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl group hover:bg-zinc-900/60 transition-all duration-500">
        <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full blur-2xl transition-all duration-500 ${totalUnrealized >= 0 ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'}`}></div>
        <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-2">Unrealized P/L</div>
        <div className={`text-3xl font-bold font-mono tracking-tight ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {totalUnrealized > 0 ? '+' : ''}{formatCurrency(totalUnrealized)}
        </div>
      </div>
    </div>
  );
};

export const PortfolioHoldings: React.FC<{ positions: PortfolioPosition[] }> = ({ positions }) => {
  return (
    <div className="bg-zinc-900/30 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
      <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <h3 className="text-xl font-semibold text-white tracking-tight">Current Holdings</h3>
        <div className="text-xs text-zinc-500 font-mono">LIVE UPDATE</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            <tr>
              <th className="px-8 py-5 bg-black/20">Asset</th>
              <th className="px-8 py-5 text-right bg-black/20">Units</th>
              <th className="px-8 py-5 text-right bg-black/20">Avg Cost</th>
              <th className="px-8 py-5 text-right bg-black/20">Price</th>
              <th className="px-8 py-5 text-right bg-black/20">Value</th>
              <th className="px-8 py-5 text-right bg-black/20">P/L</th>
              <th className="px-8 py-5 text-right bg-black/20">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((pos) => (
              <tr key={pos.asset.id} className="hover:bg-white/[0.03] transition-colors group">
                <td className="px-8 py-5">
                  <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{pos.asset.symbol}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{pos.asset.name}</div>
                </td>
                <td className="px-8 py-5 text-right font-mono text-zinc-300">{formatUnit(pos.units)}</td>
                <td className="px-8 py-5 text-right font-mono text-zinc-500">{formatCurrency(pos.avgCost)}</td>
                <td className="px-8 py-5 text-right font-mono text-indigo-400">{formatCurrency(pos.marketPrice)}</td>
                <td className="px-8 py-5 text-right font-mono font-bold text-white shadow-glow">{formatCurrency(pos.marketValue)}</td>
                <td className={`px-8 py-5 text-right font-mono font-medium ${pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                </td>
                <td className="px-8 py-5 text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${pos.returnPercentage >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {(pos.returnPercentage * 100).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = (props) => {
  return (
    <div className="space-y-8">
      <PortfolioSummary {...props} />
      <PortfolioHoldings positions={props.positions} />
    </div>
  );
};