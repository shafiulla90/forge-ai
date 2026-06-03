const fs = require('fs')

const content = fs.readFileSync('Forge_AI_Builder_All_Wireframes.html', 'utf8')
const lines = content.split('\n')

console.log('Total lines:', lines.length)
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('jira')) {
    console.log(`Line ${index + 1}: ${line.trim().substring(0, 100)}...`)
  }
})
