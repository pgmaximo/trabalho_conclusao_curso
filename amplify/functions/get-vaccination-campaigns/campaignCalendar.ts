/**
 * Resumo do arquivo:
 * Janelas oficiais das campanhas nacionais de vacinação de 2026 — conteúdo
 * institucional curado manualmente (não gerado por API; não há endpoint
 * público que devolva o calendário de campanhas em formato estruturado — ver
 * comentário de topo de src/data/calendarioNacionalVacinacao.ts). Cada
 * campanha cita a fonte oficial usada para confirmar as datas.
 *
 * Substitui src/config/vaccinationCampaigns.ts (Fase 5 do plano) — aqui as
 * janelas são cruzadas com dados REAIS de doses aplicadas do PNI
 * (campaignAggregator.ts), em vez de ser apenas um aviso estático.
 */

export type CampanhaDefinicao = {
  id: string;
  nome: string;
  janelaInicio: string; // YYYY-MM-DD
  janelaFim: string; // YYYY-MM-DD
  fonteUrl: string;
};

export const CAMPANHAS_VACINACAO_2026: CampanhaDefinicao[] = [
  {
    id: 'influenza-2026',
    nome: 'Campanha Nacional de Vacinação contra a Influenza',
    // Nordeste, Centro-Oeste, Sul e Sudeste — a região Norte tem janela própria
    // no 2º semestre (data exata não confirmada em fonte oficial até a
    // implementação desta feature, por isso não incluída aqui).
    janelaInicio: '2026-03-28',
    janelaFim: '2026-05-30',
    fonteUrl: 'https://www.gov.br/saude/pt-br/composicao/seidigi/demas/campanhas-de-vacinacao/vacinacao-contra-a-influenza',
  },
  {
    id: 'multivacinacao-2026',
    nome: 'Campanha Nacional de Multivacinação',
    janelaInicio: '2026-08-03',
    janelaFim: '2026-09-01',
    fonteUrl:
      'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/setembro/campanha-nacional-de-multivacinacao-encerra-nesta-terca-feira-1o-com-mais-de-8-milhoes-de-doses-aplicadas',
  },
];

/**
 * Campanhas cuja janela cobre a data `hoje`. Fora da janela, a campanha
 * simplesmente não aparece — nunca um banner fixo sem uma campanha realmente
 * ativa (mesmo princípio do antigo src/config/vaccinationCampaigns.ts).
 */
export function getCampanhasAtivas(hoje: string): CampanhaDefinicao[] {
  return CAMPANHAS_VACINACAO_2026.filter(
    (campanha) => campanha.janelaInicio <= hoje && hoje <= campanha.janelaFim,
  );
}
