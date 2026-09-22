import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah } from '../utils/formatters';

export default function Wallets() {
  const { wallets } = useFinance();
  const [walletList, setWalletList] = useState(wallets);

  const [walletName, setWalletName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [editingId, setEditingId] = useState(null);

  const handleSaveWallet = (e) => {
    e.preventDefault();
    if (!walletName.trim()) return;

    let updatedWallets;
    if (editingId) {
      updatedWallets = walletList.map(w => 
        w.id === editingId ? { ...w, name: walletName, balance: parseFloat(initialBalance) || 0 } : w
      );
      setEditingId(null);
    } else {
      const newWallet = {
        id: 'w_' + Date.now(),
        name: walletName,
        balance: parseFloat(initialBalance) || 0
      };
      updatedWallets = [...walletList, newWallet];
    }

    setWalletList(updatedWallets);
    localStorage.setItem('finance_wallets', JSON.stringify(updatedWallets));
    setWalletName('');
    setInitialBalance('');
    window.location.reload();
  };

  const handleEdit = (wallet) => {
    setEditingId(wallet.id);
    setWalletName(wallet.name);
    setInitialBalance(wallet.balance);
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus dompet ini?')) {
      const updatedWallets = walletList.filter(w => w.id !== id);
      setWalletList(updatedWallets);
      localStorage.setItem('finance_wallets', JSON.stringify(updatedWallets));
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Kelola Dompet & Akun</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Edit Dompet' : 'Tambah Dompet / Modal'}
          </h2>
          
          <form onSubmit={handleSaveWallet} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Dompet / Bank</label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Contoh: BCA / Dompet Cash"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Saldo / Modal (Rp)</label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Contoh: 1000000"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition text-sm shadow-sm"
              >
                {editingId ? 'Update' : 'Simpan'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setWalletName(''); setInitialBalance(''); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-xl text-sm"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Daftar Akun & Status Saldo</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {walletList.map(wallet => {
              const isMinus = wallet.balance < 0;

              return (
                <div 
                  key={wallet.id} 
                  className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                    isMinus 
                      ? 'bg-rose-50/60 border-rose-200 shadow-sm' 
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold uppercase text-gray-400">Akun Dompet</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(wallet)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                        <button onClick={() => handleDelete(wallet.id)} className="text-xs text-rose-600 hover:underline font-medium">Hapus</button>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">{wallet.name}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">Sisa Saldo:</span>
                    <span className={`text-lg font-extrabold ${isMinus ? 'text-rose-600' : 'text-blue-600'}`}>
                      {formatRupiah(wallet.balance)}
                      {isMinus && <span className="block text-[10px] text-rose-500 font-bold">⚠️ Saldo Minus (Defisit)</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}