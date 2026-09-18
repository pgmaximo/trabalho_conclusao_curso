// Gera amplify/functions/extract-document-data/analyteCatalog.ts a partir do
// extrato oficial do LOINC 2.83.
//
//   node scripts/gerar-catalogo-analitos.mjs
//
// Tambem e MODULO: `gerarCatalogoDeAnalitos(textoDoCsv)` faz a geracao inteira
// sem tocar no disco. E o que permite ao teste de deriva regenerar e comparar
// com o arquivo versionado sem reescrever nada -- um teste que gravasse o
// arquivo "consertaria" a deriva em vez de acusa-la. A escrita so acontece
// quando este arquivo e chamado como comando (ver o fim do arquivo).
//
// NENHUM codigo LOINC aparece neste arquivo (D27) -- todos sao lidos da coluna
// LOINC_NUM do CSV. O arquivo gerado tambem nao e editado a mao: para mudar
// algo, mude este script ou o extrato, e rode de novo.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const EXTRATO = resolve('estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv');
const SAIDA = resolve('amplify/functions/extract-document-data/analyteCatalog.ts');

// Massa molar em g/mol, de estudos-ia/03-esquemas/conversao-unidades.md.
// Informacao QUIMICA, nossa, nao do LOINC -- por isso mora aqui e nao no
// extrato (a clausula 2 da licenca permite acrescentar campo; nada obriga a
// acrescentar no arquivo deles). Chave = coluna rotulo_projeto do CSV.
//
// As fracoes lipidicas (HDL, LDL, VLDL, nao-HDL) repetem a massa do
// colesterol porque sao a MESMA molecula medida em particulas diferentes --
// o que varia e a particula que a carrega, nao o analito dosado.
const MASSA_MOLAR = {
  Glicose: 180.16,
  'Colesterol total': 386.65,
  HDL: 386.65,
  LDL: 386.65,
  VLDL: 386.65,
  'Colesterol nao-HDL': 386.65,
  Triglicerides: 885.4,
  Creatinina: 113.12,
  Ureia: 60.06,
  'Acido urico': 168.11,
  'Bilirrubina total': 584.66,
  'Bilirrubina direta': 584.66,
  'Bilirrubina indireta': 584.66,
  'Calcio total': 40.08,
  Magnesio: 24.31,
  Fosforo: 30.97,
  'Ferro serico': 55.85,
  'Vitamina D (25-OH)': 400.64,
  'Vitamina B12': 1355.37,
  'Acido folico': 441.4,
  'Vitamina C': 176.12,
  'Vitamina A': 286.45,
  'Vitamina E': 430.71,
  'T4 livre': 776.87,
  'T4 total': 776.87,
  'T3 livre': 650.98,
  'T3 total': 650.98,
  'Testosterona total': 288.42,
  'Testosterona livre': 288.42,
  Cortisol: 362.46,
  Estradiol: 272.38,
};

// Analitos proibidos de converter para unidade molar MESMO se algum dia
// ganharem massa molar aqui. Hoje a lista e redundante -- nenhum deles esta em
// MASSA_MOLAR -- e ela existe exatamente para o dia em que alguem, de boa fe,
// acrescentar 64500 (o tetramero) para a hemoglobina. O assert abaixo derruba
// a geracao nesse dia. Ver D18: monomero e tetramero diferem por um fator de
// quatro, que num valor de hemoglobina e a diferenca entre anemia e
// normalidade.
const SEM_CONVERSAO_MOLAR = new Set(['Hemoglobina', 'Hemoglobina glicada', 'CHCM', 'HCM']);

// Unidade canonica = a CONVENCIONAL BRASILEIRA (D17), que nem sempre e a
// EXAMPLE_UCUM_UNITS do LOINC. So entram aqui os casos em que as duas
// divergem; ausente = usa a do LOINC. As quatro primeiras sao pendencias
// documentadas em estudos-ia/05-vocabularios/pendencias.md.
const UNIDADE_CANONICA = {
  'Vitamina A': 'ug/dL', // pendencia 1 -- o LOINC exemplifica ug/mL
  'Vitamina E': 'mg/L', // pendencia 2 -- o LOINC exemplifica "mg/L;mg/dL"
  'Albumina urinaria': 'mg/L', // pendencia 4 -- o LOINC exemplifica g/dL
  TSH: 'u[IU]/mL', // uUI/mL e identico a mIU/L (conversao-unidades.md)
};

// RELATEDNAMES2 traz de 10 a 40 termos por analito, varios deles nome de
// classe repetido ("HEMATOLOGY/CELL COUNTS") ou eixo do nome completamente
// especificado ("Point in time", "Quantitative"). Levar tudo ao modelo seria
// inflar o prompt com ruido: 79 analitos x 40 termos e mais de 3 mil termos.
const RUIDO =
  /^(point in time|random|quantitative|qnt|quant|quan|mass concentration|volume fraction|level|serum|plasma|ser\/plas|blood|wb|whole blood|auto|[a-z]+\/[a-z ]+)$/i;
