const fs = require('fs');
const path = require('path');

// Daftar struktur folder dan file yang ingin dibuat
const structure = {
  folders: [
    'public',
    'src/assets',
    'src/components/common',
    'src/components/layout',
    'src/context',
    'src/hooks',
    'src/pages',
    'src/services',
    'src/utils'
  ],
  files: {
    'src/components/common/.gitkeep': '',
    'src/components/layout/.gitkeep': '',
    'src/context/FinanceContext.jsx': '',
    'src/hooks/.gitkeep': '',
    'src/pages/Dashboard.jsx': '',
    'src/pages/Transactions.jsx': '',
    'src/pages/Mutation.jsx': '',
    'src/pages/Wallets.jsx': '',
    'src/pages/Categories.jsx': '',
    'src/services/.gitkeep': '',
    'src/utils/formatters.js': ''
  }
};

// Eksekusi pembuatan folder
structure.folders.forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Berhasil buat folder: ${folder}`);
  }
});

// Eksekusi pembuatan file
Object.entries(structure.files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`📄 Berhasil buat file: ${filePath}`);
  }
});

console.log('\n✨ Semua struktur folder dan file berhasil dibuat secara otomatis!');