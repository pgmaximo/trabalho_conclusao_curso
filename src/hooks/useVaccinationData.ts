/**
 * Resumo do arquivo:
 * Hook que busca as doses de vacina reais do usuário (VaccineDose) e deriva as
 * seções "Próximas recomendadas" (pendente/atrasada) e "Histórico de doses"
 * (aplicada), além da campanha institucional ativa. Status nunca é lido de um
 * campo persistido — sempre calculado a partir de appliedDate/dueDate (ver
 * specs/04-ia-perfil-vacinacao/carteira-vacinacao/plan.md §3).
 */
import { useMemo } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { getActiveVaccinationCampaign } from '@/config/vaccinationCampaigns';
import { listVaccineDosesForUser, type VaccineDoseRecord } from '@/services/vaccinationService';
import type { VaccinationSnapshot, VaccineDoseItem } from '@/types/models';

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function buildDescription(record: VaccineDoseRecord, applied: boolean): string {
  if (applied) {
    return record.doseNumber ? `${record.name} · ${record.doseNumber}ª dose` : record.name;
  }

  if (record.isCampaign && record.dueDate) {
    return `Dose anual · campanha até ${formatDateForDisplay(record.dueDate)}`;
  }

  if (record.recommendedIntervalYears) {
    return `Reforço a cada ${record.recommendedIntervalYears} anos`;
  }

  return record.dueDate ? `Recomendada até ${formatDateForDisplay(record.dueDate)}` : 'Recomendada';
}

export function mapToItem(record: VaccineDoseRecord, today: string = getTodayDate()): VaccineDoseItem {
  const applied = Boolean(record.appliedDate);
  const isLate = !applied && Boolean(record.dueDate) && record.dueDate! < today;

  return {
    id: record.id,
    name: record.name,
    doseNumber: record.doseNumber ?? undefined,
    status: applied ? 'aplicada' : isLate ? 'atrasada' : 'pendente',
    description: buildDescription(record, applied),
    appliedDate: record.appliedDate ?? undefined,
    location: record.location ?? undefined,
    dueDate: record.dueDate ?? undefined,
  };
}

/**
 * Deriva "Próximas recomendadas" (ordenado por dueDate asc) e "Histórico de
 * doses" (ordenado por appliedDate desc) a partir dos registros crus. Separado
 * de fetchVaccination para ser testável sem mockar a chamada assíncrona.
 */
export function deriveVaccinationLists(
  records: VaccineDoseRecord[],
  today: string = getTodayDate(),
): Pick<VaccinationSnapshot, 'upcoming' | 'history'> {
  const items = records.map((record) => mapToItem(record, today));

  const upcoming = items
    .filter((item) => item.status !== 'aplicada')
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  const history = items
    .filter((item) => item.status === 'aplicada')
    .sort((a, b) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? ''));

  return { upcoming, history };
}

async function fetchVaccination(): Promise<VaccinationSnapshot> {
  const records = await listVaccineDosesForUser();
  const { upcoming, history } = deriveVaccinationLists(records);
  const activeCampaign = getActiveVaccinationCampaign();

  return {
    upcoming,
    history,
    activeCampaignMessage: activeCampaign?.message ?? null,
  };
}

export function useVaccinationData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchVaccination);

  const snapshot = useMemo<VaccinationSnapshot>(
    () => data ?? { upcoming: [], history: [], activeCampaignMessage: null },
    [data],
  );

  return {
    upcoming: snapshot.upcoming,
    history: snapshot.history,
    activeCampaignMessage: snapshot.activeCampaignMessage,
    isEmpty: snapshot.upcoming.length === 0 && snapshot.history.length === 0,
    isLoading: status === 'loading',
    errorMessage,
    retry,
  };
}
