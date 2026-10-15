/**
 * Resumo do arquivo:
 * Motor de derivação de esquema vacinal — funções puras (sem I/O, sem
 * AsyncStorage, sem Amplify) que cruzam o catálogo do Calendário Nacional
 * (src/data/calendarioNacionalVacinacao.ts) com as doses já registradas do
 * usuário para calcular a próxima dose devida, a série pendente de uma
 * vacina, e quais vacinas se aplicam à idade atual. Extraído como serviço
 * próprio (e não dentro de useVaccinationData.ts) para ser testável sem
 * mockar hooks — mesmo racional de src/services/medicineReminderService.ts
 * separar `buildMedicineReminderPlans` (puro) de `scheduleMedicineReminders`
 * (efeito colateral).
 *
 * Todas as datas de entrada/saída são strings "YYYY-MM-DD" (mesmo formato do
 * schema Amplify `a.date()` usado em VaccineDose/UserProfile). A aritmética é
 * feita em UTC para não sofrer o mesmo problema de fuso horário documentado
 * em medicineReminderService.ts (isEndDateInThePast).
 */
import type { DoseSpec, VacinaCatalogo } from '@/data/calendarioNacionalVacinacao';

export type DoseAplicadaInfo = {
  ordem: number;
  appliedDate: string; // YYYY-MM-DD
};

export type DoseDevida = {
  ordem: number;
  rotulo: string;
  dueDate: string; // YYYY-MM-DD
};

function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtcDate(iso: string): Date | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
}

