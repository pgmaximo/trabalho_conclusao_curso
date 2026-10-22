// Gera CSVs Samsung Health sinteticos de 2026-08-01 a 2026-10-12 a partir das fixtures.
import fs from 'node:fs';
import path from 'node:path';

const [fixDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const INICIO = Date.UTC(2026, 7, 1);
const DIAS = 73;
const DT = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/g;

for (const f of fs.readdirSync(fixDir).filter((n) => n.endsWith('.csv'))) {
  const linhas = fs.readFileSync(path.join(fixDir, f), 'utf8').split(/\r?\n/);
  const [meta, header, modelo] = linhas;
  if (!modelo) continue;
  const primeira = modelo.match(/(\d{4})-(\d{2})-(\d{2}) /);
  if (!primeira) { fs.writeFileSync(path.join(outDir, f), linhas.join('\n')); continue; }
  const base = Date.UTC(+primeira[1], +primeira[2] - 1, +primeira[3]);
  const fim = header.split(',').indexOf('com.samsung.health.sleep.end_time');
  const dur = header.split(',').indexOf('sleep_duration');
  const out = [meta, header];
  for (let d = 0; d < DIAS; d++) {
    const delta = INICIO + d * 864e5 - base;
    // jitter de minutos no fim do sono; outubro dorme ~40 min a menos que agosto/setembro
    const jitter = ((d * 37) % 50) - 25 - (d >= 61 ? 40 : 0);
    const cols = modelo.split(',');
    if (dur >= 0 && cols[dur]) cols[dur] = String(+cols[dur] + jitter);
    const linha = cols.map((c, i) => c.replace(DT, (...m) => {
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]) + delta + (i === fim ? jitter * 6e4 : 0);
      return new Date(t).toISOString().replace('T', ' ').replace('Z', '');
    })).join(',').replace(/uuid0000-0000-0000-0000-000000000000/g, `uuid${String(d).padStart(4, '0')}-0000-0000-0000-00000000${String(d).padStart(4, '0')}`);
    out.push(linha);
  }
  fs.writeFileSync(path.join(outDir, f), out.join('\n') + '\n');
}
console.log('ok', fs.readdirSync(outDir).length);
