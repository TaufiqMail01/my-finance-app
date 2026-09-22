import React, { createContext, useContext, useState, useEffect } from 'react';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  // Kosongkan data dompet dummy (dimulai dengan array kosong)
  const [wallets, setWallets] = useState(() => {
    const saved = localStorage.getItem('finance_wallets');
    return saved ? JSON.parse(saved) : [];
  });

  // Kosongkan kategori custom dummy (dimulai dengan array kosong)
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('finance_categories');
    return saved ? JSON.parse(saved) : {
      income: [],
      expense: []
    };
  });

  // Kosongkan riwayat transaksi dummy
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('finance_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('finance_wallets', JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem('finance_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('finance_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (newTx) => {
    const amount = parseFloat(newTx.amount);

    setWallets(prevWallets => 
      prevWallets.map(wallet => {
        if (wallet.id === newTx.walletId) {
          const updatedBalance = newTx.type === 'income' 
            ? wallet.balance + amount 
            : wallet.balance - amount;
          return { ...wallet, balance: updatedBalance };
        }
        return wallet;
      })
    );

    const transactionWithId = {
      ...newTx,
      id: Date.now().toString(),
      amount: amount
    };

    setTransactions(prev => [transactionWithId, ...prev]);
  };

  const deleteTransaction = (id) => {
    const txToDelete = transactions.find(tx => tx.id === id);
    if (!txToDelete) return;

    setWallets(prevWallets =>
      prevWallets.map(wallet => {
        if (wallet.id === txToDelete.walletId) {
          const revertedBalance = txToDelete.type === 'income'
            ? wallet.balance - txToDelete.amount
            : wallet.balance + txToDelete.amount;
          return { ...wallet, balance: revertedBalance };
        }
        return wallet;
      })
    );

    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  return (
    <FinanceContext.Provider value={{
      wallets,
      setWallets,
      categories,
      transactions,
      addTransaction,
      deleteTransaction
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);