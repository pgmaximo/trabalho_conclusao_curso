/**
 * Resumo do arquivo:
 * Client Amplify Data para a Carteira de Vacinação — CRUD de VaccineDose,
 * mais os wrappers das duas queries do backend com dados reais do governo
 * (getVaccinationCampaigns sobre o PNI/RNDS, getVaccinationSites sobre o
 * CNES — ver amplify/functions/get-vaccination-campaigns e
 * get-vaccination-sites). Segue o mesmo padrão de erro dos demais serviços
 * do app: desembrulha `{ data, errors }` e lança um Error em pt-BR.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { invalidateVaccinationCache } from '@/hooks/vaccinationCache';
import { derivePendingSeries } from '@/services/vaccineScheduleService';
import { syncVaccineReminder, removeVaccineReminder } from '@/services/vaccineReminderService';
import { findVacinaCatalogo } from '@/data/calendarioNacionalVacinacao';

const client = generateClient<Schema>();

export interface CreateVaccineDoseInput {
  name: string;
  doseNumber?: number;
  appliedDate?: string; // omitido = ainda não aplicada
  location?: string;
  dueDate?: string;
  recommendedIntervalYears?: number;
  isCampaign?: boolean;
  notes?: string;
  catalogId?: string;
  seriesTotal?: number;
  lot?: string;
  manufacturer?: string;
}

export interface VaccineDoseRecord {
  id: string;
  name: string;
  doseNumber?: number | null;
  appliedDate?: string | null;
  location?: string | null;
  dueDate?: string | null;
  recommendedIntervalYears?: number | null;
  isCampaign?: boolean | null;
  notes?: string | null;
  catalogId?: string | null;
  seriesTotal?: number | null;
  lot?: string | null;
  manufacturer?: string | null;
}

export async function createVaccineDose(input: CreateVaccineDoseInput): Promise<VaccineDoseRecord> {
  const { data, errors } = await client.models.VaccineDose.create({
    name: input.name,
    doseNumber: input.doseNumber ?? null,
    appliedDate: input.appliedDate ?? null,
    location: input.location ?? null,
    dueDate: input.dueDate ?? null,
    recommendedIntervalYears: input.recommendedIntervalYears ?? null,
    isCampaign: input.isCampaign ?? false,
    notes: input.notes ?? null,
    catalogId: input.catalogId ?? null,
    seriesTotal: input.seriesTotal ?? null,
    lot: input.lot ?? null,
    manufacturer: input.manufacturer ?? null,
  });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível salvar a vacina.');
  }

  if (!data) {
    throw new Error('Não foi possível salvar a vacina.');
  }

  await invalidateVaccinationCache();
  return data;
}

export interface UpdateVaccineDoseInput extends Partial<CreateVaccineDoseInput> {
  id: string;
}

export async function updateVaccineDose(input: UpdateVaccineDoseInput): Promise<VaccineDoseRecord> {
  const { id, ...rest } = input;
  const { data, errors } = await client.models.VaccineDose.update({ id, ...rest });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível atualizar a vacina.');
  }

  if (!data) {
    throw new Error('Não foi possível atualizar a vacina.');
  }

  await invalidateVaccinationCache();
  await removeVaccineReminder(id); // dose atualizada (ex. marcada como aplicada) não precisa mais de lembrete
  return data;
}

export async function deleteVaccineDose(id: string): Promise<void> {
  const { errors } = await client.models.VaccineDose.delete({ id });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível excluir a vacina.');
  }

  await removeVaccineReminder(id);
  await invalidateVaccinationCache();
}

export async function listVaccineDosesForUser(): Promise<VaccineDoseRecord[]> {
  const { data, errors } = await client.models.VaccineDose.list();

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar a carteira de vacinação.');
  }

  return data ?? [];
}

/**
 * Registra a dose aplicada e, se a vacina do catálogo tiver doses futuras na
 * série, cria em cascata os registros pendentes (2ª, 3ª...) já com data
 * devida calculada e lembrete agendado — decisão do usuário: lembrete
 * automático da próxima dose ao registrar a atual.
 */
export async function registerAppliedDoseWithSeries(input: {
  catalogId: string;
  ordem: number;
  appliedDate: string;
  location?: string;
  lot?: string;
  manufacturer?: string;
  birthDate?: string;
}): Promise<VaccineDoseRecord[]> {
  const catalogo = findVacinaCatalogo(input.catalogId);
  const created: VaccineDoseRecord[] = [];

  const appliedRecord = await createVaccineDose({
    name: catalogo?.nome ?? input.catalogId,
    doseNumber: input.ordem,
    appliedDate: input.appliedDate,
    location: input.location,
    lot: input.lot,
    manufacturer: input.manufacturer,
    catalogId: input.catalogId,
    seriesTotal: catalogo?.doses.length,
  });
  created.push(appliedRecord);

  if (catalogo && catalogo.doses.length > 0) {
    const pending = derivePendingSeries(
      catalogo,
      { ordem: input.ordem, appliedDate: input.appliedDate },
      input.birthDate,
    );

    for (const dose of pending) {
      const pendingRecord = await createVaccineDose({
        name: catalogo.nome,
        doseNumber: dose.ordem,
        dueDate: dose.dueDate,
        catalogId: input.catalogId,
        seriesTotal: catalogo.doses.length,
      });
      created.push(pendingRecord);
      await syncVaccineReminder({ id: pendingRecord.id, name: catalogo.nome, dueDate: dose.dueDate });
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Campanhas (dados reais do PNI/RNDS) e unidades de saúde (dados reais do CNES)
// ---------------------------------------------------------------------------

export type VaccinationCampaignRecord = {
  catalogId: string;
  nome: string;
  ativa: boolean;
  janelaInicio?: string | null;
  janelaFim?: string | null;
  dosesNoPeriodo?: number | null;
  ufReferencia?: string | null;
  dataAsOf?: string | null;
  fonteUrl: string;
};

export async function fetchVaccinationCampaigns(args: {
  uf?: string | null;
  codigoMunicipio?: string | null;
}): Promise<{ campanhas: VaccinationCampaignRecord[]; amostragem?: string | null }> {
  const { data, errors } = await client.queries.getVaccinationCampaigns({
    uf: args.uf ?? undefined,
    codigoMunicipio: args.codigoMunicipio ?? undefined,
  });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar as campanhas de vacinação.');
  }

  // O tipo gerado pelo Amplify Data client para arrays de customType aninhado
  // vaza o tipo do schema builder em vez do tipo de dado plano — mesma
  // limitacao conhecida do Amplify Gen2 documentada em preventionService.ts.
  const rawCampanhas = (data?.campanhas ?? []) as unknown as (VaccinationCampaignRecord | null)[];

  return {
    campanhas: rawCampanhas.filter((c): c is VaccinationCampaignRecord => Boolean(c)),
    amostragem: data?.amostragem,
  };
}

export type VaccinationSiteRecord = {
  cnes: string;
  nome: string;
  bairro?: string | null;
  logradouro?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanciaKm?: number | null;
};

export async function fetchVaccinationSites(args: {
  codigoMunicipio: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<VaccinationSiteRecord[]> {
  const { data, errors } = await client.queries.getVaccinationSites({
    codigoMunicipio: args.codigoMunicipio,
    latitude: args.latitude ?? undefined,
    longitude: args.longitude ?? undefined,
  });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar as unidades de saúde próximas.');
  }

  const rawUnidades = (data?.unidades ?? []) as unknown as (VaccinationSiteRecord | null)[];
  return rawUnidades.filter((u): u is VaccinationSiteRecord => Boolean(u));
}
