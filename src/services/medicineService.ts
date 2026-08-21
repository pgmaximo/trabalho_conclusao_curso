import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { invalidateMedicinesCache } from '@/hooks/medicinesCache';

const client = generateClient<Schema>();

export type MedicineForm = 'PILL' | 'DROPS' | 'INJECTION' | 'OTHER';
export type MedicineFrequencyType = 'DAILY' | 'SPECIFIC_DAYS' | 'EVERY_X_HOURS';
export type MedicineUnit = 'COMP' | 'ML' | 'CAPS';

export interface MedicineInput {
  name: string;
  dosage: string;
  form?: MedicineForm;
  times: string[];
  frequencyType?: MedicineFrequencyType;
  weekDays?: string[];
  intervalHours?: number;
  startDate: string;
  endDate?: string | null;
  currentStock: number;
  initialStock: number;
  unit?: MedicineUnit;
  lowStockThreshold?: number;
  notes?: string;
  active?: boolean;
  takenToday?: string | null;
}

export interface MedicineRecord extends Omit<MedicineInput, 'weekDays' | 'times'> {
  id: string;
  times: string[];
  weekDays: string[];
  createdAt?: string;
}

export interface MedicineValidationError {
  field: string;
  message: string;
}

export function validateMedicineReminder(input: MedicineInput): MedicineValidationError[] {
  const errors: MedicineValidationError[] = [];

  if (!input.name.trim()) errors.push({ field: 'name', message: 'Informe o nome do medicamento.' });
  if (!input.dosage.trim()) errors.push({ field: 'dosage', message: 'Informe a dosagem.' });
  if (!input.form) errors.push({ field: 'form', message: 'Selecione a forma do medicamento.' });

  if (!input.times || input.times.length === 0) {
    errors.push({ field: 'times', message: 'Adicione ao menos um horário de dose.' });
  } else if (new Set(input.times).size !== input.times.length) {
    errors.push({ field: 'times', message: 'Horários de dose duplicados.' });
  }

  if (!input.frequencyType) {
    errors.push({ field: 'frequencyType', message: 'Selecione a frequência.' });
  } else if (input.frequencyType === 'SPECIFIC_DAYS' && (!input.weekDays || input.weekDays.length === 0)) {
    errors.push({ field: 'weekDays', message: 'Selecione ao menos um dia da semana.' });
  } else if (
    input.frequencyType === 'EVERY_X_HOURS' &&
    (!input.intervalHours || input.intervalHours <= 0)
  ) {
    errors.push({ field: 'intervalHours', message: 'Informe um intervalo de horas válido.' });
  }

  if (!input.startDate) errors.push({ field: 'startDate', message: 'Informe a data de início.' });

  if (input.currentStock === undefined || input.currentStock === null || input.currentStock < 0) {
    errors.push({ field: 'currentStock', message: 'Informe o estoque atual.' });
  }
  if (!input.unit) errors.push({ field: 'unit', message: 'Selecione a unidade.' });

  return errors;
}

function mapRecord(data: NonNullable<Awaited<ReturnType<typeof client.models.Medicine.get>>['data']>): MedicineRecord {
  return {
    id: data.id,
    name: data.name,
    dosage: data.dosage,
    form: (data.form ?? undefined) as MedicineForm | undefined,
    times: (data.times ?? []).filter((t): t is string => Boolean(t)),
    frequencyType: (data.frequencyType ?? undefined) as MedicineFrequencyType | undefined,
    weekDays: (data.weekDays ?? []).filter((d): d is string => Boolean(d)),
    intervalHours: data.intervalHours ?? undefined,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    currentStock: data.currentStock,
    initialStock: data.initialStock,
    unit: (data.unit ?? undefined) as MedicineUnit | undefined,
    lowStockThreshold: data.lowStockThreshold ?? undefined,
    notes: data.notes ?? undefined,
    active: data.active,
    takenToday: data.takenToday ?? null,
    createdAt: data.createdAt,
  };
}

export async function createMedicine(input: MedicineInput): Promise<MedicineRecord> {
  const errors = validateMedicineReminder(input);
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const { data, errors: apiErrors } = await client.models.Medicine.create({
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    form: input.form,
    times: input.times,
    frequencyType: input.frequencyType,
    weekDays: input.weekDays ?? [],
    intervalHours: input.intervalHours,
    startDate: input.startDate,
    endDate: input.endDate || null,
    currentStock: input.currentStock,
    initialStock: input.initialStock,
    unit: input.unit,
    lowStockThreshold: input.lowStockThreshold,
    notes: input.notes,
    active: input.active ?? true,
    takenToday: input.takenToday ?? null,
  });

  if (apiErrors?.length) {
    const message = apiErrors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível salvar o medicamento.');
  }
  if (!data) {
    throw new Error('Não foi possível salvar o medicamento.');
  }

  await invalidateMedicinesCache();

  return mapRecord(data);
}

export async function listMedicinesForUser(): Promise<MedicineRecord[]> {
  const { data, errors } = await client.models.Medicine.list();

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar os medicamentos.');
  }

  return (data ?? []).map(mapRecord);
}

export async function getMedicineById(id: string): Promise<MedicineRecord | null> {
  const records = await listMedicinesForUser();
  return records.find((r) => String(r.id) === String(id)) ?? null;
}

export async function updateMedicine(id: string, input: Partial<MedicineInput>): Promise<MedicineRecord> {
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.dosage !== undefined) updateData.dosage = input.dosage.trim();
  if (input.form !== undefined) updateData.form = input.form;
  if (input.times !== undefined) updateData.times = input.times;
  if (input.frequencyType !== undefined) updateData.frequencyType = input.frequencyType;
  if (input.weekDays !== undefined) updateData.weekDays = input.weekDays;
  if (input.intervalHours !== undefined) updateData.intervalHours = input.intervalHours;
  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate || null;
  if (input.currentStock !== undefined) updateData.currentStock = input.currentStock;
  if (input.initialStock !== undefined) updateData.initialStock = input.initialStock;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.lowStockThreshold !== undefined) updateData.lowStockThreshold = input.lowStockThreshold;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.takenToday !== undefined) updateData.takenToday = input.takenToday;

  const { data, errors } = await client.models.Medicine.update({ id, ...updateData });

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível atualizar o medicamento.');
  }
  if (!data) {
    throw new Error('Resposta inesperada do servidor ao atualizar o medicamento.');
  }

  await invalidateMedicinesCache();

  return mapRecord(data);
}

export async function deleteMedicine(id: string): Promise<void> {
  const { errors } = await client.models.Medicine.delete({ id });
  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível deletar o medicamento.');
  }

  await invalidateMedicinesCache();
}
