// Cross-platform script to copy contract files after build
const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  const srcContracts = path.join(__dirname, '..', 'src', 'contracts');
  const destContracts = path.join(__dirname, '..', 'dist', 'contracts');
  
  console.log('Copying contracts from:', srcContracts);
  console.log('Copying contracts to:', destContracts);
  
  if (fs.existsSync(srcContracts)) {
    copyRecursiveSync(srcContracts, destContracts);
    console.log('✅ Contract files copied successfully');
  } else {
    console.log('⚠️  Source contracts directory not found');
  }
} catch (error) {
  console.error('❌ Error copying contracts:', error);
  process.exit(1);
}
