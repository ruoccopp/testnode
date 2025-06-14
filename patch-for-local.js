const fs = require('fs');

// Patch drizzle.config.ts
const drizzleConfig = fs.readFileSync('drizzle.config.ts', 'utf8');
if (!drizzleConfig.includes('dotenv')) {
  const patched = 'import * as dotenv from "dotenv";\ndotenv.config();\n\n' + drizzleConfig;
  fs.writeFileSync('drizzle.config.ts', patched);
  console.log('✅ Patched drizzle.config.ts');
}

// Patch server/db.ts
const dbFile = fs.readFileSync('server/db.ts', 'utf8');
if (!dbFile.includes('dotenv')) {
  const patched = 'import * as dotenv from "dotenv";\ndotenv.config();\n\n' + dbFile;
  fs.writeFileSync('server/db.ts', patched);
  console.log('✅ Patched server/db.ts');
}

console.log('🎉 Files patched for local development!');
