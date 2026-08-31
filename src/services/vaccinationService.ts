import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

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
  });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível salvar a vacina.');
  }

  if (!data) {
    throw new Error('Não foi possível salvar a vacina.');
  }

  return data;
}

export async function listVaccineDosesForUser(): Promise<VaccineDoseRecord[]> {
  const { data, errors } = await client.models.VaccineDose.list();

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar a carteira de vacinação.');
  }

  return data ?? [];
}
