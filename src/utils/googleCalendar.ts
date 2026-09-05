export type GoogleCalendarAppointment = {
  scheduledAt?: string;
  time?: string;
  title: string;
  location?: string;
  observations?: string;
};

function parseDisplayDate(rawDate: string): Date | null {
  if (!rawDate) return null;

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const brMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const isoWithTime = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})/);
  if (isoWithTime) {
    const [, year, month, day, hour, minute] = isoWithTime;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  }

  const brWithTime = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*•?\s*(\d{1,2}):(\d{2})/);
  if (brWithTime) {
    const [, day, month, year, hour, minute] = brWithTime;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  }

  return null;
}

function parseTimeValue(rawTime?: string): [number, number] {
  const cleaned = rawTime?.trim() ?? '00:00';
  const [hourPart, minutePart] = cleaned.split(':');
  const hour = Number(hourPart ?? '0');
  const minute = Number(minutePart ?? '0');
  return [Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0];
}

export function buildGoogleCalendarUrl(appointment: GoogleCalendarAppointment): string {
  const scheduledAt = appointment.scheduledAt ? new Date(appointment.scheduledAt) : null;
  let start: Date;

  if (scheduledAt && !Number.isNaN(scheduledAt.getTime())) {
    start = scheduledAt;
  } else {
    const parsedFromDisplay = parseDisplayDate(appointment.time ?? '');
    if (parsedFromDisplay) {
      const [hour, minute] = parseTimeValue(appointment.time?.split('•').at(-1) ?? appointment.time);
      start = new Date(
        parsedFromDisplay.getFullYear(),
        parsedFromDisplay.getMonth(),
        parsedFromDisplay.getDate(),
        hour,
        minute,
      );
    } else {
      const fallbackDate = parseDisplayDate(appointment.scheduledAt ?? '');
      if (fallbackDate) {
        const [hour, minute] = parseTimeValue(appointment.scheduledAt?.split('T').at(1)?.slice(0, 5));
        start = new Date(
          fallbackDate.getFullYear(),
          fallbackDate.getMonth(),
          fallbackDate.getDate(),
          hour,
          minute,
        );
      } else {
        const defaultDate = new Date(2000, 0, 1, 9, 0, 0, 0);
        start = defaultDate;
      }
    }
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