const MAX_SINONIMOS = 8;

function lerCsv(texto) {
  // O extrato e gerado por nos e nao tem virgula dentro de campo -- mas
  // RELATEDNAMES2 tem ponto e virgula, e um dia pode ganhar aspas. Parser
  // minimo com suporte a aspas, para nao depender de pacote novo.
  const linhas = texto.replace(/\r\n/g, '\n').trim().split('\n');
  const parseLinha = (linha) => {
    const campos = [];
    let atual = '';
    let dentroDeAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (dentroDeAspas && linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else dentroDeAspas = !dentroDeAspas;
      } else if (c === ',' && !dentroDeAspas) {
        campos.push(atual);
        atual = '';
      } else atual += c;
    }
    campos.push(atual);
    return campos;
  };
  const cabecalho = parseLinha(linhas[0]);
  return linhas.slice(1).map((linha) => {
    const campos = parseLinha(linha);
    return Object.fromEntries(cabecalho.map((nome, i) => [nome, campos[i] ?? '']));
  });
}

function sinonimos(linha) {
  const bruto = `${linha.ptBR_COMPONENT};${linha.ptBR_SHORTNAME};${linha.ptBR_RELATEDNAMES2}`;
  const vistos = new Set();
  const saida = [];
  for (const termo of bruto.split(';').map((t) => t.trim())) {
    if (!termo || RUIDO.test(termo)) continue;
    const chave = termo.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(termo);
    if (saida.length >= MAX_SINONIMOS) break;
  }
  return saida;
}

/**
 * Le as linhas do extrato e monta o catalogo. Os avisos saem junto em vez de
 * irem direto ao console: quem imprime e o comando, nao a geracao.
 */
function montarCatalogo(linhas) {
  const avisos = [];

  const catalogo = linhas.map((linha) => {
    const rotulo = linha.rotulo_projeto;
    const massaMolar = MASSA_MOLAR[rotulo] ?? null;

    if (massaMolar !== null && SEM_CONVERSAO_MOLAR.has(rotulo)) {
      // Nao e aviso: e parada. Ver D18.
      throw new Error(
        `${rotulo} esta em MASSA_MOLAR e em SEM_CONVERSAO_MOLAR ao mesmo tempo. Decida qual das duas vale antes de gerar.`,
      );
    }
    // Clausula 10.2 da licenca: material com direito de terceiro nao pode sair
    // do extrato para dentro do aplicativo.
    if ((linha.EXTERNAL_COPYRIGHT_NOTICE ?? '').trim()) {
      throw new Error(`${linha.LOINC_NUM} carrega aviso de copyright de terceiro.`);
    }
    // O LOINC as vezes lista mais de uma unidade de exemplo separadas por ponto
    // e virgula ("mg/L;mg/dL"). Nesse caso a escolha e OBRIGATORIAMENTE nossa,
    // porque o proprio LOINC nao escolheu.
    const exemploLoinc = linha.EXAMPLE_UCUM_UNITS;
    const canonica = UNIDADE_CANONICA[rotulo] ?? exemploLoinc;
    if (!UNIDADE_CANONICA[rotulo] && exemploLoinc.includes(';')) {
      avisos.push(
        `${rotulo}: o LOINC lista mais de uma unidade de exemplo ("${exemploLoinc}") e nao ha entrada em UNIDADE_CANONICA.`,
      );
    }
    const listaSinonimos = sinonimos(linha);
    if (listaSinonimos.length === 0) avisos.push(`${rotulo}: sem nenhum sinonimo em pt-BR.`);

    return {
      code: linha.LOINC_NUM,
      label: linha.LONG_COMMON_NAME, // nome oficial -- clausula 10.3
      projectLabel: rotulo,
      panel: linha.painel,
      canonicalUnit: canonica,
      loincExampleUnit: exemploLoinc,
      molarMass: massaMolar,
      synonyms: listaSinonimos,
      convertsToMolar: massaMolar !== null && !SEM_CONVERSAO_MOLAR.has(rotulo),
    };
  });

  const repetidos = catalogo.map((a) => a.code).filter((c, i, todos) => todos.indexOf(c) !== i);
  if (repetidos.length > 0) throw new Error(`Codigo LOINC repetido: ${repetidos.join(', ')}`);

  return { catalogo, avisos };
}

const CABECALHO = `// ARQUIVO GERADO -- nao editar a mao.
// Fonte: estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv (LOINC 2.83)
// Gerador: scripts/gerar-catalogo-analitos.mjs
//
// Nenhum codigo LOINC deste arquivo foi digitado por uma pessoa (D27). Para
// mudar qualquer coisa aqui, mude o gerador ou o extrato e rode de novo.
//
// This material contains content from LOINC (http://loinc.org). LOINC is
// copyright (c) 1995-2024, Regenstrief Institute, Inc. and the Logical
// Observation Identifiers Names and Codes (LOINC) Committee and is available
// at no cost under the license at http://loinc.org/license. LOINC(R) is a
// registered United States trademark of Regenstrief Institute, Inc.
`;

