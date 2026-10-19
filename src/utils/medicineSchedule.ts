// Reexporta a fonte única dos horários esperados (E3); a regra mora em amplify/functions/medicine-schedule-shared/doseSchedule.ts.
import { LATE_DOSE_TOLERANCE_MINUTES, passouDaTolerancia } from '../../amplify/functions/medicine-schedule-shared/doseSchedule';

export {
  getMedicineDoseTimesForDate,
  horariosMarcadosNoCampoAntigo,
  isMedicineScheduledOnDate,
  LATE_DOSE_TOLERANCE_MINUTES,
  minutesFromTime,
  passouDaTolerancia,
} from '../../amplify/functions/medicine-schedule-shared/doseSchedule';

export function getLocalIsoDate(reference = new Date()): string {
  return [
    reference.getFullYear(),
    String(reference.getMonth() + 1).padStart(2, '0'),
    String(reference.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Diz se uma dose de HOJE, ainda não tomada, já passou do horário além da tolerância. */
export function isDoseLate(
  time: string,
  now: Date,
  toleranceMinutes: number = LATE_DOSE_TOLERANCE_MINUTES,
): boolean {
  return passouDaTolerancia(time, now.getHours() * 60 + now.getMinutes(), toleranceMinutes);
}
