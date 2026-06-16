import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';

async function importSql() {
  let conn;
  try {
    conn = await mysql.createConnection({ 
      host: 'localhost', 
      user: 'root', 
      password: '', 
      multipleStatements: true
    });
    console.log('[SUCCESS] Connected to MySQL db hrportal');

    const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
    const extPath = path.join(process.cwd(), 'src', 'database', 'ai_interview_extension.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('[INFO] Executing schema.sql...');
    await conn.query(schemaSql);

    const extSql = fs.readFileSync(extPath, 'utf8');
    console.log('[INFO] Executing ai_interview_extension.sql...');
    await conn.query(extSql);

    console.log('[SUCCESS] Database tables imported successfully.');
  } catch (e) {
    console.error(`[FAILED] Error: ${e.message}`);
  } finally {
    if (conn) await conn.end();
  }
}

importSql();
