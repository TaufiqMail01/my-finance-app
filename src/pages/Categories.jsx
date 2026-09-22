import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function Categories() {
  const { categories } = useFinance();
  const [catList, setCatList] = useState(categories);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('expense');

  // Create Kategori Baru
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (catList[categoryType].includes(newCategoryName)) {
      alert('Kategori sudah ada!');
      return;
    }

    const updated = {
      ...catList,
      [categoryType]: [...catList[categoryType], newCategoryName]
    };

    setCatList(updated);
    localStorage.setItem('finance_categories', JSON.stringify(updated));
    setNewCategoryName('');
  };

  // Delete Kategori
  const handleDeleteCategory = (type, categoryName) => {
    if (window.confirm(`Hapus kategori "${categoryName}"?`)) {
      const updated = {
        ...catList,
        [type]: catList[type].filter(item => item !== categoryName)
      };
      setCatList(updated);
      localStorage.setItem('finance_categories', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Kelola Kategori (CRUD)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Create */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tambah Kategori</h2>
          
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Jenis</label>
              <select
                value={categoryType}
                onChange={(e) => setCategoryType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nama Kategori</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Contoh: Langganan"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition text-sm"
            >
              Simpan Kategori
            </button>
          </form>
        </div>

        {/* Read & Delete List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-800">Daftar Kategori Aktif</h2>

          <div>
            <h3 className="text-sm font-semibold text-rose-600 uppercase mb-3">Pengeluaran</h3>
            <div className="flex flex-wrap gap-2">
              {catList.expense.map((cat) => (
                <span key={cat} className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2">
                  {cat}
                  <button onClick={() => handleDeleteCategory('expense', cat)} className="text-rose-400 hover:text-rose-700 font-bold text-xs">×</button>
                </span>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h3 className="text-sm font-semibold text-emerald-600 uppercase mb-3">Pemasukan</h3>
            <div className="flex flex-wrap gap-2">
              {catList.income.map((cat) => (
                <span key={cat} className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
                  {cat}
                  <button onClick={() => handleDeleteCategory('income', cat)} className="text-emerald-400 hover:text-emerald-700 font-bold text-xs">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}