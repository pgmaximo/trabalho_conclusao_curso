import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { gerarCatalogoDeAnalitos } from '../../../../scripts/gerar-catalogo-analitos.mjs';
import { ANALYTE_CATALOG } from '../analyteCatalog';

// analyteCatalog.ts e GERADO a partir do extrato oficial do LOINC. Ate aqui,
// nada regenerava e comparava: o unico guarda era a regex de forma
// /^\d{1,6}-\d$/ em analyteCatalog.test.ts, que aceita QUALQUER digito
// trocado: mudar um digito do meio de um codigo continua casando com a forma,
// e a regex passa sem reclamar. Uma edicao a mao no arquivo gerado (um digito,
// uma canonicalUnit, uma massa molar) passava por toda a bateria.
//
// E o modo de falha que a §6 da spec descreve com todas as letras: "um digito
// trocado corrompe silenciosamente o eixo da comparacao e o erro so aparece
// meses depois". Este teste e o que fecha isso -- ele refaz o trabalho do
// gerador a partir do CSV e exige o mesmo arquivo de volta.
//
// Quando ele falhar, a correcao NAO e editar analyteCatalog.ts para casar com
// o teste. E rodar `node scripts/gerar-catalogo-analitos.mjs` e versionar a
// saida -- ou, se a mudanca era proposital, mudar o gerador ou o extrato.

const RAIZ = join(__dirname, '..', '..', '..', '..');
const EXTRATO = join(RAIZ, 'estudos-ia', '05-vocabularios', 'loinc', 'loinc-analitos-suasaude.csv');
const ARQUIVO_GERADO = join(RAIZ, 'amplify', 'functions', 'extract-document-data', 'analyteCatalog.ts');

/** Fim de linha nao e deriva: o repo e Windows e o git normaliza na entrada. */
const semCr = (texto: string) => texto.replace(/\r\n/g, '\n');

describe('analyteCatalog.ts nao derivou do extrato oficial', () => {
  const { catalogo, fonte } = gerarCatalogoDeAnalitos(readFileSync(EXTRATO, 'utf8'));

  it('cada analito versionado e identico ao que o extrato produz hoje', () => {
    // Comparar os objetos, e nao so o texto, para o diff dizer QUAL analito e
    // QUAL campo mudaram -- um diff de 79 entradas em JSON nao se le.
    expect(ANALYTE_CATALOG).toEqual(catalogo);
  });

  it('o arquivo inteiro e identico ao que o gerador escreve hoje', () => {
    // Pega tambem o que nao esta no array: cabecalho de licenca, o tipo
    // CanonicalAnalyte, findAnalyteByCode e candidatesForPrompt.
    expect(semCr(readFileSync(ARQUIVO_GERADO, 'utf8'))).toBe(semCr(fonte));
  });

  it('o extrato lido e o do projeto, e nao um arquivo vazio', () => {
    // Sem isto, apagar o CSV faria os dois testes acima compararem vazio com
    // vazio -- e o guarda passaria justamente quando nao ha mais fonte.
    expect(catalogo.length).toBe(ANALYTE_CATALOG.length);
    expect(catalogo.length).toBeGreaterThan(0);
  });
});
