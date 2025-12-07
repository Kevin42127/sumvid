const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 需要包含的文件和資料夾
const filesToInclude = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/',
  '_locales/'
];

// 需要排除的文件和資料夾
const filesToExclude = [
  'node_modules',
  '.git',
  '.env',
  '.DS_Store',
  '*.log',
  'api/',
  'server.js',
  'package.json',
  'package-lock.json',
  'README.md',
  'README_BACKEND.md',
  'ENV_SETUP.md',
  'VERCEL_DEPLOY.md',
  'vercel.json',
  'config.example.js',
  'PRIVACY_POLICY.md',
  'privacy-policy.html',
  'index.html',
  '.gitignore',
  '.idea/',
  '.vscode/',
  'package-extension.js'
];

console.log('🚀 開始打包 SumVid 擴充功能...\n');

// 檢查必要文件是否存在
const missingFiles = [];
filesToInclude.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error('❌ 缺少必要文件：');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

// 創建臨時打包目錄
const packageDir = path.join(__dirname, 'package');
const zipFileName = 'sumvid-extension.zip';

// 清理舊的打包文件
if (fs.existsSync(packageDir)) {
  console.log('🧹 清理舊的打包目錄...');
  fs.rmSync(packageDir, { recursive: true, force: true });
}

if (fs.existsSync(zipFileName)) {
  console.log('🧹 刪除舊的 ZIP 文件...');
  fs.unlinkSync(zipFileName);
}

// 創建打包目錄
fs.mkdirSync(packageDir, { recursive: true });

console.log('📦 複製文件到打包目錄...\n');

// 複製文件
filesToInclude.forEach(item => {
  const sourcePath = path.join(__dirname, item);
  const destPath = path.join(packageDir, item);
  
  if (fs.statSync(sourcePath).isDirectory()) {
    // 複製整個資料夾
    copyDirectory(sourcePath, destPath);
    console.log(`   ✓ ${item}/`);
  } else {
    // 複製單個文件
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(sourcePath, destPath);
    console.log(`   ✓ ${item}`);
  }
});

// 複製資料夾的輔助函數
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n✅ 文件複製完成！\n');

// 檢查是否有壓縮工具可用
let zipCommand = null;
const isWindows = process.platform === 'win32';

if (isWindows) {
  // Windows: 嘗試使用 PowerShell Compress-Archive
  try {
    execSync('powershell -Command "Get-Command Compress-Archive"', { stdio: 'ignore' });
    zipCommand = 'powershell';
  } catch (e) {
    // 嘗試 7z
    try {
      execSync('where 7z', { stdio: 'ignore' });
      zipCommand = '7z';
    } catch (e2) {
      // 嘗試使用 Node.js archiver
      try {
        require('archiver');
        zipCommand = 'archiver';
      } catch (e3) {
        zipCommand = null;
      }
    }
  }
} else {
  // Linux/Mac: 嘗試使用 zip
  try {
    execSync('which zip', { stdio: 'ignore' });
    zipCommand = 'zip';
  } catch (e) {
    try {
      require('archiver');
      zipCommand = 'archiver';
    } catch (e2) {
      zipCommand = null;
    }
  }
}

// 創建 ZIP 文件
console.log('📦 創建 ZIP 文件...\n');

if (zipCommand === 'powershell') {
  // Windows: 使用 PowerShell Compress-Archive
  const zipPath = path.resolve(__dirname, zipFileName);
  const packagePath = path.resolve(packageDir);
  try {
    execSync(`powershell -Command "Compress-Archive -Path '${packagePath}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ ZIP 文件創建成功：${zipFileName}`);
    console.log(`   文件大小：${sizeInMB} MB\n`);
  } catch (error) {
    console.error('❌ 創建 ZIP 文件失敗');
    process.exit(1);
  }
} else if (zipCommand === 'zip') {
  // 使用 zip 命令
  const zipPath = path.join(__dirname, zipFileName);
  const originalDir = process.cwd();
  process.chdir(packageDir);
  try {
    execSync(`zip -r "${zipPath}" .`, { stdio: 'inherit' });
    process.chdir(originalDir);
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ ZIP 文件創建成功：${zipFileName}`);
    console.log(`   文件大小：${sizeInMB} MB\n`);
  } catch (error) {
    process.chdir(originalDir);
    console.error('❌ 創建 ZIP 文件失敗');
    process.exit(1);
  }
} else if (zipCommand === '7z') {
  // 使用 7z 命令
  const zipPath = path.resolve(__dirname, zipFileName);
  const packagePath = path.resolve(packageDir);
  try {
    execSync(`7z a -tzip "${zipPath}" "${packagePath}\\*"`, { stdio: 'inherit' });
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ ZIP 文件創建成功：${zipFileName}`);
    console.log(`   文件大小：${sizeInMB} MB\n`);
  } catch (error) {
    console.error('❌ 創建 ZIP 文件失敗');
    process.exit(1);
  }
} else if (zipCommand === 'archiver') {
  // 使用 Node.js archiver
  const archiver = require('archiver');
  const output = fs.createWriteStream(zipFileName);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  output.on('close', () => {
    const stats = fs.statSync(zipFileName);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ ZIP 文件創建成功：${zipFileName}`);
    console.log(`   文件大小：${sizeInMB} MB\n`);
  });
  
  archive.on('error', (err) => {
    console.error('❌ 創建 ZIP 文件失敗：', err);
    process.exit(1);
  });
  
  archive.pipe(output);
  archive.directory(packageDir, false);
  archive.finalize();
} else {
  console.error('❌ 無法創建 ZIP 文件：');
  console.error('   未找到可用的壓縮工具');
  if (isWindows) {
    console.error('\n   請使用以下任一方法：');
    console.error('   1. 使用 PowerShell（已內建）');
    console.error('   2. 安裝 7-Zip: https://www.7-zip.org/');
    console.error('   3. 安裝 archiver: npm install archiver\n');
  } else {
    console.error('\n   請安裝以下任一工具：');
    console.error('   1. zip: sudo apt-get install zip (Linux) 或 brew install zip (Mac)');
    console.error('   2. npm install archiver\n');
  }
  console.log('📁 打包目錄已創建在：', packageDir);
  console.log('   您可以手動將此目錄壓縮為 ZIP 文件。\n');
  process.exit(1);
}

// 清理臨時目錄
console.log('🧹 清理臨時文件...');
fs.rmSync(packageDir, { recursive: true, force: true });

console.log('\n🎉 打包完成！');
console.log(`📦 擴充功能 ZIP 文件：${zipFileName}`);
console.log('\n📋 下一步：');
console.log('   1. 前往 Chrome Web Store 開發者後台');
console.log('   2. 上傳 ' + zipFileName + ' 文件');
console.log('   3. 填寫擴充功能資訊並提交審核\n');

