/**
 * Resumo do arquivo:
 * Calendário Nacional de Vacinação do SUS, como dado estruturado. Conteúdo
 * normativo público (não dado do usuário) — curado manualmente a partir da
 * Instrução Normativa do Calendário Nacional de Vacinação 2026 do Ministério
 * da Saúde (https://www.gov.br/saude/pt-br/vacinacao/calendario), já que não
 * existe uma API pública que devolva o calendário em formato estruturado
 * (verificado: apidadosabertos.saude.gov.br expõe doses aplicadas, não o
 * calendário/esquema vacinal em si — ver src/services/vaccineScheduleService.ts
 * para como isso é usado, e src/data/pniVaccineCodes.ts para o de-para com o
 * PNI).
 *
 * Cada vacina carrega `fonteUrl` para a página oficial — a mesma disciplina de
 * citação já usada nas recomendações da USPSTF (RecommendationCard.tsx).
 *
 * Este arquivo é conteúdo, não lógica — a derivação de próxima dose/atraso
 * fica em vaccineScheduleService.ts (funções puras e testáveis).
 */

const CALENDARIO_FONTE_URL = 'https://www.gov.br/saude/pt-br/vacinacao/calendario';

export type DoseSpec = {
  ordem: number;
  rotulo: string; // "1ª dose", "Reforço aos 4 anos"
  // Idade recomendada para ESTA dose, em meses. Ausente quando a dose depende
  // apenas do intervalo em relação à anterior (ex. Hepatite B adulto).
  idadeMesesRecomendada?: number;
  // Intervalo mínimo (em dias) em relação à dose anterior da mesma série.
  // Ausente na primeira dose de cada série.
  intervaloMinimoDiasDaAnterior?: number;
};

export type VacinaCatalogo = {
  id: string;
  nome: string;
  doses: DoseSpec[];
  // Faixa etária de indicação rotineira, em meses (30 anos = 360, etc.).
  // Ausente = sem limite relevante para o cálculo (ex. dT, aplicável a vida toda).
  idadeMinMeses?: number;
  idadeMaxMeses?: number;
  // Reforços recorrentes após a série inicial completa (ex. dT = a cada 10 anos).
  reforcoIntervaloAnos?: number;
  // Dose única anual, independente de série (ex. Influenza) — não usa `doses`.
  anual?: boolean;
  grupos?: ('gestante' | 'idoso' | 'adolescente' | 'crianca' | 'adulto' | 'indigena' | 'profissional_saude')[];
  fonteUrl: string;
};

