const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\SHAFIULLA\\.gemini\\antigravity-ide\\brain\\4a65366e-9c9d-4083-b3b3-0053bff4eae1\\.system_generated\\tasks\\task-911.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log("Total log lines:", lines.length);
  
  // Let's find lines containing "Processing App Settings" or "Click"
  lines.forEach((line, idx) => {
    if (line.includes('Processing App Settings') || line.includes('Click Edit Settings') || line.includes('Click Show actions') || line.includes('Revealed Field') || line.includes('Consumer Key') || line.includes('Consumer Secret')) {
      console.log(`Line ${idx + 1}: ${line}`);
    }
  });
} else {
  console.log("Log file not found!");
}
