const fs = require('fs');
const content = fs.readFileSync('Forge_AI_Builder_All_Wireframes.html', 'utf8');
const lines = content.split('\n');

const screenRegex = /<div\s+class="screen"\s+id="([^"]+)"|<div\s+id="([^"]+)"\s+class="screen"/i;

lines.forEach((line, index) => {
  const match = line.match(screenRegex);
  if (match) {
    const id = match[1] || match[2];
    console.log(`Screen found: ${id} at line ${index + 1}`);
  }
});
