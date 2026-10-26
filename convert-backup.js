const fs = require('fs');
const path = require('path');

function findBackupFile() {
  const files = fs.readdirSync(__dirname);
  const jsonFile = files.find(f => f.endsWith('.json') && (f.includes('backup') || f.includes('inventory')));
  return jsonFile ? path.join(__dirname, jsonFile) : null;
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convert() {
  const filePath = process.argv[2] || findBackupFile();
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('No backup JSON file found in this folder. Please place your backup JSON file here or pass its path:');
    console.error('node convert-backup.js /path/to/backup.json');
    process.exit(1);
  }

  console.log(`Reading backup from: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    console.error('Expected JSON to contain an array of inventory items.');
    process.exit(1);
  }

  console.log(`Found ${items.length} records. Converting to CSV...`);

  // Target columns for Supabase inventory table
  const headers = ['sheet', 'month', 'value', 'hold'];
  const lines = [headers.join(',')];

  for (const item of items) {
    const sheet = escapeCsvField(item.sheet || '');
    const month = escapeCsvField(item.month || '');
    const value = escapeCsvField(item.value || '');
    const hold = item.hold === true ? 'TRUE' : 'FALSE';

    lines.push(`${sheet},${month},${value},${hold}`);
  }

  const outPath = path.join(__dirname, 'inventory.csv');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Successfully created ${outPath} with ${items.length} rows!`);
}

convert();
