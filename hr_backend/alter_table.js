import mysql from 'mysql2/promise';

async function alterTable() {
  let conn;
  try {
    conn = await mysql.createConnection({ 
      host: '127.0.0.1', 
      user: 'root', 
      password: '', 
      database: 'hrportal'
    });
    console.log('[SUCCESS] Connected to MySQL db hrportal');

    await conn.query(`
      ALTER TABLE candidates
      ADD COLUMN created_by INT,
      ADD COLUMN created_by_name VARCHAR(100),
      ADD COLUMN assigned_to INT,
      ADD COLUMN assigned_to_name VARCHAR(100);
    `);
    
    console.log('[SUCCESS] Added missing columns to candidates table.');
  } catch (e) {
    console.error(`[FAILED] Error: ${e.message}`);
  } finally {
    if (conn) await conn.end();
  }
}

alterTable();
