import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { getUserId } from '@/services/auth/userSessionService';
import { invalidateExamsCache } from '@/hooks/useExamsData';

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

  await invalidateExamsCache();

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

  return (data ?? []).map((item) => ({
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
