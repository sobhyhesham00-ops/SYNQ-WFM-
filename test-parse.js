const xlsx = require('xlsx');

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet([
  ['Name', '2026-07-05', '2026-07-06'],
  ['AbdelRahman Al Sayed', '7 AM to 4 PM', 'Off'],
  ['Amr Mohamed Farouk', '1 PM to 10 PM', '10 PM to 7 AM'],
]);
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
xlsx.writeFile(wb, 'test.xlsx');

const wbRead = xlsx.readFile('test.xlsx');
console.log(wbRead.SheetNames);
