const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const projectRoot = path.join(__dirname, '..');
const outputPath = path.join(projectRoot, 'forgeai.zip');

const EXCLUDES = [
  'node_modules',
  '.next',
  '.git',
  '.vscode',
  '.env.local',
  'forgeai.zip',
  'desktop.ini',
  'tsconfig.tsbuildinfo',
  '.gitattributes',
  '.gitignore'
];

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Check if the current file/dir is excluded
    const relativePath = path.relative(projectRoot, filePath);
    const shouldExclude = EXCLUDES.some(exclude => {
      return relativePath === exclude || relativePath.startsWith(exclude + path.sep);
    });

    if (shouldExclude) {
      return;
    }

    // Check file extension to filter out binaries and docx files
    const ext = path.extname(file).toLowerCase();
    if (['.exe', '.docx', '.pdf', '.zip', '.log'].includes(ext)) {
      return;
    }

    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function buildPackage() {
  console.log('📦 Starting Forge AI packaging...');
  const zip = new JSZip();
  
  console.log('🔍 Scanning files to package...');
  const filesToPackage = walkDir(projectRoot);
  console.log(`📋 Found ${filesToPackage.length} files to bundle.`);

  filesToPackage.forEach(filePath => {
    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath);
    zip.file(relativePath, content);
  });

  console.log('⚡ Generating ZIP archive...');
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(outputPath, content);
  console.log(`\n🎉 Packaging complete! Created release archive:`);
  console.log(`👉 ${outputPath} (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
}

buildPackage().catch(err => {
  console.error('❌ Packaging failed:', err);
  process.exit(1);
});
