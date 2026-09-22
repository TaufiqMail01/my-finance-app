import * as XLSX from 'xlsx';

// Helper untuk format rupiah teks di Excel
const formatRupiahExcel = (angka) => {
  return new Intl.Numberstruc ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka) : 'Rp ' + Number(angka).toLocaleString('id-ID');
};

export const exportTransactionsToExcel = (transactions, wallets) => {
  // Buat mapping ID rekening ke Nama Rekening agar mudah dibaca
  const walletMap = wallets.reduce((acc, w) => {
    acc[w.id] = w.name;
    return acc;
  }, {});

  // 1. Format data transaksi agar rapi dan kolom tidak menumpuk
  const formattedData = transactions.map((tx, index) => ({
    No: index + 1,
    Tanggal: tx.date,
    'Jenis Transaksi': tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    Rekening: walletMap[tx.walletId] || 'Lainnya',
    Kategori: tx.category,
    // Format nominal menjadi angka murni agar bisa dihitung atau diberi format Excel, 
    // atau string rapi. Di sini kita masukkan angka agar Excel mengenalnya sebagai numeric.
    Nominal: tx.amount, 
    Catatan: tx.note || '-'
  }));

  // 2. Buat Worksheet dari data
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // 3. Atur format cell untuk kolom Nominal agar tampil sebagai mata uang Rupiah di Excel
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: 5 }); // Kolom ke-6 (Nominal)
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].z = '"Rp"#,##0'; // Format Excel untuk Rupiah
    }
  }

  // 4. Atur lebar kolom secara otomatis (Auto-fit) agar tidak bertumpuk / terpotong
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 15 }, // Jenis Transaksi
    { wch: 15 }, // Rekening
    { wch: 20 }, // Kategori
    { wch: 18 }, // Nominal
    { wch: 25 }, // Catatan
  ];
  worksheet['!cols'] = colWidths;

  // 5. Buat Workbook dan simpan file
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mutasi Keuangan');

  // Generate nama file dengan tanggal hari ini
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Laporan-Keuangan-${dateStr}.xlsx`);
};