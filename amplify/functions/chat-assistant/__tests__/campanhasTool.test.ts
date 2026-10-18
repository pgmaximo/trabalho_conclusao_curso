/**
 * `consultar_campanhas` (E8, P1 = A): a lista sai do MESMO calendario que a
 * tela de Vacinacao usa, com a data de Sao Paulo, sem I/O. O que estes testes
 * vigiam alem do caminho feliz: a virada do dia, o aviso da regiao Norte (que
 * tem calendario proprio para a gripe, ausente do calendario do app) e o que
 * NAO pode sair -- a contagem amostral de doses e qualquer dado do usuario.
 */
import type { ChatIdentity } from '../auth';
import { campanhasTool } from '../tools/campanhas';
import type { ContextoDoTurno } from '../types';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const NENHUMA_ATIVA =
  'Nenhuma campanha nacional de vacinação do calendário que o aplicativo acompanha está ativa hoje.';
const FONTE =
  'Calendário de campanhas nacionais de vacinação do Ministério da Saúde, acompanhado pelo aplicativo.';
const OBSERVACAO =
  'O aplicativo não registra o público de cada campanha. Quem pode se vacinar é informado pela unidade de saúde.';

const ctx = (uf: string | null): ContextoDoTurno => ({ local: { uf, codigoMunicipio: null } });

async function rodarEm(instante: string, contexto: ContextoDoTurno = { local: null }) {
  jest.setSystemTime(new Date(instante));
  return (await campanhasTool.run({}, IDENTIDADE, contexto)) as Record<string, any>;
}

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

describe('consultar_campanhas', () => {
  it('dentro da janela, devolve a campanha com nome e periodo', async () => {
    const saida = await rodarEm('2026-04-15T15:00:00Z');

    expect(saida).toEqual({
      disponivel: true,
      fonte: FONTE,
      observacao: OBSERVACAO,
      campanhas: [
        { nome: 'Campanha Nacional de Vacinação contra a Influenza', inicio: '2026-03-28', fim: '2026-05-30' },
      ],
    });
  });

  it('fora de todas as janelas, diz que nenhuma esta ativa', async () => {
    expect(await rodarEm('2026-10-17T15:00:00Z')).toEqual({
      disponivel: false,
      explicacao: NENHUMA_ATIVA,
      fonte: FONTE,
    });
  });

  it('23h30 do ultimo dia em Brasilia: a campanha ainda aparece', async () => {
    const saida = await rodarEm('2026-05-31T02:30:00Z');
    expect(saida.disponivel).toBe(true);
    expect(saida.campanhas[0].fim).toBe('2026-05-30');
  });

  it('UF do Norte traz o aviso, com e sem campanha ativa', async () => {
    expect((await rodarEm('2026-04-15T15:00:00Z', ctx('PA'))).avisoRegiao).toMatch(/região Norte/);
    expect((await rodarEm('2026-10-17T15:00:00Z', ctx('AM'))).avisoRegiao).toMatch(/região Norte/);
  });

  it('no Norte, a gripe nacional NAO aparece como ativa -- a janela de la e outra (revisao do E8)', async () => {
    // O comentario do calendario diz que a janela da influenza e do Nordeste,
    // Centro-Oeste, Sul e Sudeste. Listar a campanha como "ativa hoje" para
    // quem mora em Belem seria dizer que ha campanha onde nao ha.
    const abril = await rodarEm('2026-04-15T15:00:00Z', ctx('PA'));
    expect(abril.disponivel).toBe(false);
    expect(abril.avisoRegiao).toMatch(/região Norte/);

    const agosto = await rodarEm('2026-08-10T15:00:00Z', ctx('PA'));
    expect(agosto.campanhas.map((c: { nome: string }) => c.nome)).toEqual([
      'Campanha Nacional de Multivacinação',
    ]);
  });

  it('modo degradado mostra o aviso do Norte, com ou sem campanha (revisao do E8)', async () => {
    const semCampanha = campanhasTool.renderDegraded?.(await rodarEm('2026-04-15T15:00:00Z', ctx('PA')));
    expect(semCampanha?.linhas.join('\n')).toMatch(/região Norte/);

    const comCampanha = campanhasTool.renderDegraded?.(await rodarEm('2026-08-10T15:00:00Z', ctx('AM')));
    expect(comCampanha?.linhas[0]).toMatch(/Multivacinação/);
    expect(comCampanha?.linhas.at(-1)).toMatch(/região Norte/);
  });

  it('campanhas nao faz nenhuma leitura de banco nem de rede', async () => {
    const fetchEspiao = jest.fn();
    const original = global.fetch;
    global.fetch = fetchEspiao as unknown as typeof fetch;
    try {
      await rodarEm('2026-04-15T15:00:00Z', ctx('SP'));
      expect(fetchEspiao).not.toHaveBeenCalled();
    } finally {
      global.fetch = original;
    }
  });

  it('outra UF, ou nenhuma, nao traz aviso', async () => {
    expect(await rodarEm('2026-04-15T15:00:00Z', ctx('SP'))).not.toHaveProperty('avisoRegiao');
    expect(await rodarEm('2026-04-15T15:00:00Z', ctx(null))).not.toHaveProperty('avisoRegiao');
    expect(await rodarEm('2026-04-15T15:00:00Z')).not.toHaveProperty('avisoRegiao');
  });

  it('sem contexto nenhum (chamada direta), responde sem aviso e sem falhar', async () => {
    jest.setSystemTime(new Date('2026-04-15T15:00:00Z'));
    const saida = (await campanhasTool.run({}, IDENTIDADE)) as Record<string, unknown>;
    expect(saida.disponivel).toBe(true);
    expect(saida).not.toHaveProperty('avisoRegiao');
  });

  it('nao devolve contagem de doses, URL, id interno nem a UF do usuario', async () => {
    const texto = JSON.stringify(await rodarEm('2026-04-15T15:00:00Z', ctx('PA')));
    expect(texto).not.toMatch(/dosesNoPeriodo|amostra|http|influenza-2026|"PA"/);
  });

  it('a entrada nao aceita campo nenhum', () => {
    expect(campanhasTool.inputSchema.safeParse({ uf: 'SP' }).success).toBe(false);
    expect(campanhasTool.inputSchema.safeParse({}).success).toBe(true);
  });

  it('modo degradado: nome e periodo em pt-BR; nada quando nao ha campanha', async () => {
    const ativa = await rodarEm('2026-04-15T15:00:00Z');
    expect(campanhasTool.renderDegraded?.(ativa)).toEqual({
      titulo: 'Campanhas de vacinação ativas',
      linhas: ['Campanha Nacional de Vacinação contra a Influenza · de 28/03/2026 a 30/05/2026'],
      citacoes: [],
    });
    expect(campanhasTool.renderDegraded?.(await rodarEm('2026-10-17T15:00:00Z'))).toBeNull();
  });
});

