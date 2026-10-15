import type { MedicalDocumentFilter } from '@/types/models';

/**
 * Os filtros da tela de Exames, na ordem em que aparecem.
 *
 * O Canvas 3a tinha um quarto, "Alterados". Ele ficou na tela desabilitado,
 * com "· Em breve", desde a primeira versão da lista, porque um documento não
 * guardava nada sobre o resultado. Saiu: a regra 4 proíbe o app de marcar um
 * valor como alterado, então "Em breve" prometia o que não vai chegar
 * (specs/00-fundacao/correcoes-menores/spec.md, D1).
 */
export const MEDICAL_DOCUMENT_FILTERS: MedicalDocumentFilter[] = ['Todos', 'Exames', 'Receitas'];
