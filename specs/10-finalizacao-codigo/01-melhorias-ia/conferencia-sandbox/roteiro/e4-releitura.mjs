// E4 item 7: le uma receita pela extracao real, planta um item "da leitura anterior" e rele.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, OUT, CREDS, login, identityId, gql, create, list } from './lib.mjs';

function pdf(linhas) {
  const txt = linhas.map((l, i) => `BT /F1 14 Tf 60 ${760 - i * 26} Td (${l.replace(/[()\\]/g, (c) => '\\' + c)}) Tj ET`).join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${txt.length} >>\nstream\n${txt}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let s = '%PDF-1.4\n';
  const off = [];
  objs.forEach((o, i) => { off.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = s.length;
  s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  s += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}

const tk = await login(CREDS.A.email, CREDS.A.password);
const idt = await identityId(tk);
const nome = `receita-releitura-${Date.now()}.pdf`;
const key = `medical-documents/${idt}/${nome}`;
const arq = path.join(DIR, nome);
fs.writeFileSync(arq, pdf(['Dr. Carlos Souza - CRM 12345', 'RECEITUARIO', 'Paciente: Teste SDD', '1) Losartana 50 mg ---- 1 comprimido de 12/12h', '2) Dipirona 500 mg ---- 1 comprimido se dor', 'Data: 18/10/2026']));
execFileSync('aws', ['s3', 'cp', arq, `s3://${OUT.storage.bucket_name}/${key}`, '--only-show-errors', '--content-type', 'application/pdf', '--metadata', `${process.env.META}=${JSON.parse(Buffer.from(tk.split('.')[1], 'base64url')).sub}`]);
const docId = await create(tk, 'MedicalDocument', { documentType: 'prescription', documentName: 'Receita releitura', documentDate: '2026-10-18', expirationDate: '2026-11-18', s3FileName: nome, s3Key: key, originalFileName: nome, extractionStatus: 'PENDING' });

async function extrair() {
  console.log(JSON.stringify(await gql(tk, `mutation($d:String!){ startDocumentExtraction(documentId:$d){ status } }`, { d: docId })));
  for (let t = 0; t < 40; t++) {
    const d = (await gql(tk, `query($i:ID!){ getMedicalDocument(id:$i){ extractionStatus extractionError } }`, { i: docId })).getMedicalDocument;
    if (!['PENDING', 'PROCESSING'].includes(d.extractionStatus)) return d;
    await new Promise((r) => setTimeout(r, 8000));
  }
}
const itens = async () => (await list(tk, 'PrescriptionItem', 'id documentId medicationLabel frequency')).filter((i) => i.documentId === docId);

console.log('1a leitura', JSON.stringify(await extrair()), JSON.stringify(await itens()));
await create(tk, 'PrescriptionItem', { documentId: docId, medicationLabel: 'Amoxicilina 500', rawText: 'item da leitura anterior', confidence: 0.9, reviewStatus: 'AUTO' });
console.log('plantado', (await itens()).map((i) => i.medicationLabel));
console.log('2a leitura', JSON.stringify(await extrair()), JSON.stringify((await itens()).map((i) => i.medicationLabel)));
console.log('docId', docId);
