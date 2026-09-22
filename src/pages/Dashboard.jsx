import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah } from '../utils/formatters';
import { exportTransactionsToExcel } from '../services/excelService';
import { supabase } from '../services/supabaseClient';

export default function Dashboard() {
  const {
    wallets,
    setWallets,
    categories,
    setCategories,
    transactions,
    addTransaction,
    deleteTransaction,
  } = useFinance();

  // ===== Helper untuk format input angka menjadi ribuan (misal: 100.000) =====
  const formatInputRupiah = (value) => {
    if (!value && value !== 0) return '';
    const numberString = value.toString().replace(/[^,\d]/g, '');
    const split = numberString.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      let separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    return split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
  };

  // ===== Derived data =====
  const totalBalance = useMemo(
    () => wallets.reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = useMemo(
    () => transactions.filter((tx) => tx.date?.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const totalIncome = useMemo(
    () =>
      monthlyTransactions
        .filter((tx) => tx.type === 'income')
        .reduce((acc, tx) => acc + tx.amount, 0),
    [monthlyTransactions]
  );

  const totalExpense = useMemo(
    () =>
      monthlyTransactions
        .filter((tx) => tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0),
    [monthlyTransactions]
  );

  const netCashflow = totalIncome - totalExpense;
  const isSurplus = netCashflow >= 0;

  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomePercent = Math.min(Math.round((totalIncome / maxVal) * 100), 100);
  const expensePercent = Math.min(Math.round((totalExpense / maxVal) * 100), 100);

  // ===== State =====
  const [visibleMenus, setVisibleMenus] = useState(() => {
    try {
      const saved = localStorage.getItem('finance_visible_menus');
      return saved
        ? JSON.parse(saved)
        : {
            income: true,
            expense: true,
            wallet: true,
            category: true,
            transfer: true,
            mutasi: true,
            stats: true,
            download: true,
          };
    } catch {
      return {
        income: true,
        expense: true,
        wallet: true,
        category: true,
        transfer: true,
        mutasi: true,
        stats: true,
        download: true,
      };
    }
  });

  // PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [targetData, setTargetData] = useState(null);

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Wallet modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [editingWalletId, setEditingWalletId] = useState(null);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catType, setCatType] = useState('expense');
  const [catName, setCatName] = useState('');

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Mutasi modal
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [selectedWalletForMutasi, setSelectedWalletForMutasi] = useState(
    wallets[0]?.id || ''
  );
  const [mutasiStartDate, setMutasiStartDate] = useState('');
  const [mutasiEndDate, setMutasiEndDate] = useState('');

  // Other modals
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAllWalletsModal, setShowAllWalletsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Filter & search
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ===== Handlers =====
  const handleOpenTx = (type) => {
    setTxType(type);
    setShowTxModal(true);
    if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id);
    const defaultCat =
      type === 'income' ? categories.income[0] : categories.expense[0];
    setCategory(defaultCat || '');
  };

  const handleSaveTx = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !walletId) {
      alert('Masukkan nominal yang valid (> 0) dan pilih rekening!');
      return;
    }

    if (txType === 'expense') {
      const selectedWallet = wallets.find((w) => w.id === walletId);
      if (selectedWallet && selectedWallet.balance < parsedAmount) {
        alert(
          `❌ Transaksi Ditolak!\nSaldo rekening ${selectedWallet.name} (${formatRupiah(
            selectedWallet.balance
          )}) tidak mencukupi untuk pengeluaran sebesar ${formatRupiah(parsedAmount)}.`
        );
        return;
      }
    }

    addTransaction({
      type: txType,
      amount: parsedAmount,
      walletId,
      category: category || 'Lainnya',
      note: note.trim(),
      date,
    });

    setAmount('');
    setNote('');
    setShowTxModal(false);
  };

  // PIN system
  const requestPinVerification = (actionType, data) => {
    setPendingAction(actionType);
    setTargetData(data);
    setPinInput('');
    setShowPinModal(true);
  };

  const verifyPinAndExecute = (e) => {
    e.preventDefault();
    if (pinInput !== '123456') {
      alert('❌ PIN Keamanan Salah! Akses ditolak.');
      return;
    }

    setShowPinModal(false);

    if (pendingAction === 'edit_wallet') {
      const w = targetData;
      setEditingWalletId(w.id);
      setWalletName(w.name);
      setWalletBalance(String(w.balance));
      setShowWalletModal(true);
      setShowAllWalletsModal(false);
    } else if (pendingAction === 'delete_wallet') {
      const id = targetData;
      const updated = wallets.filter((w) => w.id !== id);
      setWallets(updated);
      alert('🔒 Rekening berhasil dihapus dengan verifikasi PIN.');
    } else if (pendingAction === 'delete_tx') {
      deleteTransaction(targetData);
      alert('🔒 Transaksi berhasil dihapus dengan verifikasi PIN.');
    }

    setPendingAction(null);
    setTargetData(null);
  };

  const handleSaveWallet = (e) => {
    e.preventDefault();
    if (!walletName.trim()) {
      alert('Nama rekening tidak boleh kosong!');
      return;
    }

    const parsedBalance = parseFloat(walletBalance);
    if (isNaN(parsedBalance)) {
      alert('Format saldo tidak valid!');
      return;
    }

    let updatedWallets;
    if (editingWalletId) {
      updatedWallets = wallets.map((w) =>
        w.id === editingWalletId
          ? { ...w, name: walletName.trim(), balance: parsedBalance }
          : w
      );
      setEditingWalletId(null);
    } else {
      const newWallet = {
        id: 'w_' + Date.now(),
        name: walletName.trim(),
        balance: parsedBalance || 0,
      };
      updatedWallets = [...wallets, newWallet];
    }

    setWallets(updatedWallets);
    setWalletName('');
    setWalletBalance('');
    setShowWalletModal(false);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const trimmedCatName = catName.trim();
    if (categories[catType].includes(trimmedCatName)) {
      alert('Kategori tersebut sudah ada!');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ type: catType, name: trimmedCatName }]);

      if (error) throw error;

      const updated = {
        ...categories,
        [catType]: [...categories[catType], trimmedCatName],
      };
      setCategories(updated);
      setCatName('');
      setShowCategoryModal(false);
      alert('✅ Kategori baru berhasil ditambahkan!');
    } catch (error) {
      console.error('Gagal menyimpan kategori:', error.message);
      alert('Gagal menyimpan kategori ke database.');
    }
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    const nominal = parseFloat(transferAmount);
    if (
      !nominal ||
      nominal <= 0 ||
      !fromWalletId ||
      !toWalletId ||
      fromWalletId === toWalletId
    ) {
      alert(
        'Nominal transfer harus > 0 dan rekening sumber/tujuan tidak boleh sama!'
      );
      return;
    }

    const fromW = wallets.find((w) => w.id === fromWalletId);
    if (!fromW) return;

    if (fromW.balance < nominal) {
      alert(
        `❌ Transfer Ditolak!\nSaldo rekening sumber ${fromW.name} (${formatRupiah(
          fromW.balance
        )}) tidak mencukupi untuk ditransfer sebesar ${formatRupiah(nominal)}.`
      );
      return;
    }

    const updatedWallets = wallets.map((w) => {
      if (w.id === fromWalletId) return { ...w, balance: w.balance - nominal };
      if (w.id === toWalletId) return { ...w, balance: w.balance + nominal };
      return w;
    });

    setWallets(updatedWallets);

    const toW = wallets.find((w) => w.id === toWalletId);
    addTransaction({
      type: 'expense',
      amount: nominal,
      walletId: fromWalletId,
      category: 'Transfer m-Banking',
      note: `Transfer ke ${toW ? toW.name : 'Rekening Lain'}`,
      date: new Date().toISOString().slice(0, 10),
    });

    setTransferAmount('');
    setShowTransferModal(false);
    alert('✅ Transfer antar rekening berhasil dicatat!');
  };

  const toggleMenuVisibility = (menuKey) => {
    const updated = { ...visibleMenus, [menuKey]: !visibleMenus[menuKey] };
    setVisibleMenus(updated);
    localStorage.setItem('finance_visible_menus', JSON.stringify(updated));
  };

  // ===== Filtered lists =====
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (
        searchQuery.trim() &&
        !tx.category.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(tx.note || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  const mutasiFilteredList = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedWalletForMutasi && tx.walletId !== selectedWalletForMutasi)
        return false;
      if (mutasiStartDate && tx.date < mutasiStartDate) return false;
      if (mutasiEndDate && tx.date > mutasiEndDate) return false;
      return true;
    });
  }, [transactions, selectedWalletForMutasi, mutasiStartDate, mutasiEndDate]);

  // ===== Card themes =====
  const cardGradients = [
    'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-500',
    'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-500',
    'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-500',
    'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500',
    'bg-gradient-to-br from-rose-600 via-pink-600 to-rose-500',
  ];

  const menuItems = [
    {
      key: 'income',
      label: 'Pemasukan',
      sub: 'Uang masuk',
      icon: '➕',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      onClick: () => handleOpenTx('income'),
    },
    {
      key: 'expense',
      label: 'Pengeluaran',
      sub: 'Uang keluar',
      icon: '➖',
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      onClick: () => handleOpenTx('expense'),
    },
    {
      key: 'wallet',
      label: '+ Rekening',
      sub: 'Akun baru',
      icon: '💳',
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      onClick: () => {
        setEditingWalletId(null);
        setWalletName('');
        setWalletBalance('');
        setShowWalletModal(true);
      },
    },
    {
      key: 'category',
      label: '+ Kategori',
      sub: 'Label baru',
      icon: '🏷️',
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      onClick: () => setShowCategoryModal(true),
    },
    {
      key: 'transfer',
      label: 'Transfer',
      sub: 'Antar akun',
      icon: '🔄',
      color: 'bg-sky-50 text-sky-600 border-sky-100',
      onClick: () => {
        if (wallets.length < 2) {
          alert('Minimal harus punya 2 rekening untuk transfer!');
          return;
        }
        setFromWalletId(wallets[0].id);
        setToWalletId(wallets[1]?.id || '');
        setShowTransferModal(true);
      },
    },
    {
      key: 'mutasi',
      label: 'Mutasi',
      sub: 'Rekening koran',
      icon: '📜',
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      onClick: () => {
        setSelectedWalletForMutasi(wallets[0]?.id || '');
        setShowMutasiModal(true);
      },
    },
    {
      key: 'stats',
      label: 'Statistik',
      sub: 'Analisis kas',
      icon: '📊',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      onClick: () => setShowStatsModal(true),
    },
    {
      key: 'download',
      label: 'Download',
      sub: 'File Excel',
      icon: '📥',
      color: 'bg-teal-50 text-teal-600 border-teal-100',
      onClick: () => exportTransactionsToExcel(transactions, wallets),
    },
  ];

  return (
    <div className="space-y-6 pb-20 font-sans text-gray-800">
      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-7 pb-9 rounded-b-[2.5rem] text-white shadow-xl">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Balance + Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-[11px] text-blue-200 font-medium uppercase tracking-wider">
                Total Saldo Rekening Gabungan
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
                {formatRupiah(totalBalance)}
              </h1>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setShowAllWalletsModal(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/20 transition shadow-sm"
              >
                {wallets.length} Rekening
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/20 transition shadow-sm flex items-center gap-1.5"
                title="Atur menu halaman depan"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="bg-white rounded-2xl p-4 shadow-xl text-gray-800 grid grid-cols-4 gap-y-5 gap-x-2 text-center">
            {menuItems.map(
              (item) =>
                visibleMenus[item.key] && (
                  <button
                    key={item.key}
                    onClick={item.onClick}
                    className="flex flex-col items-center group"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold group-hover:scale-105 transition shadow-sm border ${item.color}`}
                    >
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 mt-1.5">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-gray-400">{item.sub}</span>
                  </button>
                )
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="space-y-6 px-1 sm:px-2 max-w-xl mx-auto">
        {/* Cashflow Summary */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Grafik Arus Kas Bulan Ini
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Perbandingan total uang masuk dan keluar.
              </p>
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full shrink-0">
              {new Date().toLocaleString('id-ID', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Net Cashflow Badge */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isSurplus
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}
          >
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                Selisih Bersih (Net Cashflow)
              </span>
              <p
                className={`text-xl font-extrabold mt-0.5 ${
                  isSurplus ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isSurplus ? '+' : ''}
                {formatRupiah(netCashflow)}
              </p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                isSurplus
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {isSurplus ? '📈 Surplus' : '📉 Defisit'}
            </div>
          </div>

          {/* Income & Expense Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-emerald-700 uppercase">
                  Pemasukan
                </span>
                <span className="text-sm font-extrabold text-emerald-600">
                  +{formatRupiah(totalIncome)}
                </span>
              </div>
              <div className="w-full bg-emerald-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${incomePercent}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-rose-700 uppercase">
                  Pengeluaran
                </span>
                <span className="text-sm font-extrabold text-rose-600">
                  -{formatRupiah(totalExpense)}
                </span>
              </div>
              <div className="w-full bg-rose-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${expensePercent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Wallet Cards Carousel */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Daftar Kartu Rekening
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Geser ke samping untuk melihat seluruh kartu.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingWalletId(null);
                setWalletName('');
                setWalletBalance('');
                setShowWalletModal(true);
              }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + Tambah
            </button>
          </div>

          {wallets.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm space-y-3">
              <div className="text-3xl">💳</div>
              <p>Belum ada rekening terdaftar.</p>
              <button
                onClick={() => setShowWalletModal(true)}
                className="text-blue-600 font-bold hover:underline text-sm"
              >
                + Tambah Rekening untuk mulai
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex overflow-x-auto gap-3 pb-3 pt-1 px-0.5 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {wallets.map((w, index) => {
                  const gradient = cardGradients[index % cardGradients.length];
                  return (
                    <div
                      key={w.id}
                      className={`min-w-[260px] sm:min-w-[290px] p-5 rounded-3xl shadow-lg snap-center shrink-0 text-white flex flex-col justify-between h-40 relative overflow-hidden ${gradient}`}
                    >
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex justify-between items-start z-10">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80 block">
                            Rekening Aktif
                          </span>
                          <h3 className="font-bold text-sm tracking-tight truncate mt-0.5">
                            {w.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2 py-0.5 rounded-lg shrink-0">
                          <button
                            onClick={() =>
                              requestPinVerification('edit_wallet', w)
                            }
                            className="text-[10px] font-bold text-white hover:underline px-0.5"
                          >
                            Edit🔒
                          </button>
                          <span className="opacity-40 text-[10px]">|</span>
                          <button
                            onClick={() =>
                              requestPinVerification('delete_wallet', w.id)
                            }
                            className="text-[10px] font-bold text-rose-200 hover:underline px-0.5"
                          >
                            Hapus🔒
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-end z-10 pt-2">
                        <div>
                          <span className="text-[9px] uppercase opacity-75 block">
                            Saldo Tersedia
                          </span>
                          <span className="text-base sm:text-lg font-extrabold tracking-tight">
                            {formatRupiah(w.balance)}
                          </span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm shadow-sm">
                          💳
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[10px] text-gray-400 font-medium mt-1">
                ← Geser kartu untuk melihat akun lain →
              </p>
            </div>
          )}
        </section>

        {/* Balance Distribution */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Distribusi Saldo Rekening
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Porsi saldo tiap rekening terhadap total aset.
            </p>
          </div>

          {wallets.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              Belum ada data rekening.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {wallets.map((w, idx) => {
                const sharePercent =
                  totalBalance > 0
                    ? Math.round(
                        (Math.max(w.balance, 0) / Math.abs(totalBalance)) * 100
                      )
                    : 0;

                const colors = [
                  'border-blue-500 text-blue-600 bg-blue-50',
                  'border-indigo-500 text-indigo-600 bg-indigo-50',
                  'border-emerald-500 text-emerald-600 bg-emerald-50',
                  'border-amber-500 text-amber-600 bg-amber-50',
                  'border-purple-500 text-purple-600 bg-purple-50',
                ];
                const theme = colors[idx % colors.length];

                return (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col items-center text-center space-y-3 shadow-sm hover:shadow-md transition"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[5px] ${theme} flex items-center justify-center font-extrabold text-sm shadow-inner`}
                    >
                      {sharePercent}%
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-xs truncate max-w-[110px]">
                        {w.name}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        {formatRupiah(w.balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Transactions */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Mutasi Rekening Terkini
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Catatan transaksi real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 w-full sm:w-40"
              />
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'income', label: 'Masuk' },
                  { key: 'expense', label: 'Keluar' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setFilterType(t.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      filterType === t.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm space-y-2">
                <div className="text-3xl">📭</div>
                <p>Tidak ada riwayat transaksi yang cocok.</p>
              </div>
            ) : (
              filteredTransactions.slice(0, 8).map((tx) => {
                const w = wallets.find((item) => item.id === tx.walletId);
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between hover:bg-gray-50/70 px-2 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm shrink-0 ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}
                      >
                        {isIncome ? '↙' : '↗'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {tx.category}{' '}
                          <span className="text-xs font-normal text-gray-400">
                            ({w ? w.name : '-'})
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {tx.date}
                          {tx.note ? ` • ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2 sm:gap-3 shrink-0">
                      <div>
                        <p
                          className={`text-sm font-extrabold ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                        </p>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          Berhasil
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          requestPinVerification('delete_tx', tx.id)
                        }
                        title="Hapus transaksi (butuh PIN)"
                        className="text-xs text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 transition font-bold opacity-70 group-hover:opacity-100"
                      >
                        🔒
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Ringkasan Kategori (Dinamis sesuai Database) */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Ringkasan Kategori
                </h2>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Dinamis
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Total pengeluaran berdasarkan kategori yang tersedia.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block uppercase">Total Pengeluaran</span>
              <span className="text-xs font-extrabold text-gray-800">{formatRupiah(totalExpense)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {categories.expense.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-xs col-span-2">Belum ada kategori pengeluaran.</p>
            ) : (
              categories.expense.map((catName) => {
                const catTotal = monthlyTransactions
                  .filter(
                    (tx) =>
                      tx.type === 'expense' &&
                      tx.category.trim().toLowerCase() === catName.trim().toLowerCase()
                  )
                  .reduce((acc, tx) => acc + tx.amount, 0);

                const percentCat =
                  totalExpense > 0
                    ? Math.min(Math.round((catTotal / totalExpense) * 100), 100)
                    : 0;

                return (
                  <div
                    key={catName}
                    className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-700 flex items-center gap-2 truncate pr-2">
                        <span className="w-6 h-6 rounded-lg bg-white shadow-xs flex items-center justify-center text-xs border border-gray-200 shrink-0">
                          🏷️
                        </span>
                        <span className="truncate">{catName}</span>
                      </span>
                      <span className="font-extrabold text-rose-600 shrink-0">{formatRupiah(catTotal)} ({percentCat}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentCat}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ===== MODALS ===== */}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center text-2xl border border-blue-100">
              🔒
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">
                Verifikasi PIN Keamanan
              </h3>
              <p className="text-xs text-gray-400 mt-1.5">
                Masukkan 6 digit PIN untuk melanjutkan.
              </p>
              <p className="text-[10px] text-blue-600 font-semibold mt-1">
                (Hint default: 123456)
              </p>
            </div>
            <form onSubmit={verifyPinAndExecute} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••"
                required
                autoFocus
                className="w-full text-center tracking-[0.5em] text-lg px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Konfirmasi
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  ⚙️ Pengaturan Menu Utama
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tampilkan atau sembunyikan menu di halaman depan.
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-1 text-sm">
              {[
                { key: 'income', label: '➕ Menu Pemasukan' },
                { key: 'expense', label: '➖ Menu Pengeluaran' },
                { key: 'wallet', label: '💳 Menu Tambah Rekening' },
                { key: 'category', label: '🏷️ Menu Tambah Kategori' },
                { key: 'transfer', label: '🔄 Menu Transfer Saldo' },
                { key: 'mutasi', label: '📜 Menu Mutasi' },
                { key: 'stats', label: '📊 Menu Statistik' },
                { key: 'download', label: '📥 Menu Download Excel' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="py-3 flex justify-between items-center border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-700 text-xs">
                    {item.label}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleMenus[item.key]}
                      onChange={() => toggleMenuVisibility(item.key)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              Simpan & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Mutasi Modal */}
      {showMutasiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">📜 Mutasi Rekening</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pilih rekening & rentang tanggal.
                </p>
              </div>
              <button
                onClick={() => setShowMutasiModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Pilih Rekening
                </label>
                <select
                  value={selectedWalletForMutasi}
                  onChange={(e) => setSelectedWalletForMutasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={mutasiStartDate}
                    onChange={(e) => setMutasiStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={mutasiEndDate}
                    onChange={(e) => setMutasiEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {(mutasiStartDate || mutasiEndDate) && (
                <button
                  onClick={() => {
                    setMutasiStartDate('');
                    setMutasiEndDate('');
                  }}
                  className="text-xs text-rose-500 font-medium hover:underline"
                >
                  Reset Filter Tanggal
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl p-3 bg-gray-50 min-h-[180px]">
              {mutasiFilteredList.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">
                  Tidak ada mutasi pada rentang ini.
                </p>
              ) : (
                mutasiFilteredList.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-2.5 flex justify-between items-center text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-gray-800 truncate">
                        {tx.date} — {tx.category}
                      </p>
                      <p className="text-gray-400 truncate">
                        {tx.note || 'Tanpa catatan'}
                      </p>
                    </div>
                    <span
                      className={`font-bold shrink-0 ${
                        tx.type === 'income'
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{' '}
                      {formatRupiah(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowMutasiModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  {txType === 'income'
                    ? '➕ Tambah Pemasukan'
                    : '➖ Tambah Pengeluaran'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Catat transaksi baru ke rekening.
                </p>
              </div>
              <button
                onClick={() => setShowTxModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Nominal (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={formatInputRupiah(amount)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '');
                      setAmount(rawValue);
                    }}
                    placeholder="50.000"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Pilih Rekening
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {(txType === 'income'
                    ? categories.income
                    : categories.expense
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Catatan
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keterangan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition ${
                    txType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  {editingWalletId ? '✏️ Edit Rekening' : '💳 Tambah Rekening'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Atur akun bank atau dompet digital.
                </p>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveWallet} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Nama Bank / Dompet
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="BCA / Mandiri / Tunai"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Saldo Awal (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={formatInputRupiah(walletBalance)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '');
                      setWalletBalance(rawValue);
                    }}
                    placeholder="1.000.000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                >
                  {editingWalletId ? 'Simpan Perubahan' : 'Simpan Rekening'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">🏷️ Tambah Kategori</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Buat label pengelompokan transaksi.
                </p>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Jenis Kategori
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Investasi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Simpan Kategori
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  🔄 Transfer Antar Rekening
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pindahkan dana antar rekening milik Anda.
                </p>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Dari Rekening
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Sisa: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Ke Rekening
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                  Nominal Transfer (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    value={formatInputRupiah(transferAmount)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '');
                      setTransferAmount(rawValue);
                    }}
                    placeholder="100.000"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Kirim Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  📊 Statistik & Analisis
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ringkasan arus kas bulan ini.
                </p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500">Total Transaksi</span>
                <span className="font-bold">
                  {monthlyTransactions.length} aktivitas
                </span>
              </div>
              <div className="flex justify-between p-3.5 bg-emerald-50 rounded-xl text-emerald-700">
                <span>Pemasukan</span>
                <span className="font-bold">{formatRupiah(totalIncome)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-rose-50 rounded-xl text-rose-700">
                <span>Pengeluaran</span>
                <span className="font-bold">{formatRupiah(totalExpense)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-blue-50 rounded-xl text-blue-700 font-bold">
                <span>Net Cashflow</span>
                <span>{formatRupiah(netCashflow)}</span>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-2.5">
                  Rincian Kategori Pengeluaran
                </h4>
                <div className="space-y-2">
                  {categories.expense.map((cat) => {
                    const totalCat = monthlyTransactions
                      .filter(
                        (tx) => tx.type === 'expense' && tx.category === cat
                      )
                      .reduce((acc, tx) => acc + tx.amount, 0);
                    if (totalCat === 0) return null;
                    return (
                      <div
                        key={cat}
                        className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs"
                      >
                        <span className="font-medium text-gray-700">{cat}</span>
                        <span className="font-bold text-rose-600">
                          {formatRupiah(totalCat)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* All Wallets Modal */}
      {showAllWalletsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">
                  ⚙️ Kelola Rekening
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {wallets.length} rekening terdaftar
                </p>
              </div>
              <button
                onClick={() => setShowAllWalletsModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2.5">
              {wallets.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Belum ada rekening.
                </p>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{w.name}</p>
                      <span className="text-[10px] text-gray-400">
                        ID: {w.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-blue-600">
                        {formatRupiah(w.balance)}
                      </p>
                      <div className="flex gap-2.5 justify-end mt-1">
                        <button
                          onClick={() =>
                            requestPinVerification('edit_wallet', w)
                          }
                          className="text-[11px] text-blue-600 hover:underline font-medium"
                        >
                          Edit🔒
                        </button>
                        <button
                          onClick={() =>
                            requestPinVerification('delete_wallet', w.id)
                          }
                          className="text-[11px] text-rose-500 hover:underline font-medium"
                        >
                          Hapus🔒
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowAllWalletsModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}