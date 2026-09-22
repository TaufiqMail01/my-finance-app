import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah } from '../utils/formatters';
import { exportTransactionsToExcel } from '../services/excelService';

export default function Mutation() {
  const { transactions, wallets } = useFinance();
  
  const [filterType, setFilterType] = useState('all');
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonthStr = today.toISOString().slice(0, 7);
  const currentYearStr = today.getFullYear().toString();

  const isWithinCurrentWeek = (dateStr) => {
    const txDate = new Date(dateStr);
    const diffTime = today - txDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (!tx.date) return true;

    if (period === 'daily') {
      return tx.date === todayStr;
    } else if (period === 'weekly') {
      return isWithinCurrentWeek(tx.date);
    } else if (period === 'monthly') {
      return tx.date.startsWith(currentMonthStr);
    } else if (period === 'yearly') {
      return tx.date.startsWith(currentYearStr);
    } else if (period === 'custom') {
      if (!startDate || !endDate) return true;
      return tx.date >= startDate && tx.date <= endDate;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mutasi & Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Filter transaksi berdasarkan harian, mingguan, bulanan, hingga tanggal kustom.</p>
        </div>
        
        <button
          onClick={() => exportTransactionsToExcel(filteredTransactions, wallets)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm text-sm whitespace-nowrap"
        >
          <span>📥 Download Excel ({filteredTransactions.length} Data)</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-400 uppercase mr-2">Jenis:</span>
          {['all', 'income', 'expense'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition capitalize ${
                filterType === type ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase mr-2">Periode:</span>
          {[
            { id: 'all', label: 'Semua Waktu' },
            { id: 'daily', label: 'Hari Ini' },
            { id: 'weekly', label: 'Mingguan' },
            { id: 'monthly', label: 'Bulanan' },
            { id: 'yearly', label: 'Tahunan' },
            { id: 'custom', label: 'Pilih Tanggal 📅' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                period === item.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Dompet</th>
                <th className="p-4">Catatan</th>
                <th className="p-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-gray-400">
                    Tidak ada data transaksi pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const wallet = wallets.find(w => w.id === tx.walletId);
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 text-gray-600 whitespace-nowrap">{tx.date}</td>
                      <td className="p-4 font-medium text-gray-800">{tx.category}</td>
                      <td className="p-4 text-gray-600">{wallet ? wallet.name : '-'}</td>
                      <td className="p-4 text-gray-500">{tx.note || '-'}</td>
                      <td className={`p-4 text-right font-semibold ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
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
  );
}