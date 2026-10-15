/**
 * Resumo do arquivo:
 * Ponto único de acesso à campanha de vacinação ativa, compartilhado entre a
 * tela de Vacinação (banner completo com dado real do PNI) e a tela de
 * Prevenção (banner de uma linha) — evita duas fontes divergentes do mesmo
 * aviso, mesma preocupação que motivou `src/config/vaccinationCampaigns.ts`
 * (agora substituído por este arquivo + as queries reais do backend).
 *
 * Diferente da tela de Vacinação, a Prevenção NÃO solicita permissão de
 * localização — usa apenas uma localização já cacheada anteriormente (se
 * houver), e cai para o recorte nacional quando não há nenhuma.
 */
import { loadCachedLocation } from '@/services/locationService';
import { fetchVaccinationCampaigns } from '@/services/vaccinationService';

function formatDateForDisplay(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}`;
}

/**
 * Mensagem de uma linha sobre a campanha de vacinação ativa (se houver),
 * com contagem real de doses quando a amostra do PNI alcançou o período.
 * Retorna `null` silenciosamente em qualquer falha — o banner institucional
 * nunca deve derrubar a tela de Prevenção nem a de Vacinação.
 */
export async function getActiveVaccinationCampaignMessage(): Promise<string | null> {
  try {
    const location = await loadCachedLocation();
    const { campanhas } = await fetchVaccinationCampaigns({ uf: location?.uf ?? null });
    const ativa = campanhas.find((campanha) => campanha.ativa);

    if (!ativa) {
      return null;
    }

    const janela =
      ativa.janelaInicio && ativa.janelaFim
        ? ` até ${formatDateForDisplay(ativa.janelaFim)}`
        : '';

    const regiao = ativa.ufReferencia ? `em ${ativa.ufReferencia}` : 'no Brasil';
    const contagem =
      ativa.dosesNoPeriodo !== null && ativa.dosesNoPeriodo !== undefined
        ? ` ${ativa.dosesNoPeriodo.toLocaleString('pt-BR')} doses registradas no período ${regiao} (amostra do PNI).`
        : '';

    return `${ativa.nome}${janela} nas unidades de saúde.${contagem}`;
  } catch {
    return null;
  }
}
