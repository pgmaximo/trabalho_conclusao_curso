/**
 * Varredura (E6, D6.1): no chat, so a porta do dono (`ownerScopedRead.ts`)
 * importa o modulo que fala com o S3, e ninguem importa o SDK do S3 no topo.
 *
 * A primeira afirmacao segura a posse: uma ferramenta que chamasse
 * `baixarTextoDoBucket` direto leria a chave que quisesse, sem o vinculo pelo
 * `importId`. A segunda segura os testes: o SDK do S3 quebra no jest do projeto
 * (plan.md do E6, secao 6), e um import no topo derrubaria toda suite que
 * carrega a lista de ferramentas.
 */
import * as fs from 'fs';
import * as path from 'path';

const CHAT = path.resolve(__dirname, '..');
const A_PORTA = path.join(CHAT, 'tools', 'ownerScopedRead.ts');
const O_MODULO = path.join(CHAT, 'tools', 'bucketDaSerie.ts');

function arquivosDeCodigo(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : arquivosDeCodigo(caminho);
    return entrada.name.endsWith('.ts') ? [caminho] : [];
  });
}

describe('a serie do wearable so passa pela porta do dono', () => {
  const arquivos = arquivosDeCodigo(CHAT);

  it('a varredura enxerga os arquivos que importam', () => {
    expect(arquivos).toContain(A_PORTA);
    expect(arquivos).toContain(O_MODULO);
  });

  it('so ownerScopedRead.ts importa bucketDaSerie', () => {
    const importadores = arquivos
      .filter((f) => /(from\s+|import\(\s*|require\(\s*)['"][^'"]*\/bucketDaSerie['"]/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(CHAT, f));
    expect(importadores).toEqual([path.relative(CHAT, A_PORTA)]);
  });

  it('nenhum arquivo do chat importa o SDK do S3 no topo', () => {
    const importadores = arquivos.filter((f) => /from\s+['"]@aws-sdk\/client-s3['"]/.test(fs.readFileSync(f, 'utf8')));
    expect(importadores).toEqual([]);
  });
});
