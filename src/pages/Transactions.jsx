import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah } from '../utils/formatters';

export default function Transactions() {
  const { wallets, categories, transactions, addTransaction, deleteTransaction } = useFinance();

  // State form input transaksi
  const [type, setType] = useState('expense'); // 'income' atau 'expense'
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default hari ini
  const [note, setNote] = useState('');

  // Handle submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !walletId || !category) {
      alert('Mohon isi nominal, dompet, dan kategori dengan lengkap!');
      return;
    }

    // Ambil daftar kategori berdasarkan jenis (income/expense)
    const activeCategories = categories[type];
    const selectedCategory = category || activeCategories[0];

    addTransaction({
      type,
      amount: parseFloat(amount),
      walletId,
      category: selectedCategory,
      date,
      note
    });

    // Reset form nominal & catatan
    setAmount('');
    setNote('');
    alert('Transaksi berhasil ditambahkan!');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Kelola Transaksi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Tambah Transaksi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tambah Transaksi Baru</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilihan Jenis (Masuk / Keluar) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategory(categories.expense[0]); }}
                className={`py-2 text-sm font-medium rounded-lg transition ${
                  type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategory(categories.income[0]); }}
                className={`py-2 text-sm font-medium rounded-lg transition ${
                  type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                }`}
              >
                Pemasukan
              </button>
            </div>

            {/* Input Nominal */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nominal (Rp)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 50000"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Pilih Dompet / Metode Pembayaran */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Dompet / Metode Pembayaran</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({formatRupiah(w.balance)})</option>
                ))}
              </select>
            </div>

            {/* Pilih Kategori */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                {categories[type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Catatan / Keterangan */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Catatan (Opsional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Beli makan siang di warteg"
                rows="2"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition shadow-sm"
            >
              Simpan Transaksi
            </button>
          </form>
        </div>

        {/* Daftar Riwayat Transaksi Ringkas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Riwayat Transaksi Terbaru</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Dompet</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-400">
                      Belum ada transaksi tercatat.
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 10).map(tx => {
                    const wallet = wallets.find(w => w.id === tx.walletId);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="p-3 text-gray-600 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-medium text-gray-800">{tx.category}</td>
                        <td className="p-3 text-gray-600">{wallet ? wallet.name : '-'}</td>
                        <td className={`p-3 text-right font-semibold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm('Yakin ingin menghapus transaksi ini? Saldo akan dikembalikan.')) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 text-xs font-medium px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}