const fs = require('fs');
const md = fs.readFileSync('c:\\\\Users\\\\Przemek\\\\Mój dysk\\\\rzeczoznawca\\\\01_Bazy_Danych\\\\Linkownik_Gminny.md', 'utf8');
const lines = md.split('\\n');
const counties = {};
for (const line of lines) {
  if (line.includes('|') && line.includes('e-mapa.net/polska/')) {
    const parts = line.split('|');
    if (parts.length >= 4) {
      const terytMatch = parts[2].trim().match(/^(\\d{4})/);
      const urlMatch = parts[3].match(/malopolskie-12\\/([^\\/]+)\\//) || parts[3].match(/slaskie-24\\/([^\\/]+)\\//);
      if (terytMatch && urlMatch) {
         const powCode = terytMatch[1];
         // np. bochenski-01 lub krakow-61
         const powName = urlMatch[1].replace(/-\\d{2}$/, '');
         counties[powCode] = powName;
      }
    }
  }
}
console.log(JSON.stringify(counties, null, 2));
