import * as XLSX from 'xlsx';

export const exportTransactionsToExcel = (transactions, wallets) => {
  // Mapping data agar lebih mudah dibaca saat dibuka di Excel
  const formattedData = transactions.map((tx, index) => {
    // Cari nama dompet berdasarkan walletId
    const wallet = wallets.find(w => w.id === tx.walletId);
    
    return {
      No: index + 1,
      Tanggal: tx.date || '-',
      Jenis: tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: tx.category || '-',
      'Dompet / Metode': wallet ? wallet.name : 'Lainnya',
      Nominal: tx.amount,
      Catatan: tx.note || '-'
    };
  });

  // Buat Worksheet baru dari data JSON
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Buat Workbook baru
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");

  // Atur lebar kolom otomatis agar tidak terpotong (opsional tapi rapi)
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 12 }, // Jenis
    { wch: 20 }, // Kategori
    { wch: 18 }, // Dompet / Metode
    { wch: 15 }, // Nominal
    { wch: 30 }  // Catatan
  ];
  worksheet['!cols'] = colWidths;

  // Trigger download file Excel (.xlsx)
  XLSX.writeFile(workbook, `Laporan-Keuangan-${new Date().toISOString().slice(0, 10)}.xlsx`);
};