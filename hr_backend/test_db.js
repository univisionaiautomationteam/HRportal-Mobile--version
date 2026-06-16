import mysql from 'mysql2/promise';

async function test(password) {
  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password });
    console.log(`[SUCCESS] Connected to MySQL with password: '${password}'`);
    await conn.query('CREATE DATABASE IF NOT EXISTS hrportal');
    console.log('[SUCCESS] Database hrportal verified/created.');
    process.exit(0);
  } catch (e) {
    console.log(`[FAILED] Password '${password}': ${e.message}`);
  }
}

async function run() {
  await test('keerthana@08');
  await test('krishna@123krishna');
  await test('');
  console.log('[FATAL] None of the passwords worked.');
  process.exit(1);
}
run();
