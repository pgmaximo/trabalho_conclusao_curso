// Importacao de wearable pela pipeline real: S3 -> HealthImport -> startHealthAnalysis -> espera COMPLETED.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DIR, OUT, CREDS, login, identityId, gql, create } from './lib.mjs';

const tk = await login(CREDS.A.email, CREDS.A.password);
const idt = await identityId(tk);
const importId = randomUUID();
const pasta = path.join(DIR, 'wearable');
const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.csv'));
const fileKeys = [];
arquivos.forEach((f, i) => {
  const key = `health-imports/${idt}/${importId}/${i}-${f}`;
  execFileSync('aws', ['s3', 'cp', path.join(pasta, f), `s3://${OUT.storage.bucket_name}/${key}`, '--only-show-errors']);
  fileKeys.push(key);
});
await create(tk, 'HealthImport', { id: importId, status: 'PENDING', fileKeys, fileNames: arquivos });
console.log(JSON.stringify(await gql(tk, `mutation($i:String!){ startHealthAnalysis(importId:$i){ importId status } }`, { i: importId })));
for (let t = 0; t < 60; t++) {
  const d = await gql(tk, `query($i:ID!){ getHealthImport(id:$i){ status periodStart periodEnd dayCount resultArtifactKey errorMessage warnings } }`, { i: importId });
  const h = d.getHealthImport;
  if (h.status !== 'PENDING' && h.status !== 'PROCESSING') { console.log(JSON.stringify(h, null, 1)); break; }
  await new Promise((r) => setTimeout(r, 10000));
}
