/**
 * Resumo do arquivo:
 * Fronteira do aplicativo com a extracao: dispara, consulta o estado, e
 * registra a decisao da pessoa sobre uma linha pendente.
 *
 * REGRA DESTE ARQUIVO: o aplicativo NAO converte unidade e NAO interpreta
 * numero. Conversao acontece num lugar so, a Lambda, sob teste. Aqui a pessoa
 * digita o valor NA UNIDADE QUE A TELA JA MOSTRA, e o que vai para o banco e
 * exatamente o que ela digitou.
 */
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '../../amplify/data/resource';
// Modulo sem nenhuma dependencia -- por isso pode ser compartilhado com o
// aplicativo. A pessoa que corrige uma linha digita "32,5" pelo mesmo motivo
// que o laudo escreve "32,5", e ler isso com parseFloat devolveria 32 (D23).
import { parseDecimal } from '../../amplify/functions/extract-document-data/numberParser';

const client = generateClient<Schema>();

/**
 * NUNCA_EXTRAIDO nao e um estado do banco: e a ausencia de estado. Todo
 * documento gravado antes desta EPIC tem `extractionStatus` nulo, e a tela
 * precisa distinguir "nunca passou pela leitura" de "esta na fila".
 */
export type ExtractionStatus =
  | 'NUNCA_EXTRAIDO'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'NO_RESULTS'
  | 'FAILED';

export type ExtractionState = {
  status: ExtractionStatus;
  startedAt: string | null;
  errorMessage: string | null;
  warnings: string[];
  results: LabResultView[];
};

export type LabResultView = {
  id: string;
  /** Codigo LOINC do catalogo, ou codigo local `X-` quando o analito esta
   *  fora dele (D32). O prefixo e o que a tela usa para nao prometer
   *  comparacao entre laboratorios que nao existe. */
  analyteCode: string;
  projectLabel: string;
  analyteLabel: string;
  value: number | null;
  valueQualifier: string | null;
  unit: string | null;
  rawValue: string;
  rawUnit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  collectedAt: string | null;
  collectionMoment: string | null;
  sourcePage: number | null;
  reviewStatus: 'AUTO' | 'PENDENTE_DE_REVISAO' | 'CONFIRMADO_PELO_USUARIO';
};

function lancarSeErro(errors?: { message: string }[] | null): void {
  if (errors?.length) throw new Error(errors.map((e) => e.message).filter(Boolean).join('; '));
}

/**
 * Pede a leitura do documento. LANCA quando falha, de proposito: quem chama do
 * formulario engole o erro (salvar o documento nao pode depender disto), e
 * quem chama do botao "Ler agora" precisa saber para poder dizer.
 */
export async function startExtraction(documentId: string): Promise<void> {
  const { errors } = await client.mutations.startDocumentExtraction({ documentId });
  lancarSeErro(errors);
}

export async function fetchExtractionState(documentId: string): Promise<ExtractionState> {
  const { data: doc, errors } = await client.models.MedicalDocument.get({ id: documentId });
  lancarSeErro(errors);

  const { data: linhas } = await client.models.LabResult.listLabResultByDocumentId({ documentId });

  return {
    status: (doc?.extractionStatus as ExtractionStatus | null) ?? 'NUNCA_EXTRAIDO',
    startedAt: doc?.extractionStartedAt ?? null,
    errorMessage: doc?.extractionError ?? null,
    warnings: (doc?.extractionWarnings ?? []).filter((w): w is string => !!w),
    results: (linhas ?? []) as unknown as LabResultView[],
  };
}

/** A pessoa olhou o papel e disse que a leitura esta certa. O valor nao muda --
 *  o que muda e quem responde por ele. */
export async function confirmLabResult(id: string): Promise<void> {
  const { errors } = await client.models.LabResult.update({
    id,
    reviewStatus: 'CONFIRMADO_PELO_USUARIO',
    correctedAt: new Date().toISOString(),
  });
  lancarSeErro(errors);
}

export type CorrectionResult = { ok: true } | { ok: false; message: string };

/**
 * A pessoa corrigiu o numero. `unit` e a unidade que a tela JA MOSTRAVA -- nao
 * ha conversao aqui, de proposito (ver o cabecalho do arquivo).
 *
 * rawValue e rawUnit NAO sao tocados: eles guardam o que estava no papel, e o
 * papel nao mudou porque alguem corrigiu a leitura. E o que permite auditar
 * depois de onde veio cada numero.
 */
export async function correctLabResult(
  id: string,
  digitado: string,
  unit: string,
): Promise<CorrectionResult> {
  const lido = parseDecimal(digitado);
  if (!lido.ok) {
    return {
      ok: false,
      message: 'Não entendemos esse número. Use vírgula para a casa decimal, como no laudo.',
    };
  }

  const { errors } = await client.models.LabResult.update({
    id,
    value: lido.value,
    valueQualifier: lido.qualifier,
    unit,
    reviewStatus: 'CONFIRMADO_PELO_USUARIO',
    correctedAt: new Date().toISOString(),
  });
  if (errors?.length) {
    return { ok: false, message: errors.map((e) => e.message).filter(Boolean).join('; ') };
  }
  return { ok: true };
}
