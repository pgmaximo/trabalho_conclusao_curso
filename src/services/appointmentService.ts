import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { getUserId } from '@/services/auth/userSessionService';
import { invalidateAppointmentsCache } from '@/hooks/appointmentsCache';

const client = generateClient<Schema>();

export type AppointmentType = 'CONSULTA' | 'EXAME' | 'CIRURGIA';

export interface CreateAppointmentInput {
  appointmentType: AppointmentType;
  appointmentName: string;
  professionalName: string;
  scheduledAt: string;
  address: string;
  observations?: string;
}

export interface AppointmentRecord {
  id: string;
  appointmentType: AppointmentType;
  appointmentName: string;
  professionalName: string;
  scheduledAt: string;
  address: string;
  observations?: string | null;
  createdAt?: string;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
  const userId = await getUserId();

  const { data, errors } = await client.models.Appointment.create({
    appointmentType: input.appointmentType,
    appointmentName: input.appointmentName,
    professionalName: input.professionalName,
    scheduledAt: input.scheduledAt,
    address: input.address,
    observations: input.observations || null,
  });

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível salvar o agendamento.');
  }

  if (!data) {
    throw new Error('Não foi possível salvar o agendamento.');
  }

  await invalidateAppointmentsCache();

  return {
    id: data.id,
    appointmentType: data.appointmentType as AppointmentType,
    appointmentName: data.appointmentName,
    professionalName: data.professionalName,
    scheduledAt: data.scheduledAt,
    address: data.address,
    observations: data.observations ?? null,
    createdAt: data.createdAt,
  };
}

export async function listAppointmentsForUser(): Promise<AppointmentRecord[]> {
  const { data, errors } = await client.models.Appointment.list();

  if (errors?.length) {
    const message = errors.map((error) => error.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível carregar a agenda.');
  }

  const items = (data ?? []).slice().sort((a, b) => {
    const aKey = a.scheduledAt ?? '';
    const bKey = b.scheduledAt ?? '';
    return String(aKey).localeCompare(String(bKey));
  });

  return items.map((item) => ({
    id: item.id,
    appointmentType: item.appointmentType as AppointmentType,
    appointmentName: item.appointmentName,
    professionalName: item.professionalName,
    scheduledAt: item.scheduledAt,
    address: item.address,
    observations: item.observations ?? null,
    createdAt: item.createdAt,
  }));
}

export async function getAppointmentById(id: string): Promise<AppointmentRecord | null> {
  const records = await listAppointmentsForUser();
  return records.find((r) => String(r.id) === String(id)) ?? null;
}

export async function updateAppointment(id: string, input: Partial<CreateAppointmentInput>): Promise<AppointmentRecord> {
  const updateData: Record<string, unknown> = {};
  if (input.appointmentType !== undefined) updateData.appointmentType = input.appointmentType;
  if (input.appointmentName !== undefined) updateData.appointmentName = input.appointmentName;
  if (input.professionalName !== undefined) updateData.professionalName = input.professionalName;
  if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.observations !== undefined) updateData.observations = input.observations || null;

  const { data, errors } = await client.models.Appointment.update({ id, ...updateData });

  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível atualizar o agendamento.');
  }

  if (!data) {
    throw new Error('Resposta inesperada do servidor ao atualizar o agendamento.');
  }

  await invalidateAppointmentsCache();

  return {
    id: data.id,
    appointmentType: data.appointmentType as AppointmentType,
    appointmentName: data.appointmentName,
    professionalName: data.professionalName,
    scheduledAt: data.scheduledAt,
    address: data.address,
    observations: data.observations ?? null,
    createdAt: data.createdAt,
  };
}

export async function deleteAppointment(id: string): Promise<void> {
  const { data, errors } = await client.models.Appointment.delete({ id });
  if (errors?.length) {
    const message = errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(message || 'Não foi possível deletar o agendamento.');
  }

  await invalidateAppointmentsCache();
}
