import XLSX from 'xlsx';
import fs from 'node:fs';

const wb = XLSX.readFile('รายชื่อ นร. ม.1-6 ปี 69 (11-5-69).xlsx');
const out = [];

for (const name of wb.SheetNames) {
  const clean = name.trim();
  if (clean === 'รวม') continue;
  const m = clean.match(/^(ม\.\d+)[- ](\d+)$/);
  const room = m ? `${m[1]}/${m[2]}` : clean;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });

  let start = 4;
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const txt = (rows[r] || []).map((c) => String(c || '').trim()).join(' ');
    if (txt.includes('เลขประจำตัว') || txt.includes('ชื่อ')) {
      start = r + 1;
      break;
    }
  }

  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 3) continue;
    const no = Number(String(row[0] || '').trim()) || 0;
    const code = String(row[1] || '').trim().replace(/\.0$/, '');
    const fullName = String(row[2] || '').trim().replace(/\s+/g, ' ');
    if (!code || !fullName || !/^\d{3,}$/.test(code)) continue;
    out.push({ no, code, name: fullName, room });
  }
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/ptnRoster69.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Exported students:', out.length, 'rooms:', new Set(out.map((x) => x.room)).size);