/** O texto do analyteCatalog.ts, do cabecalho de licenca ate a ultima funcao. */
function renderizarArquivo(catalogo) {
  return `${CABECALHO}
export type CanonicalAnalyte = {
  /** Codigo LOINC, lido do arquivo oficial. */
  code: string;
  /** Nome oficial do LOINC. Exigido pela clausula 10.3 da licenca: todo dado
   *  extraido anda junto do codigo E de um nome oficial. Nunca substituir por
   *  rotulo nosso. */
  label: string;
  /** O rotulo em portugues que a tela mostra. Nosso, campo acrescentado. */
  projectLabel: string;
  /** Painel do laudo (Hemograma, Lipidico, ...). Nosso. */
  panel: string;
  /** Unidade convencional brasileira (D17). Nossa -- acrescentada ao lado da
   *  do LOINC, nunca por cima dela (clausula 2). */
  canonicalUnit: string;
  /** EXAMPLE_UCUM_UNITS, preservada exatamente como o LOINC a escreveu. */
  loincExampleUnit: string;
  /** g/mol. null quando nao ha conversao molar para este analito. */
  molarMass: number | null;
  /** Nomes relacionados em portugues, do proprio LOINC (variante pt-BR).
   *  Nao sao traducao nossa -- ver D26 e a clausula 12 da licenca. */
  synonyms: string[];
  convertsToMolar: boolean;
};

export const ANALYTE_CATALOG: CanonicalAnalyte[] = ${JSON.stringify(catalogo, null, 2)};

const PELO_CODIGO = new Map(ANALYTE_CATALOG.map((a) => [a.code, a]));

/** Nunca lanca: codigo desconhecido devolve null, e quem chama manda a linha
 *  para revisao em vez de chutar (tarefa 5). */
export function findAnalyteByCode(code: string): CanonicalAnalyte | null {
  return PELO_CODIGO.get(code) ?? null;
}

/** A lista curta que vai no prompt (tarefa 9). Leva os nomes em portugues,
 *  porque o laudo brasileiro e em portugues, e NAO leva massa molar, que e
 *  insumo do conversor e nao do mapeamento. */
export function candidatesForPrompt(): Array<
  Pick<CanonicalAnalyte, 'code' | 'label' | 'projectLabel' | 'canonicalUnit' | 'synonyms'>
> {
  return ANALYTE_CATALOG.map(({ code, label, projectLabel, canonicalUnit, synonyms }) => ({
    code,
    label,
    projectLabel,
    canonicalUnit,
    synonyms,
  }));
}
`;
}

/**
 * A geracao inteira, sem tocar no disco: entra o texto do extrato, sai o
 * catalogo e o texto exato do analyteCatalog.ts.
 *
 * Quem consome, alem do comando abaixo, e o teste de deriva em
 * amplify/functions/extract-document-data/__tests__/catalogoNaoDeriva.test.ts.
 */
export function gerarCatalogoDeAnalitos(textoDoCsv) {
  const { catalogo, avisos } = montarCatalogo(lerCsv(textoDoCsv));
  return { catalogo, avisos, fonte: renderizarArquivo(catalogo) };
}

// Daqui para baixo so roda quando o arquivo e chamado como comando. Importar
// este modulo NAO pode escrever nada: o teste de deriva importa para comparar,
// e se a importacao regravasse o arquivo ele passaria sempre -- consertando a
// deriva em silencio em vez de acusa-la.
// Comparado pelo nome do arquivo em execucao, e nao por `import.meta.url`:
// o babel-preset-expo mira Hermes, que nao tem `import.meta`, e o teste de
// deriva nao conseguiria nem carregar o modulo. Sob o jest, `process.argv[1]`
// e o binario do jest, entao a comparacao da falso -- que e o que importa.
const chamadoComoComando = basename(process.argv[1] ?? '') === 'gerar-catalogo-analitos.mjs';

if (chamadoComoComando) {
  const { catalogo, avisos, fonte } = gerarCatalogoDeAnalitos(readFileSync(EXTRATO, 'utf8'));
  writeFileSync(SAIDA, fonte, 'utf8');
  console.log(`LOINC 2.83 -- ${catalogo.length} analitos gravados em ${SAIDA}`);
  console.log(`  com massa molar: ${catalogo.filter((a) => a.molarMass !== null).length}`);
  console.log(
    `  unidade canonica != exemplo do LOINC: ${catalogo.filter((a) => a.canonicalUnit !== a.loincExampleUnit).length}`,
  );
  for (const aviso of avisos) console.warn(`  AVISO: ${aviso}`);
  if (avisos.length === 0) console.log('  Sem avisos.');
}
