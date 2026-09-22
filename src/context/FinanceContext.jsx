import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ambil data awal dari Supabase saat aplikasi dimuat
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1. Ambil data Wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*');
      if (walletsError) throw walletsError;

      // 2. Ambil data Categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');
      if (categoriesError) throw categoriesError;

      // Pisahkan kategori berdasarkan tipenya ('income' atau 'expense')
      const incomeCats = categoriesData.filter(c => c.type === 'income').map(c => c.name);
      const expenseCats = categoriesData.filter(c => c.type === 'expense').map(c => c.name);

      // 3. Ambil data Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (txError) throw txError;

      setWallets(walletsData || []);
      setCategories({ income: incomeCats, expense: expenseCats });
      setTransactions(txData || []);
    } catch (error) {
      console.error('Gagal memuat data dari Supabase:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tambah Transaksi & Update Saldo Rekening di Supabase
  const addTransaction = async (newTx) => {
    const amount = parseFloat(newTx.amount);
    const txId = 'tx_' + Date.now();

    // Cari rekening yang terlibat
    const targetWallet = wallets.find(w => w.id === newTx.walletId);
    if (!targetWallet) return;

    const updatedBalance = newTx.type === 'income' 
      ? targetWallet.balance + amount 
      : targetWallet.balance - amount;

    try {
      // 1. Update saldo rekening di database
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: updatedBalance })
        .eq('id', newTx.walletId);

      if (walletError) throw walletError;

      // 2. Simpan transaksi baru ke database
      const transactionWithId = {
        ...newTx,
        id: txId,
        amount: amount
      };

      const { error: txError } = await supabase
        .from('transactions')
        .insert([transactionWithId]);

      if (txError) throw txError;

      // Update state lokal
      setWallets(prevWallets => 
        prevWallets.map(wallet => 
          wallet.id === newTx.walletId ? { ...wallet, balance: updatedBalance } : wallet
        )
      );
      setTransactions(prev => [transactionWithId, ...prev]);
    } catch (error) {
      console.error('Gagal menyimpan transaksi:', error.message);
      alert('Terjadi kesalahan saat menyimpan transaksi ke database.');
    }
  };

  // Hapus Transaksi & Kembalikan Saldo Rekening di Supabase
  const deleteTransaction = async (id) => {
    const txToDelete = transactions.find(tx => tx.id === id);
    if (!txToDelete) return;

    const targetWallet = wallets.find(w => w.id === txToDelete.walletId);
    if (!targetWallet) return;

    const revertedBalance = txToDelete.type === 'income'
      ? targetWallet.balance - txToDelete.amount
      : targetWallet.balance + txToDelete.amount;

    try {
      // 1. Kembalikan saldo rekening di database
      if (targetWallet) {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: revertedBalance })
          .eq('id', txToDelete.walletId);

        if (walletError) throw walletError;
      }

      // 2. Hapus transaksi dari database
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (txError) throw txError;

      // Update state lokal
      setWallets(prevWallets =>
        prevWallets.map(wallet =>
          wallet.id === txToDelete.walletId ? { ...wallet, balance: revertedBalance } : wallet
        )
      );
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (error) {
      console.error('Gagal menghapus transaksi:', error.message);
      alert('Terjadi kesalahan saat menghapus transaksi.');
    }
  };

  return (
    <FinanceContext.Provider value={{
      wallets,
      setWallets,
      categories,
      setCategories,
      transactions,
      addTransaction,
      deleteTransaction,
      loading
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);