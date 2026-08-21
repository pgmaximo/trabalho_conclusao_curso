/**
 * Sincronização com Google Agenda (2c) é hoje uma pendência técnica formal, não
 * uma feature ausente silenciosa: nenhum client OAuth/Calendar API existe no
 * repositório (o único uso de "Google" existente é login via Cognito/Google
 * Identity Provider em src/services/auth/google-auth.ts — autenticação, não
 * acesso à Calendar API). Implementar sync real exigiria OAuth com escopo
 * `https://www.googleapis.com/auth/calendar`, backend de refresh token e sync
 * bidirecional — trabalho de EPIC próprio, fora de escopo aqui (regra 2 da
 * constituição: nenhuma ação finge existir).
 */
export function isGoogleCalendarSyncAvailable(): boolean {
  return false;
}

export type GoogleCalendarSyncComingSoon = {
  title: string;
  message: string;
};

export function getGoogleCalendarSyncComingSoon(): GoogleCalendarSyncComingSoon {
  return {
    title: 'Sincronização com Google Agenda',
    message:
      'Essa integração ainda está em desenvolvimento. Por enquanto, nenhum compromisso é sincronizado automaticamente.',
  };
}
