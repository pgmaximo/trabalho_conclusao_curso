import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { APP_TABS, getActiveTabId, MORE_MENU_ITEMS, ROUTE_TAB_MAP } from '@/constants/navigation';

// Defeito relatado pelo usuario: abrir um documento a partir da aba Exames
// (/document-detail) acendia "Inicio" na barra inferior, e nao "Exames". A
// causa era getActiveTabId cair em 'dashboard' para qualquer rota que ele nao
// conhecesse -- e toda tela nova do grupo (app) nascia desconhecida.

describe('getActiveTabId', () => {
  it.each([
    ['/document-detail', 'exams'],
    ['/analyte-series', 'exams'],
    ['/assistant-memory', 'assistant'],
  ])('mantem a aba de origem acesa em %s (%s)', (pathname, abaEsperada) => {
    expect(getActiveTabId(pathname)).toBe(abaEsperada);
  });

  it.each([
    ['/dashboard', 'dashboard'],
    ['/exams', 'exams'],
    ['/ai', 'assistant'],
    ['/medicines', 'medicines'],
    ['/more', 'more'],
    // Consultas saiu da barra e vive no hub Mais, como Prevencao e Vacinacao
    // (specs/00-fundacao/barra-de-navegacao/spec.md, D2).
    ['/appointments', 'more'],
    ['/prevention', 'more'],
    ['/vaccination', 'more'],
    ['/health-data', 'more'],
    ['/profile', 'more'],
  ])('continua acendendo a aba certa em %s (%s)', (pathname, abaEsperada) => {
    expect(getActiveTabId(pathname)).toBe(abaEsperada);
  });

  it('considera so o primeiro segmento do caminho', () => {
    expect(getActiveTabId('/exams/resultado')).toBe('exams');
    // Antes, a comparacao por prefixo de texto fazia '/aile' casar com '/ai'.
    expect(getActiveTabId('/aile')).toBe('dashboard');
  });
});

describe('ROUTE_TAB_MAP', () => {
  // A trava contra o defeito voltar: criar uma tela em src/app/(app)/ sem
  // dizer a qual aba ela pertence reprova este teste, em vez de a tela cair
  // calada em "Inicio".
  const PASTA_DO_GRUPO = join(__dirname, '..', 'src', 'app', '(app)');
  const rotasDoGrupo = readdirSync(PASTA_DO_GRUPO)
    .filter((arquivo) => /\.tsx?$/.test(arquivo) && !arquivo.startsWith('_'))
    .map((arquivo) => arquivo.replace(/\.tsx?$/, ''))
    .sort();

  it('tem uma aba declarada para cada tela do grupo (app), e nenhuma sobrando', () => {
    expect(Object.keys(ROUTE_TAB_MAP).sort()).toEqual(rotasDoGrupo);
  });

  it('so aponta para abas que existem na barra', () => {
    const idsDasAbas: string[] = APP_TABS.map((aba) => aba.id);
    for (const aba of Object.values(ROUTE_TAB_MAP)) {
      expect(idsDasAbas).toContain(aba);
    }
  });
});

// Opcao 1 da proposta (specs/00-fundacao/barra-de-navegacao/proposta.md): o
// Assistente vira aba, no centro, e Consultas vai para o topo do hub Mais.
describe('APP_TABS', () => {
  it('tem, nesta ordem, Inicio, Exames, Assistente, Remedios e Mais', () => {
    expect(APP_TABS.map((aba) => aba.label)).toEqual([
      'Início',
      'Exames',
      'Assistente',
      'Remédios',
      'Mais',
    ]);
  });

  it('leva a aba Assistente ao chat, com o icone de conversa', () => {
    const assistente = APP_TABS.find((aba) => aba.label === 'Assistente');
    expect(assistente).toMatchObject({ id: 'assistant', href: '/ai', icon: 'chatbubble-ellipses' });
  });
});

describe('MORE_MENU_ITEMS', () => {
  it('abre com Consultas, que continua levando a agenda', () => {
    expect(MORE_MENU_ITEMS[0]).toMatchObject({ label: 'Consultas', href: '/appointments', icon: 'calendar' });
  });

  it('nao repete o Assistente, que agora esta na barra', () => {
    expect(MORE_MENU_ITEMS.map((item) => item.href)).not.toContain('/ai');
  });
});
