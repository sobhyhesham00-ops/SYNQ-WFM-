const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([
  ['Name', '2026-07-05'],
  ['Amr', 'Off'],
]);
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
xlsx.writeFile(wb, 'test_file.xlsx');
fs.renameSync('test_file.xlsx', 'test_file_no_ext');

try {
  const wbRead = xlsx.readFile('test_file_no_ext');
  console.log('Success:', wbRead.SheetNames);
} catch (e) {
  console.error('Error:', e.message);
}
