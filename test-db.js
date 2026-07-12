const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
async function test() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
  console.log('Success');
}
test();
