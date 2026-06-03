const fs = require('fs');

const logPath = 'C:\\Users\\SHAFIULLA\\.gemini\\antigravity-ide\\brain\\4a65366e-9c9d-4083-b3b3-0053bff4eae1\\.system_generated\\tasks\\task-936.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  let currentApp = '';
  lines.forEach((line) => {
    if (line.includes('Processing App Settings:')) {
      currentApp = line.trim();
      console.log(`\n========================================`);
      console.log(currentApp);
      console.log(`========================================`);
    }
    
    if (line.includes('Click Show actions:') || line.includes('Click Edit Settings:') || line.includes('Current Page URL:') || line.includes('Body Snippet:') || line.includes('Frames detected inside page:')) {
      console.log(line.trim());
    }
  });
} else {
  console.log("Log not found!");
}