export function addDaysToDate(iso: string, days: number): string {
  const date = toUtcDate(iso);
  if (!date) return iso;
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function addMonthsToDate(iso: string, months: number): string {
  const date = toUtcDate(iso);
  if (!date) return iso;
  date.setUTCMonth(date.getUTCMonth() + months);
  return toIsoDate(date);
}

export function addYearsToDate(iso: string, years: number): string {
  const date = toUtcDate(iso);
  if (!date) return iso;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return toIsoDate(date);
}

/** Idade em meses completos na data `hoje`, a partir de `birthDate` (YYYY-MM-DD). */
export function ageInMonths(birthDate: string, hoje: string): number {
  const birth = parseIsoDate(birthDate);
  const now = parseIsoDate(hoje);
  if (!birth || !now) return 0;

  let months = (now.y - birth.y) * 12 + (now.m - birth.m);
  if (now.d < birth.d) {
    months -= 1;
  }
  return Math.max(months, 0);
}

function laterDate(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Data recomendada para uma dose específica: o mais tarde entre a idade
 * mínima recomendada (se houver) e o intervalo mínimo em relação à dose
 * anterior aplicada (se houver) — nunca recomenda uma dose antes do que a
 * segurança clínica permite, mesmo que a idade já tenha sido atingida.
 */
function computeDueDateForDose(
  dose: DoseSpec,
  birthDate: string | undefined,
  previousAppliedDate: string | undefined,
): string {
  const candidates: string[] = [];

  if (dose.idadeMesesRecomendada !== undefined && birthDate) {
    candidates.push(addMonthsToDate(birthDate, dose.idadeMesesRecomendada));
  }

  if (dose.intervaloMinimoDiasDaAnterior !== undefined && previousAppliedDate) {
    candidates.push(addDaysToDate(previousAppliedDate, dose.intervaloMinimoDiasDaAnterior));
  }

  if (candidates.length === 0) {
    // Sem idade nem intervalo definidos (ex. 1ª dose de uma vacina sem
    // recomendação etária, como dT) — a dose já pode ser tomada a qualquer
    // momento; usar a data de nascimento como piso não faz sentido aqui, mas
    // como não há chamador que use este caso sem contexto adicional (a 1ª
    // dose nunca aparece como "devida" por este caminho — ver deriveNextDose),
    // retornamos uma string vazia para sinalizar "sem data mínima calculável".
    return '';
  }

  return candidates.reduce((latest, candidate) => laterDate(latest, candidate));
}

/**
 * Deriva as doses futuras da série de uma vacina a partir da última dose
 * aplicada — usado para criar em cascata os registros "pendente" quando o
 * usuário cadastra a 1ª dose de uma série de N doses (decisão do usuário:
 * lembrete automático da 2ª/3ª dose ao registrar a 1ª).
 */
export function derivePendingSeries(
  catalogo: VacinaCatalogo,
  doseAplicada: DoseAplicadaInfo,
  birthDate?: string,
): DoseDevida[] {
  const remaining = catalogo.doses.filter((dose) => dose.ordem > doseAplicada.ordem);
  const pending: DoseDevida[] = [];
  let previousAppliedDate = doseAplicada.appliedDate;

  for (const dose of remaining) {
    const dueDate = computeDueDateForDose(dose, birthDate, previousAppliedDate);
    pending.push({ ordem: dose.ordem, rotulo: dose.rotulo, dueDate: dueDate || previousAppliedDate });
    // Para encadear a próxima dose da série, assume-se que esta será aplicada
    // na data devida (best-effort) — se o usuário aplicar em outra data, o
    // registro correspondente é atualizado e as próximas doses recalculadas.
    previousAppliedDate = dueDate || previousAppliedDate;
  }

  return pending;
}

/**
 * Deriva a próxima dose devida de uma vacina, dado o histórico de doses já
 * aplicadas. Retorna `null` quando a série está completa e não há reforço
 * recorrente, quando a vacina é anual e já foi tomada dentro dos últimos ~12
 * meses, ou quando a idade do usuário está fora da faixa de indicação.
 */
export function deriveNextDose(
  catalogo: VacinaCatalogo,
  dosesAplicadas: DoseAplicadaInfo[],
  birthDate: string | undefined,
  hoje: string,
): DoseDevida | null {
  if (birthDate && catalogo.idadeMaxMeses !== undefined) {
    if (ageInMonths(birthDate, hoje) > catalogo.idadeMaxMeses && catalogo.reforcoIntervaloAnos === undefined) {
      return null;
    }
  }

  if (catalogo.anual) {
    const lastApplied = dosesAplicadas
      .map((d) => d.appliedDate)
      .sort()
      .at(-1);

    if (lastApplied && addDaysToDate(lastApplied, 330) > hoje) {
      return null; // já tomou a dose anual dentro da janela recente
    }

    return { ordem: 1, rotulo: 'Dose anual', dueDate: lastApplied ? addDaysToDate(lastApplied, 330) : hoje };
  }

  const appliedOrdens = new Set(dosesAplicadas.map((d) => d.ordem));
  const lastAppliedOrdem = dosesAplicadas.length > 0 ? Math.max(...dosesAplicadas.map((d) => d.ordem)) : 0;
  const lastAppliedDate = dosesAplicadas.find((d) => d.ordem === lastAppliedOrdem)?.appliedDate;

  const nextInSeries = catalogo.doses.find((dose) => !appliedOrdens.has(dose.ordem));

  if (nextInSeries) {
    const dueDate = computeDueDateForDose(nextInSeries, birthDate, lastAppliedDate) || hoje;
    return { ordem: nextInSeries.ordem, rotulo: nextInSeries.rotulo, dueDate };
  }

  // Série completa — verificar reforço recorrente (ex. dT a cada 10 anos).
  if (catalogo.reforcoIntervaloAnos !== undefined && lastAppliedDate) {
    return {
      ordem: lastAppliedOrdem + 1,
      rotulo: 'Reforço',
      dueDate: addYearsToDate(lastAppliedDate, catalogo.reforcoIntervaloAnos),
    };
  }

  return null; // esquema completo, sem reforço recorrente
}

export type VacinaDevidaPorIdade = {
  catalogoId: VacinaCatalogo['id'];
  nome: string;
};

/**
 * Lista as vacinas do calendário cuja faixa etária de indicação cobre a idade
 * atual do usuário — independente de já terem sido registradas ou não (essa
 * verificação cruzada fica a cargo do chamador, que tem acesso aos registros
 * de VaccineDose). Usado para sugerir vacinas ainda não cadastradas.
 */
export function deriveDueVaccinesForAge(
  catalogos: VacinaCatalogo[],
  birthDate: string,
  hoje: string,
): VacinaDevidaPorIdade[] {
  const idadeMeses = ageInMonths(birthDate, hoje);

  return catalogos
    .filter((catalogo) => catalogo.id !== 'outras')
    .filter((catalogo) => {
      const minOk = catalogo.idadeMinMeses === undefined || idadeMeses >= catalogo.idadeMinMeses;
      const maxOk = catalogo.idadeMaxMeses === undefined || idadeMeses <= catalogo.idadeMaxMeses;
      return minOk && maxOk;
    })
    .map((catalogo) => ({ catalogoId: catalogo.id, nome: catalogo.nome }));
}
