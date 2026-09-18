import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// D27, e §6 da spec de extracao: "Codigos de terminologia nao sao digitados a
// mao. Eles vem do arquivo oficial do LOINC. Um digito trocado corrompe
// silenciosamente o eixo da comparacao e o erro so aparece meses depois."
//
// Regra de projeto vira teste, do mesmo jeito que a D23 virou teste em
// numberParser.test.ts. Comentario dizendo "conferido no arquivo oficial" NAO
// e verificacao: o cabecalho de analyteNormalizer.test.ts registra que uma
// versao do plano trazia 14635-7 -- codigo LOINC valido, mas o errado para
// nos -- e o comentario ao lado dele nao impediu nada.
//
// Quem precisa de um codigo em teste busca a entrada no catalogo gerado, por
// `projectLabel`, como __tests__/lab-result-grouping.test.ts faz.

const RAIZ = join(__dirname, '..');

const PASTAS_IGNORADAS = new Set([
  'node_modules',
  '.git',
  '.expo',
  '.claude',
  'coverage',
  'android',
  'ios',
  'dist',
  'build',
]);

const EXTENSOES = /\.(ts|tsx|mjs|js)$/;

/** Literal com a forma de codigo LOINC dentro de aspas: '2345-7', "718-7". */
const LITERAL_LOINC = /(['"`])(\d{1,6}-\d)\1/g;

/**
 * O UNICO arquivo do projeto em que codigo LOINC pode aparecer. Ele e gerado a
 * partir do extrato oficial por scripts/gerar-catalogo-analitos.mjs, e o teste
 * de deriva (catalogoNaoDeriva.test.ts) regenera e compara -- ou seja, os
 * codigos daqui sao verificados contra o CSV, nao contra a memoria de alguem.
 */
const GERADO = join('amplify', 'functions', 'extract-document-data', 'analyteCatalog.ts');

/**
 * Excecoes, uma a uma, com motivo. Nao ha excecao por pasta nem por padrao:
 * acrescentar uma entrada aqui obriga a escrever por que aquele literal NAO e
 * um codigo LOINC digitado de cabeca.
 */
const EXCECOES: { arquivo: string; codigo: string; motivo: string }[] = [
  {
    arquivo: join('amplify', 'functions', 'extract-document-data', '__tests__', 'analyteNormalizer.test.ts'),
    codigo: '99999-9',
    motivo:
      'INVENTADO de proposito: e o caso negativo que prova que um palpite do modelo ' +
      'nunca vira analyteCode. O proprio teste confirma que ele nao existe no catalogo.',
  },
];

function arquivosDoProjeto(dir: string, acumulador: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.isDirectory()) {
      if (PASTAS_IGNORADAS.has(entrada.name)) continue;
      arquivosDoProjeto(join(dir, entrada.name), acumulador);
    } else if (EXTENSOES.test(entrada.name)) {
      acumulador.push(join(dir, entrada.name));
    }
  }
  return acumulador;
}

function eExcecao(arquivo: string, codigo: string): boolean {
  return EXCECOES.some((e) => e.arquivo === arquivo && e.codigo === codigo);
}

describe('D27 -- nenhum codigo LOINC e digitado a mao', () => {
  const esteArquivo = relative(RAIZ, __filename);

  const violacoes = arquivosDoProjeto(RAIZ)
    .map((caminho) => relative(RAIZ, caminho))
    // Este arquivo e o registro das excecoes: ele cita os literais que libera.
    .filter((arquivo) => arquivo !== esteArquivo && arquivo !== GERADO)
    .flatMap((arquivo) => {
      const linhas = readFileSync(join(RAIZ, arquivo), 'utf-8').split('\n');
      return linhas.flatMap((linha, i) =>
        [...linha.matchAll(LITERAL_LOINC)]
          .map((m) => m[2])
          .filter((codigo) => !eExcecao(arquivo, codigo))
          .map((codigo) => `${arquivo}:${i + 1}  '${codigo}'`),
      );
    });

  it('a varredura enxerga o projeto -- senao ela passaria por estar vazia', () => {
    expect(arquivosDoProjeto(RAIZ).length).toBeGreaterThan(100);
  });

  it('nenhum arquivo versionado traz literal com forma de codigo LOINC', () => {
    // Quem precisa de um codigo busca no catalogo gerado por projectLabel.
    expect(violacoes).toEqual([]);
  });
});
