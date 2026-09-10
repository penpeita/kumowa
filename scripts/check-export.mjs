import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const prefix = process.env.PAGES_BASE_PATH || '';
// vinext emits basePath sites beneath that path; Pages supplies the mount path.
const directory = resolve('dist/client', prefix.replace(/^\/+/, ''));
const html = await readFile(join(directory, 'index.html'), 'utf8');
if (!html.includes('くもわ') || !html.includes('パスワードを入れて始めるでやんす')) throw new Error('The password screen was not exported.');
if (html.includes('初級を練習するでやんす')) throw new Error('Practice content rendered before unlocking.');
const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]).filter(url => url.startsWith('/') && !url.startsWith('//')))];
for (const url of assets) {
  if (prefix && !url.startsWith(prefix + '/')) throw new Error(`Asset escaped base path: ${url}`);
  const pathname = decodeURIComponent(url.split('?')[0].slice(prefix.length));
  const file = resolve(directory, '.' + pathname);
  if (!file.startsWith(directory + '\\') && !file.startsWith(directory + '/')) throw new Error(`Invalid asset path: ${url}`);
  if (!(await stat(file)).isFile()) throw new Error(`Missing static file: ${url}`);
}
console.log(`Static export verified: entry screen and ${assets.length} asset references (base path: ${prefix || '/'}).`);
