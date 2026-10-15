/**
 * Varredura (D46): nas duas funcoes que abrem arquivo do bucket, o leitor do S3
 * so e importado por `arquivoDoDono.ts`, que confere a posse antes de entregar
 * os bytes.
 *
 * O conserto do achado de 2026-09-24 vale enquanto nao houver OUTRO caminho de
 * leitura. Um caminho novo escrito daqui a tres blocos -- a regravacao, um
 * reprocessamento, uma ferramenta do chat -- que importasse `readDocument`
 * direto reabriria a porta sem que nenhum teste de comportamento notasse. E este
 * teste que nota.
 */
import * as fs from 'fs';
import * as path from 'path';

const FUNCOES = path.resolve(__dirname, '..', '..');
const PASTAS = ['extract-document-data', 'chat-assistant'];
const UNICO_LEITOR = path.join(FUNCOES, 'extract-document-data', 'arquivoDoDono.ts');
const O_LEITOR = path.join(FUNCOES, 'extract-document-data', 's3Reader.ts');

function arquivosDeCodigo(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : arquivosDeCodigo(caminho);
    return entrada.name.endsWith('.ts') ? [caminho] : [];
  });
}

/** Importa o modulo do leitor, por qualquer caminho relativo. */
const IMPORTA_O_LEITOR = /from\s+['"][^'"]*\/s3Reader['"]/;

describe('a leitura do bucket passa pela conferencia de dono', () => {
  const arquivos = PASTAS.flatMap((p) => arquivosDeCodigo(path.join(FUNCOES, p)));

  it('a varredura enxerga os arquivos que importam', () => {
    // Sem isto, um caminho errado faria a varredura passar sobre zero arquivos.
    expect(arquivos).toContain(UNICO_LEITOR);
    expect(arquivos).toContain(path.join(FUNCOES, 'extract-document-data', 'handler.ts'));
    expect(arquivos).toContain(path.join(FUNCOES, 'chat-assistant', 'anexoPontual.ts'));
  });

  it('so arquivoDoDono.ts importa o leitor do S3', () => {
    const importadores = arquivos
      .filter((f) => f !== O_LEITOR)
      .filter((f) => IMPORTA_O_LEITOR.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(FUNCOES, f));

    expect(importadores).toEqual([path.relative(FUNCOES, UNICO_LEITOR)]);
  });
});
