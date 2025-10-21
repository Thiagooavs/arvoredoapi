import fs from "fs";
import crypto from "crypto";
import { execSync } from 'child_process';

const schemaPath = './prisma/schema.prisma';
const hashPath = './prisma/.schemahash';

function getHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const newHash = getHash(schemaContent);

let oldHash = '';
if (fs.existsSync(hashPath)) {
  oldHash = fs.readFileSync(hashPath, 'utf-8');
}

if (newHash !== oldHash) {
  console.log('Schema alterado! Gerando Prisma e aplicando DB generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  fs.writeFileSync(hashPath, newHash);
} else {
  console.log('Sem alterações no schema. Nada a fazer.');
}