describe('consultar_campanhas usa o calendario da tela, e nao uma copia', () => {
  it('a data de Sao Paulo vai para getCampanhasAtivas', async () => {
    const espiao = jest.fn().mockReturnValue([]);
    const ferramenta = comCalendario({ getCampanhasAtivas: espiao, CAMPANHAS_VACINACAO_2026: [] });

    jest.setSystemTime(new Date('2026-05-31T02:30:00Z'));
    await ferramenta.run({}, IDENTIDADE, { local: null });

    expect(espiao).toHaveBeenCalledWith('2026-05-30');
  });

  it('a abrangencia regional vem do DADO do calendario, nao do nome da campanha', async () => {
    // Uma campanha com outro id, mas marcada como fora da janela no Norte,
    // tambem sai da lista para quem mora la -- e o aviso aparece.
    const gripe = {
      id: 'gripe-2027',
      nome: 'Campanha contra a gripe',
      janelaInicio: '2026-04-01',
      janelaFim: '2026-04-30',
      fonteUrl: 'https://exemplo',
      ufsForaDaJanela: ['PA'],
    };
    const ferramenta = comCalendario({
      getCampanhasAtivas: () => [gripe],
      CAMPANHAS_VACINACAO_2026: [gripe],
    });

    const saida = (await ferramenta.run({}, IDENTIDADE, ctx('PA'))) as Record<string, unknown>;
    expect(saida.disponivel).toBe(false);
    expect(saida.avisoRegiao).toMatch(/região Norte/);

    const sp = (await ferramenta.run({}, IDENTIDADE, ctx('SP'))) as Record<string, unknown>;
    expect(sp.disponivel).toBe(true);
    expect(sp).not.toHaveProperty('avisoRegiao');
  });
});

/** A ferramenta carregada com um calendario de mentira, isolada dos outros testes. */
function comCalendario(calendario: Record<string, unknown>): typeof campanhasTool {
  let ferramenta: typeof campanhasTool | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../get-vaccination-campaigns/campaignCalendar', () => calendario);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ferramenta = (require('../tools/campanhas') as typeof import('../tools/campanhas')).campanhasTool;
  });
  return ferramenta!;
}
