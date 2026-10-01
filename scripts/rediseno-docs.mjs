// Copia las capturas de celular de una corrida de scripts/capturas.mjs a docs/rediseno/<antes|despues>/ en WebP (2×).
//   node scripts/rediseno-docs.mjs <carpeta-capturas> <antes|despues>
import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const [src, which] = process.argv.slice(2);
const out = resolve(import.meta.dirname, '..', 'docs/rediseno', which);
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src).filter((n) => /^m-(dark|light)-.*\.png$/.test(n) && !n.includes('bienvenida'))) {
  const name = f.replace(/^m-/, '').replace('dark', 'oscuro').replace('light', 'claro').replace('.png', '.webp');
  await sharp(resolve(src, f)).resize(780).webp({ quality: 82 }).toFile(resolve(out, name));
}
console.log(readdirSync(out).length, 'capturas en', out);
