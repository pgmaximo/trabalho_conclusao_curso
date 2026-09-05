/**
 * Resumo do arquivo:
 * Hook que busca as doses de vacina reais do usuário (VaccineDose), agrupa
 * por vacina do catálogo ("Hepatite B · 2 de 3 doses"), e cruza com dados
 * reais do governo: campanhas ativas (PNI/RNDS, via
 * amplify/functions/get-vaccination-campaigns) e unidades de saúde próximas
 * (CNES, via get-vaccination-sites) — ambas filtradas pela localização do
 * usuário quando disponível (src/services/locationService.ts).
 *
 * Status nunca é lido de um campo persistido — sempre calculado a partir de
 * appliedDate/dueDate (ver specs/04-ia-perfil-vacinacao/carteira-vacinacao/plan.md
 * §3), agora usando o motor de src/services/vaccineScheduleService.ts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAsyncResource } from '@/hooks/useAsyncResource';
import { registerVaccinationRefetchCallback } from '@/hooks/vaccinationCache';
import { requestAndResolveLocation, loadCachedLocation, type UserLocation } from '@/services/locationService';
import {
  fetchVaccinationCampaigns,
  fetchVaccinationSites,
  listVaccineDosesForUser,
  type VaccineDoseRecord,
} from '@/services/vaccinationService';
import { findVacinaCatalogo } from '@/data/calendarioNacionalVacinacao';
import type {
  VaccinationCampaignView,
  VaccinationSiteView,
  VaccinationSnapshot,
  VaccineDoseItem,
  VaccineGroupView,
} from '@/types/models';

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
    catalogId: record.catalogId ?? undefined,
    lot: record.lot ?? undefined,
    manufacturer: record.manufacturer ?? undefined,
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

/**
 * Agrupa as doses por vacina do catálogo (catalogId) — registros legados sem
 * catalogId (cadastrados antes desta feature, com nome livre) formam cada um
 * seu próprio grupo, chaveado pelo nome, para não desaparecer da carteira.
 */
export function groupByVaccine(records: VaccineDoseRecord[], today: string = getTodayDate()): VaccineGroupView[] {
  const groups = new Map<string, { catalogId: string; nome: string; seriesTotal: number | null; records: VaccineDoseRecord[] }>();

  for (const record of records) {
    const key = record.catalogId ?? `legado:${record.name}`;
    const existing = groups.get(key);

    if (existing) {
      existing.records.push(record);
    } else {
      const catalogo = record.catalogId ? findVacinaCatalogo(record.catalogId) : undefined;
      groups.set(key, {
        catalogId: key,
        nome: catalogo?.nome ?? record.name,
        seriesTotal: record.seriesTotal ?? (catalogo?.doses.length || null),
        records: [record],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const items = group.records.map((record) => mapToItem(record, today));
      const dosesAplicadas = items
        .filter((item) => item.status === 'aplicada')
        .sort((a, b) => (a.doseNumber ?? 0) - (b.doseNumber ?? 0));
      const pendentes = items
        .filter((item) => item.status !== 'aplicada')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

      return {
        catalogId: group.catalogId,
        nome: group.nome,
        seriesTotal: group.seriesTotal,
        dosesAplicadas,
        proximaDose: pendentes[0] ?? null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function fetchVaccinationSnapshot(): Promise<VaccinationSnapshot> {
  const records = await listVaccineDosesForUser();
  const { upcoming, history } = deriveVaccinationLists(records);
  const groups = groupByVaccine(records);

  const location = await loadCachedLocation();

  const [campaignsResult, sites] = await Promise.all([
    fetchVaccinationCampaigns({ uf: location?.uf ?? null, codigoMunicipio: location?.codigoMunicipio ?? null }).catch(
      () => ({ campanhas: [] as VaccinationCampaignView[], amostragem: null }),
    ),
    location?.codigoMunicipio
      ? fetchVaccinationSites({
          codigoMunicipio: location.codigoMunicipio,
          latitude: location.latitude || null,
          longitude: location.longitude || null,
        }).catch(() => [] as VaccinationSiteView[])
      : Promise.resolve([] as VaccinationSiteView[]),
  ]);

  const campaigns: VaccinationCampaignView[] = campaignsResult.campanhas.map((c) => ({
    catalogId: c.catalogId,
    nome: c.nome,
    janelaInicio: c.janelaInicio ?? null,
    janelaFim: c.janelaFim ?? null,
    dosesNoPeriodo: c.dosesNoPeriodo ?? null,
    ufReferencia: c.ufReferencia ?? null,
    dataAsOf: c.dataAsOf ?? null,
    fonteUrl: c.fonteUrl,
  }));

  const sitesView: VaccinationSiteView[] = (sites as VaccinationSiteView[]).map((site) => ({
    cnes: site.cnes,
    nome: site.nome,
    bairro: site.bairro ?? null,
    logradouro: site.logradouro ?? null,
    distanciaKm: site.distanciaKm ?? null,
  }));

  return {
    upcoming,
    history,
    groups,
    campaigns,
    campaignSamplingNotice: campaignsResult.amostragem ?? null,
    sites: sitesView,
    hasLocation: Boolean(location?.codigoMunicipio),
  };
}

export function useVaccinationData() {
  const { data, status, errorMessage, retry } = useAsyncResource(fetchVaccinationSnapshot);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  useEffect(() => registerVaccinationRefetchCallback(retry), [retry]);

  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    setIsRequestingLocation(true);
    try {
      const location = await requestAndResolveLocation();
      // Só recarrega o snapshot inteiro (campanhas/UBS) quando a localização
      // de fato mudou — chamar retry() incondicionalmente aqui fazia a tela
      // inteira voltar para o skeleton de carregamento a cada tentativa,
      // inclusive quando falhava, o que na prática parecia "a página recarrega
      // e nada acontece" (o bug reportado): a tela piscava para o estado de
      // loading e depois voltava ao mesmo lugar, sem localização nenhuma.
      if (location) {
        retry();
      }
      return location;
    } finally {
      setIsRequestingLocation(false);
    }
  }, [retry]);

  const snapshot = useMemo<VaccinationSnapshot>(
    () =>
      data ?? {
        upcoming: [],
        history: [],
        groups: [],
        campaigns: [],
        campaignSamplingNotice: null,
        sites: [],
        hasLocation: false,
      },
    [data],
  );

  return {
    upcoming: snapshot.upcoming,
    history: snapshot.history,
    groups: snapshot.groups,
    campaigns: snapshot.campaigns,
    campaignSamplingNotice: snapshot.campaignSamplingNotice,
    sites: snapshot.sites,
    hasLocation: snapshot.hasLocation,
    isEmpty: snapshot.upcoming.length === 0 && snapshot.history.length === 0,
    isLoading: status === 'loading',
    isRequestingLocation,
    errorMessage,
    retry,
    requestLocation,
  };
}
