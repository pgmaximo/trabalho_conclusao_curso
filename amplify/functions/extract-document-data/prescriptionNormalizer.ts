/**
 * Resumo do arquivo:
 * Receita rende medicamento e posologia, nao analito. Mesma pipeline, outro
 * ramo -- e um ramo deliberadamente BURRO: ele nao converte dose, nao
 * interpreta posologia e nao decide nada sobre tratamento.
 *
 * Um PrescriptionItem NUNCA vira Medicine e NUNCA cria lembrete. A garantia
 * nao e um cuidado no codigo: e o fato de este arquivo nao importar nada da
 * tabela Medicine, e de o handler nao ter permissao para escrever nela. Criar
 * lembrete de medicamento a partir da leitura automatica de um papel e acao de
 * risco alto que esta EPIC nao toma (spec secao 5). Ha teste que varre todos
 * os arquivos desta funcao para isso continuar verdadeiro amanha.
 */
import type { ReviewStatus } from '../../data/schemas/extractionEnums';

import { CONFIDENCE_THRESHOLD } from './analyteNormalizer';
import type { RawPrescriptionItem } from './extractionSchema';

export type NormalizedPrescriptionItem = {
  medicationLabel: string;
  dose: string | null;
  unit: string | null;
  frequency: string | null;
  duration: string | null;
  rawText: string;
  confidence: number;
  reviewStatus: ReviewStatus;
};

/** Campo em branco no papel e campo AUSENTE, nao string vazia: uma string em
 *  branco no banco aparece na tela como um espaco que ninguem entende. */
function textoOuNulo(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

export function normalizePrescriptionItem(raw: RawPrescriptionItem): NormalizedPrescriptionItem {
  return {
    medicationLabel: raw.medicationLabel.trim(),
    // A dose fica como TEXTO. "50", "12,5", "1/2 comprimido" -- transformar
    // isso em numero exigiria decidir o que "meio comprimido de 50mg" quer
    // dizer, que e leitura clinica. O texto do papel e suficiente para o que
    // esta tela faz: mostrar o que estava escrito na receita.
    dose: textoOuNulo(raw.dose),
    unit: textoOuNulo(raw.unit),
    frequency: textoOuNulo(raw.frequency),
    duration: textoOuNulo(raw.duration),
    rawText: raw.rawText,
    confidence: raw.confidence,
    reviewStatus: raw.confidence < CONFIDENCE_THRESHOLD ? 'PENDENTE_DE_REVISAO' : 'AUTO',
  };
}
