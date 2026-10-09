/**
 * Resumo do arquivo:
 * As unidades em que o estoque de um medicamento é contado: a lista do
 * formulário e o texto do cartão de estoque ("22 comp.", "3 doses").
 *
 * Eram três (Comp., ml, Cáps.), e não cobriam as formas que o próprio
 * formulário oferece: uma caneta de insulina, um spray ou uma pomada não tinham
 * unidade que servisse, e a unidade é obrigatória. "Doses" e "Unidades" cobrem
 * o resto (specs/00-fundacao/correcoes-menores/spec.md, D4).
 *
 * ATENÇÃO: esta lista tem de ser a mesma do banco
 * (`amplify/data/schemas/medicines.ts`, campo `unit`). O banco recusa um valor
 * que não esteja na lista dele. O teste `formularioDeMedicamentoOpcoes` compara
 * as duas.
 */
export const MEDICINE_UNIT_OPTIONS = [
  { value: 'COMP', label: 'Comp.' },
  { value: 'ML', label: 'ml' },
  { value: 'CAPS', label: 'Cáps.' },
  { value: 'DOSE', label: 'Doses' },
  { value: 'UNIT', label: 'Unidades' },
] as const;

export type MedicineUnit = (typeof MEDICINE_UNIT_OPTIONS)[number]['value'];

/**
 * A unidade como ela aparece depois da quantidade, no cartão de estoque.
 * "dose" é a única que muda no singular; as outras são abreviações.
 */
export function medicineUnitLabel(unit: string | null | undefined, quantity: number): string {
  switch (unit) {
    case 'COMP':
      return 'comp.';
    case 'ML':
      return 'ml';
    case 'CAPS':
      return 'cáps.';
    case 'DOSE':
      return quantity === 1 ? 'dose' : 'doses';
    case 'UNIT':
      return 'un.';
    default:
      // Sem unidade, nada. Uma unidade que este app não conhece (gravada por
      // uma versão mais nova) aparece como veio, em vez de sumir.
      return unit ?? '';
  }
}
