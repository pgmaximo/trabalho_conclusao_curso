/**
 * Resumo do arquivo:
 * Config estática de campanhas de vacinação (conteúdo institucional, não dado do
 * usuário). Decisão desta fase (specs/04-ia-perfil-vacinacao/carteira-vacinacao/
 * plan.md §4): mantida manualmente, sem integração com fonte pública de dados
 * (ex. PNI/Ministério da Saúde) — pendência técnica registrada em GAP_ANALYSIS.md.
 * Compartilhada com a tela de Prevenção (3e), que consulta o mesmo arquivo em vez
 * de manter uma segunda fonte divergente do mesmo aviso.
 */

export type VaccinationCampaign = {
  id: string;
  title: string;
  message: string;
  activeFrom: string; // YYYY-MM-DD
  activeUntil: string; // YYYY-MM-DD
};

export const VACCINATION_CAMPAIGNS: VaccinationCampaign[] = [
  {
    id: 'gripe-2026',
    title: 'Campanha de vacinação contra a gripe',
    message: 'Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde.',
    activeFrom: '2026-04-01',
    activeUntil: '2026-09-30',
  },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Retorna a campanha ativa (se houver) para a data atual. Nunca retorna uma
 * campanha fora da janela `activeFrom`/`activeUntil` — o banner simplesmente não
 * renderiza sem uma campanha real configurada.
 */
export function getActiveVaccinationCampaign(): VaccinationCampaign | null {
  const todayStr = today();
  return (
    VACCINATION_CAMPAIGNS.find(
      (campaign) => campaign.activeFrom <= todayStr && todayStr <= campaign.activeUntil,
    ) ?? null
  );
}
