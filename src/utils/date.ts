/**
 * Helpers de data compartilhados entre `examService` e `useExamsData`.
 * Extraído para um módulo próprio (sem dependências do domínio de exames)
 * para quebrar o require cycle `useExamsData.ts <-> examService.ts`.
 */

/** Retorna a data de hoje no formato YYYY-MM-DD */
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formata uma data de YYYY-MM-DD para DD/MM/YYYY para exibição */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return 'DD/MM/YYYY';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return 'DD/MM/YYYY';
  }
}

/** Converte uma data de DD/MM/YYYY para YYYY-MM-DD para armazenamento */
export function formatDateForStorage(displayDate: string): string {
  try {
    const [day, month, year] = displayDate.split('/');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
