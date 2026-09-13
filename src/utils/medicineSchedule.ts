import type { MedicineRecord } from '@/services/medicineService';

const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function getLocalIsoDate(reference = new Date()): string {
  return [
    reference.getFullYear(),
    String(reference.getMonth() + 1).padStart(2, '0'),
    String(reference.getDate()).padStart(2, '0'),
  ].join('-');
}

function minutesFromTime(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes < 24 * 60 ? minutes : null;
}

function daysBetween(start: string, end: string): number {
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

export function isMedicineScheduledOnDate(medicine: MedicineRecord, date: string): boolean {
  if (!medicine.active || medicine.startDate > date || (medicine.endDate && medicine.endDate < date)) return false;
  if (medicine.frequencyType !== 'SPECIFIC_DAYS') return true;
  const weekday = WEEKDAY_CODES[new Date(`${date}T12:00:00`).getDay()];
  return medicine.weekDays.includes(weekday);
}

/** Retorna os horarios reais previstos para um dia, inclusive "a cada X horas". */
export function getMedicineDoseTimesForDate(medicine: MedicineRecord, date: string): string[] {
  if (!isMedicineScheduledOnDate(medicine, date)) return [];
  if (medicine.frequencyType !== 'EVERY_X_HOURS') return [...medicine.times].sort();

  const intervalMinutes = (medicine.intervalHours ?? 0) * 60;
  const anchor = medicine.times[0];
  const anchorMinutes = anchor ? minutesFromTime(anchor) : null;
  if (!intervalMinutes || anchorMinutes === null) return [];

  const elapsedBeforeDate = daysBetween(medicine.startDate, date) * 24 * 60;
  if (elapsedBeforeDate < 0) return [];
  const times: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    const elapsed = elapsedBeforeDate + minute - anchorMinutes;
    if (elapsed >= 0 && elapsed % intervalMinutes === 0) {
      times.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
    }
  }
  return times;
}
