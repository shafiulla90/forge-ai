const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = 'C:\\Users\\SHAFIULLA\\.gemini\\antigravity-ide\\brain\\4a65366e-9c9d-4083-b3b3-0053bff4eae1';

const filesToCopy = [
  'classic_05d_direct.png',
  'button_in_view.png',
  'oauth_page_uat_key.png'
];

fs.mkdirSync(destDir, { recursive: true });

filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to artifacts directory.`);
  } else {
    console.warn(`File ${file} does not exist at ${srcPath}`);
  }
});
