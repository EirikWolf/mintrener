import fs from 'fs';
import path from 'path';

export function getKitorToken(rootDir?: string): string {
  if (
    process.env.KITOR_TOKEN &&
    process.env.KITOR_TOKEN.trim() &&
    !process.env.KITOR_TOKEN.includes('ditt_kitor_token')
  ) {
    return process.env.KITOR_TOKEN.trim();
  }

  const baseDir = rootDir || process.cwd();
  const envFiles = [
    path.resolve(baseDir, '.env.local'),
    path.resolve(baseDir, '.env'),
  ];

  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^KITOR_TOKEN=(.+)$/m);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val && !val.includes('ditt_kitor_token') && !val.includes('placeholder')) {
          return val;
        }
      }
    }
  }

  throw new Error('KITOR_TOKEN mangler. Legg KITOR_TOKEN=<token> i .env.local');
}
