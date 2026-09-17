/**
 * Resumo do arquivo:
 * Transforma a linha bruta que o modelo transcreveu na linha canonica que vai
 * para o banco. E aqui que a comparacao entre coletas nasce ou morre: duas
 * coletas do mesmo analito so se comparam se sairem daqui com o mesmo codigo e
 * a mesma unidade.
 *
 * Principio unico deste arquivo: NA DUVIDA, NAO CONVERTE E NAO CHUTA. Linha
 * duvidosa entra com value: null e reviewStatus pendente. O custo de uma
 * revisao a mais e incomodo; o de um numero errado gravado calado e um
 * historico de saude corrompido (spec secao 6).
 */
import type { ReviewStatus } from '../../data/schemas/extractionEnums';

import { findAnalyteByCode } from './analyteCatalog';
import type { RawLabResult } from './extractionSchema';
import { parseDecimal } from './numberParser';
import { convertConcentration } from './unitConverter';

// Importado de amplify/data/schemas/extractionEnums.ts (tarefa 7), NUNCA
// redigitado aqui: esta funcao escreve direto no DynamoDB, e um valor que nao
// bata exatamente com o enum do schema faz o AppSync devolver o campo NULO
// para o cliente, sem erro nenhum -- a armadilha que healthImportEnums.ts
// documenta. Por isso tambem sao CAIXA ALTA com sublinhado: valor de enum do
// GraphQL casa com [_A-Za-z][_0-9A-Za-z]*, e hifen nao entra.

export type NormalizedLabResult = {
  analyteCode: string;
  /** Nome oficial do LOINC -- clausula 10.3 da licenca. */
  analyteLabel: string;
  /** Rotulo em portugues, para a tela. */
  projectLabel: string;
  /** null quando a linha nao pode ser lida com seguranca. Nunca um chute. */
  value: number | null;
  valueQualifier: '<' | '>' | null;
  unit: string;
  rawValue: string;
  rawUnit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  collectedAt: string | null;
  collectionMoment: string | null;
  sourcePage: number | null;
  confidence: number;
  reviewStatus: ReviewStatus;
};

/**
 * PROVISORIO. Nao e um numero medido -- e o lado conservador enquanto nao ha
 * medida. A tarefa 14 substitui este valor pelo apurado contra laudos reais e
 * troca este comentario pelo que sustenta o numero escolhido.
 */
export const CONFIDENCE_THRESHOLD = 0.85;

/** Faixa AUSENTE e faixa ILEGIVEL sao coisas diferentes: laudo sem faixa de
 *  referencia e comum e nao e defeito; faixa escrita que nao le, e. */
function estaAusente(texto: string | null): boolean {
  return texto === null || texto.trim() === '';
}

export function normalizeLabResult(
  raw: RawLabResult,
  confidenceThreshold: number,
): NormalizedLabResult {
  const analyte = raw.analyteCodeGuess ? findAnalyteByCode(raw.analyteCodeGuess) : null;
  const valorLido = parseDecimal(raw.rawValue);

  const base = {
    analyteCode: analyte?.code ?? raw.analyteCodeGuess ?? '',
    analyteLabel: analyte?.label ?? raw.analyteLabel,
    projectLabel: analyte?.projectLabel ?? raw.analyteLabel,
    // O sinal de censura vem DENTRO de rawValue, porque e assim que esta no
    // papel, e quem o separa e o parseDecimal (D21). Pedir ao modelo que
    // separasse seria pedir uma interpretacao que a funcao faz sem errar.
    valueQualifier: valorLido.ok ? valorLido.qualifier : null,
    rawValue: raw.rawValue,
    rawUnit: raw.rawUnit,
    collectedAt: raw.collectedAt,
    collectionMoment: raw.collectionMoment,
    sourcePage: raw.sourcePage,
    confidence: raw.confidence,
  };

  const paraRevisao = (unit: string): NormalizedLabResult => ({
    ...base,
    value: null,
    unit,
    referenceLow: null,
    referenceHigh: null,
    reviewStatus: 'PENDENTE_DE_REVISAO',
  });

  // 1. O numero nao pode ser lido. Nao ha o que converter e nao ha o que
  //    chutar -- "nao reagente" nao vira zero.
  if (!valorLido.ok) return paraRevisao(analyte?.canonicalUnit ?? raw.rawUnit ?? '');

  // 2. O codigo sugerido nao existe no catalogo. Sem analito nao ha unidade
  //    canonica nem massa molar, entao nao ha conversao possivel.
  if (!analyte) return paraRevisao(raw.rawUnit ?? '');

  const faixaBaixaLida = parseDecimal(raw.rawReferenceLow);
  const faixaAltaLida = parseDecimal(raw.rawReferenceHigh);
  const baixaAusente = estaAusente(raw.rawReferenceLow);
  const altaAusente = estaAusente(raw.rawReferenceHigh);

  if ((!baixaAusente && !faixaBaixaLida.ok) || (!altaAusente && !faixaAltaLida.ok)) {
    return paraRevisao(analyte.canonicalUnit);
  }

  // 3. Valor e faixa convertem NUMA SO PASSAGEM, com a mesma massa molar
  //    (D17). Converter o valor e deixar a faixa para tras faz exame normal
  //    aparecer alterado, que e o modo de falha mais caro desta EPIC.
  const de = raw.rawUnit ?? analyte.canonicalUnit;
  const converter = (n: number | null): number | null | 'falhou' => {
    if (n === null) return null;
    const resultado = convertConcentration(n, de, analyte.canonicalUnit, analyte.molarMass);
    return resultado.ok ? resultado.value : 'falhou';
  };

  const valor = converter(valorLido.value);
  const baixa = converter(baixaAusente || !faixaBaixaLida.ok ? null : faixaBaixaLida.value);
  const alta = converter(altaAusente || !faixaAltaLida.ok ? null : faixaAltaLida.value);

  if (valor === 'falhou' || baixa === 'falhou' || alta === 'falhou') {
    return paraRevisao(analyte.canonicalUnit);
  }

  return {
    ...base,
    analyteCode: analyte.code,
    analyteLabel: analyte.label,
    projectLabel: analyte.projectLabel,
    value: valor,
    unit: analyte.canonicalUnit,
    referenceLow: baixa,
    referenceHigh: alta,
    // 4. Confianca baixa manda para revisao mesmo com a conversao perfeita: o
    //    que esta em duvida ali e a LEITURA, nao a aritmetica.
    //
    //    Qualificador preenchido NAO manda: um TSH <0,01 e leitura correta,
    //    nao duvidosa (D21). O que ele faz e tirar a linha da comparacao entre
    //    coletas, e isso e regra de quem compara -- a EPIC de serie por
    //    analito -- nao deste arquivo.
    reviewStatus: raw.confidence < confidenceThreshold ? 'PENDENTE_DE_REVISAO' : 'AUTO',
  };
}
