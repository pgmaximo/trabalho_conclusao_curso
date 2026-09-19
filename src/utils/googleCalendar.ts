import { parseScheduledAt } from '@/services/agendaDateRange';

export type GoogleCalendarAppointment = {
  scheduledAt?: string;
  time?: string;
  title: string;
  location?: string;
  observations?: string;
};

export function buildGoogleCalendarUrl(appointment: GoogleCalendarAppointment): string {
  const start = parseScheduledAt(appointment.scheduledAt);

  if (!start) {
    throw new Error('Data inválida para sincronização com o Google Calendar.');
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const formatGoogleDate = (date: Date) => {
    const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return utcDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  };

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', appointment.title);
  const details = [
    appointment.title,
    appointment.location ? `Local: ${appointment.location}` : null,
    appointment.observations ? `Observações: ${appointment.observations}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  url.searchParams.set('details', details);
  url.searchParams.set('location', appointment.location || 'Agenda da aplicação');
  url.searchParams.set('dates', `${formatGoogleDate(start)}/${formatGoogleDate(end)}`);

  return url.toString();
}
