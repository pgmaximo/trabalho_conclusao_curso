import { buildGoogleCalendarUrl } from '../src/utils/googleCalendar';

describe('buildGoogleCalendarUrl', () => {
  it('uses the stored scheduledAt timestamp instead of a display-only time string', () => {
    const appointment = {
      id: 'apt-1',
      scheduledAt: '2026-09-02T15:00:00',
      time: '15:00',
      title: 'Consulta cardiológica',
      location: 'São Paulo',
      type: 'consulta' as const,
    };

    const url = buildGoogleCalendarUrl(appointment);
    const dates = new URL(url).searchParams.get('dates');

    expect(dates).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
    expect(dates).not.toContain('1999');
    expect(url).toContain('Consulta+cardiol%C3%B3gica');
  });

  it('includes observações in the Google Calendar event description', () => {
    const appointment = {
      id: 'apt-2',
      scheduledAt: '2026-09-02T15:00:00',
      time: '15:00',
      title: 'Exame de sangue',
      location: 'Laboratório Central',
      type: 'exame' as const,
      observations: 'Jejum de 8 horas obrigatório',
    };

    const url = buildGoogleCalendarUrl(appointment);
    const details = new URL(url).searchParams.get('details');

    expect(details).toContain('Exame de sangue');
    expect(details).toContain('Local: Laboratório Central');
    expect(details).toContain('Observações: Jejum de 8 horas obrigatório');
  });
});
