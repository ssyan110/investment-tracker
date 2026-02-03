import express, { Request, Response } from 'express';
import * as db from './db.js';

const router = express.Router();

// ===== ASSETS =====

router.get('/assets', async (req: Request, res: Response) => {
  try {
    const assets = await db.getAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/assets', async (req: Request, res: Response) => {
  try {
    const asset = await db.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/assets/:id', async (req: Request, res: Response) => {
  try {
    const asset = await db.updateAsset(req.params.id, req.body);
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/assets/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteAsset(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ===== TRANSACTIONS =====

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await db.getTransactions();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/assets/:assetId/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await db.getTransactionsByAsset(req.params.assetId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const transaction = await db.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.put('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await db.updateTransaction(req.params.id, req.body);
    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/transactions/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteTransaction(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
