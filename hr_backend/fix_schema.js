import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
let content = fs.readFileSync(schemaPath, 'utf8');

const prefix = `DROP DATABASE IF EXISTS hrportal;
CREATE DATABASE hrportal;
USE hrportal;

SET FOREIGN_KEY_CHECKS=0;

-- USERS
CREATE TABLE users (
`;

content = prefix + content;
fs.writeFileSync(schemaPath, content);
console.log('Fixed schema.sql');
