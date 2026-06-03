const fs = require('fs');
const path = require('path');

const xmlPath = path.join(__dirname, '..', 'docx_temp', 'word', 'document.xml');
const xmlContent = fs.readFileSync(xmlPath, 'utf8');

// Simple parser to extract <w:t> tags
const matches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
if (matches) {
  const text = matches.map(m => {
    const content = m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
    return content;
  }).join('');
  
  // Clean up and format paragraphs by adding linebreaks where <w:p> ends
  const paragraphs = xmlContent.split('</w:p>').map(p => {
    const tMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (!tMatches) return '';
    return tMatches.map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')).join('');
  }).filter(t => t.trim().length > 0);

  fs.writeFileSync(path.join(__dirname, 'extracted_docx.txt'), paragraphs.join('\n'));
  console.log('Extracted', paragraphs.length, 'paragraphs.');
} else {
  console.log('No text tags found!');
}