export const CALENDARIO_NACIONAL_VACINACAO: VacinaCatalogo[] = [
  {
    id: 'bcg',
    nome: 'BCG',
    doses: [{ ordem: 1, rotulo: 'Dose única', idadeMesesRecomendada: 0 }],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'hepatite-b',
    nome: 'Hepatite B',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 0 },
      { ordem: 2, rotulo: '2ª dose', intervaloMinimoDiasDaAnterior: 30 },
      { ordem: 3, rotulo: '3ª dose', intervaloMinimoDiasDaAnterior: 150 },
    ],
    grupos: ['crianca', 'adolescente', 'adulto'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'penta',
    nome: 'Pentavalente (DTP + Hib + HB)',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 2 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 4, intervaloMinimoDiasDaAnterior: 60 },
      { ordem: 3, rotulo: '3ª dose', idadeMesesRecomendada: 6, intervaloMinimoDiasDaAnterior: 60 },
    ],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'dtp-reforco',
    nome: 'DTP (reforço)',
    doses: [
      { ordem: 1, rotulo: 'Reforço aos 15 meses', idadeMesesRecomendada: 15 },
      { ordem: 2, rotulo: 'Reforço aos 4 anos', idadeMesesRecomendada: 48, intervaloMinimoDiasDaAnterior: 180 },
    ],
    idadeMaxMeses: 84,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'vip',
    nome: 'Poliomielite inativada (VIP)',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 2 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 4, intervaloMinimoDiasDaAnterior: 60 },
      { ordem: 3, rotulo: '3ª dose', idadeMesesRecomendada: 6, intervaloMinimoDiasDaAnterior: 60 },
    ],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'rotavirus',
    nome: 'Rotavírus humano',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 2 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 4, intervaloMinimoDiasDaAnterior: 30 },
    ],
    idadeMaxMeses: 8,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'pneumo-20v',
    nome: 'Pneumocócica 20-valente',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 2 },
      { ordem: 2, rotulo: 'Reforço', idadeMesesRecomendada: 12, intervaloMinimoDiasDaAnterior: 60 },
    ],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'meningo-c',
    nome: 'Meningocócica C',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 3 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 5, intervaloMinimoDiasDaAnterior: 30 },
    ],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'meningo-acwy',
    nome: 'Meningocócica ACWY',
    doses: [
      { ordem: 1, rotulo: 'Dose única', idadeMesesRecomendada: 12 },
      { ordem: 2, rotulo: 'Reforço na adolescência', idadeMesesRecomendada: 132 },
    ],
    idadeMinMeses: 12,
    idadeMaxMeses: 180,
    grupos: ['crianca', 'adolescente'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'febre-amarela',
    nome: 'Febre amarela',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 9 },
      { ordem: 2, rotulo: 'Reforço', idadeMesesRecomendada: 48, intervaloMinimoDiasDaAnterior: 30 },
    ],
    grupos: ['crianca', 'adolescente', 'adulto'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'scr',
    nome: 'Sarampo, caxumba e rubéola (SCR)',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 12 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 15, intervaloMinimoDiasDaAnterior: 30 },
    ],
    idadeMaxMeses: 720,
    grupos: ['crianca', 'adolescente', 'adulto'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'varicela',
    nome: 'Varicela',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 15 },
      { ordem: 2, rotulo: '2ª dose', idadeMesesRecomendada: 48, intervaloMinimoDiasDaAnterior: 90 },
    ],
    idadeMaxMeses: 84,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'hepatite-a',
    nome: 'Hepatite A',
    doses: [{ ordem: 1, rotulo: 'Dose única', idadeMesesRecomendada: 15 }],
    idadeMaxMeses: 60,
    grupos: ['crianca'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'hpv4',
    nome: 'HPV quadrivalente',
    doses: [{ ordem: 1, rotulo: 'Dose única', idadeMesesRecomendada: 108 }],
    idadeMinMeses: 108,
    idadeMaxMeses: 180,
    grupos: ['adolescente'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'dengue',
    nome: 'Dengue',
    doses: [
      { ordem: 1, rotulo: '1ª dose', idadeMesesRecomendada: 120 },
      { ordem: 2, rotulo: '2ª dose', intervaloMinimoDiasDaAnterior: 90 },
    ],
    idadeMinMeses: 120,
    idadeMaxMeses: 168,
    grupos: ['crianca', 'adolescente'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'dt',
    nome: 'Dupla adulto (dT)',
    doses: [
      { ordem: 1, rotulo: '1ª dose' },
      { ordem: 2, rotulo: '2ª dose', intervaloMinimoDiasDaAnterior: 60 },
      { ordem: 3, rotulo: '3ª dose', intervaloMinimoDiasDaAnterior: 60 },
    ],
    idadeMinMeses: 84,
    reforcoIntervaloAnos: 10,
    grupos: ['adolescente', 'adulto', 'idoso'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'dtpa',
    nome: 'dTpa (gestante)',
    doses: [{ ordem: 1, rotulo: 'A partir da 20ª semana de gestação' }],
    grupos: ['gestante'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'influenza',
    nome: 'Influenza (gripe)',
    doses: [],
    anual: true,
    grupos: ['crianca', 'adolescente', 'adulto', 'idoso', 'gestante'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'covid-19',
    nome: 'COVID-19',
    doses: [
      { ordem: 1, rotulo: '1ª dose' },
      { ordem: 2, rotulo: '2ª dose', intervaloMinimoDiasDaAnterior: 21 },
      { ordem: 3, rotulo: '3ª dose', intervaloMinimoDiasDaAnterior: 30 },
    ],
    reforcoIntervaloAnos: 1,
    grupos: ['crianca', 'adolescente', 'adulto', 'idoso', 'gestante'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'vsr',
    nome: 'Vírus sincicial respiratório (VSR)',
    doses: [{ ordem: 1, rotulo: 'A partir da 28ª semana de gestação' }],
    grupos: ['gestante'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
  {
    id: 'outras',
    nome: 'Outras vacinas',
    doses: [],
    grupos: ['crianca', 'adolescente', 'adulto', 'idoso', 'gestante'],
    fonteUrl: CALENDARIO_FONTE_URL,
  },
];

export function findVacinaCatalogo(id: string): VacinaCatalogo | undefined {
  return CALENDARIO_NACIONAL_VACINACAO.find((v) => v.id === id);
}
