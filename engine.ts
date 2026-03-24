import { Transaction, InventoryState, TransactionType, Asset } from './types';
import { round } from './utils';

/**
 * 4. Calculation Engine
 * Pure function. Stateless. Deterministic.
 */
export const calculateInventoryState = (
  transactions: Transaction[],
  asset: Asset
): InventoryState[] => {
  // Sort transactions by date, then by ID ensures strict ordering
  const sortedTx = [...transactions]
    .filter((t) => t.assetId === asset.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const history: InventoryState[] = [];

  let currentUnits = 0;
  let currentInventoryValue = 0; // Total Book Value
  let currentAvgCost = 0;

  for (const tx of sortedTx) {
    const unitsBefore = currentUnits;
    const valueBefore = currentInventoryValue;
    const avgCostBefore = currentAvgCost;

    let realizedPnl = 0;

    if (tx.type === TransactionType.BUY) {
      // 2.1 Gold / Average Cost Model - BUY
      // new_avg_cost = (previous_inventory_value + buy_amount) / (previous_units + buy_units)
      
      const buyAmount = tx.totalAmount; // Amount spent (Cost Basis increase)
      
      currentInventoryValue = round(currentInventoryValue + buyAmount, 2); // Accumulate Cost
      currentUnits = round(currentUnits + tx.quantity, 4);
      
      // Avg Cost Recalculation
      if (currentUnits > 0) {
        currentAvgCost = round(currentInventoryValue / currentUnits, 4); // Keep high precision for internal avg
      } else {
        currentAvgCost = 0;
      }

    } else if (tx.type === TransactionType.SELL) {
      // 2.1 Gold / Average Cost Model - SELL
      // avg_cost = unchanged
      // inventory_units -= sell_units
      // inventory_value = avg_cost * inventory_units
      
      // Validation: Cannot sell more than owned
      if (tx.quantity > currentUnits) {
        console.error(`Error: Negative inventory detected for TX ${tx.id}`);
        // In a real app, this might throw or flag the transaction.
        // We proceed to show the negative state for debugging.
      }

      // Realized PnL = (Sell Price - Avg Cost) * Qty
      // Note: We use the *Net* price received (Total Amount / Qty) effectively, 
      // but strictly speaking: PnL = Proceeds - Cost Basis of sold units.
      // Cost Basis of Sold Units = AvgCost * Qty
      const costBasisOfSoldUnits = round(currentAvgCost * tx.quantity, 2);
      const proceeds = tx.totalAmount; // Net proceeds after fees
      
      realizedPnl = round(proceeds - costBasisOfSoldUnits, 2);

      currentUnits = round(currentUnits - tx.quantity, 4);
      
      // Update Inventory Value (Remaining Cost Basis)
      // Rule: inventory_value = avg_cost * inventory_units
      // This ensures strict adherence to the formula.
      currentInventoryValue = round(currentAvgCost * currentUnits, 2);
    }

    history.push({
      transactionId: tx.id,
      date: tx.date,
      unitsBefore,
      unitsAfter: currentUnits,
      avgCostBefore,
      avgCostAfter: currentAvgCost,
      inventoryValueBefore: valueBefore,
      inventoryValueAfter: currentInventoryValue,
      realizedPnl,
    });
  }

  return history;
};
