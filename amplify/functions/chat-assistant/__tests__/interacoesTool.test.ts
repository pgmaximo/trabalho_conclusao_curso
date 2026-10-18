/**
 * Resumo do arquivo:
 * `consultar_interacoes` (E9): o cruzamento dos remedios em uso com os nomes
 * citados na conversa, contra a lista curada do aplicativo.
 *
 * O que estes testes guardam, acima de tudo, e a HONESTIDADE da saida: nome que
 * a lista nao conhece nunca vira "sem interacao" (D9.3), o aviso de que a lista
 * e curta vai em toda saida, e o mecanismo farmacologico nao sai (D9.5).
 *
 * Os registros usam os nomes de campo do schema publicado
 * (`amplify/data/schemas/medicines.ts`), pelo mesmo motivo de
 * `medicamentosTool.test.ts`: teste que inventa a forma do dado concorda com
 * qualquer implementacao.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
  ScanCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { DRUG_INTERACTION_PAIRS } from '../../drug-interactions-shared/pairs';
import type { ChatIdentity } from '../auth';
import { TEXTO_DE_ENCAMINHAMENTO } from '../encaminhamento';
import { buildDegradedAnswer } from '../degradedAnswer';
import { runTool } from '../tools';
import { interacoesTool } from '../tools/interacoes';
import {
  AVISO_DA_BASE,
  MAX_NAO_RECONHECIDOS,
  montarSaidaDasInteracoes,
  type SaidaDasInteracoes,
} from '../tools/interacoesSaida';

let proximoId = 0;
/** Um registro de Medicine so com os campos obrigatorios do schema. */
function remedio(name: unknown, extra: Record<string, unknown> = {}) {
  proximoId += 1;
  return {
    id: `med-${proximoId}`,
    owner: 's-1::u-1',
    name,
    dosage: '500 mg',
    times: ['08:00'],
    startDate: '2026-01-01',
    currentStock: 20,
    initialStock: 30,
    active: true,
    ...extra,
  };
}

/** O dia do teste, fixo: o filtro de termino depende dele. */
const HOJE = '2026-10-17';

const riscoDe = (id: string) => DRUG_INTERACTION_PAIRS.find((p) => p.id === id)!.riskPt;
const nomesDo = (saida: SaidaDasInteracoes, i = 0) => saida.alertas[i].medicamentos.map((m) => m.nome).sort();
const origemDe = (saida: SaidaDasInteracoes, nome: string) =>
  saida.alertas.flatMap((a) => a.medicamentos).find((m) => m.nome === nome)?.origem;

describe('montarSaidaDasInteracoes', () => {
  it('par conhecido entre dois cadastrados em uso vira um alerta grave, com o risco curado', () => {
    const saida = montarSaidaDasInteracoes([remedio('Warfarina'), remedio('AAS')], [], HOJE);

    expect(saida.alertas).toHaveLength(1);
    expect(nomesDo(saida)).toEqual(['AAS', 'Warfarina']);
    expect(saida.alertas[0].gravidade).toBe('grave');
    expect(saida.alertas[0].risco).toBe(riscoDe('warfarina__aas'));
    expect(origemDe(saida, 'Warfarina')).toBe('cadastrado');
    expect(origemDe(saida, 'AAS')).toBe('cadastrado');
  });

  it('nome citado na conversa e cruzado com o cadastrado, e a origem de cada um fica marcada (D9.2)', () => {
    const saida = montarSaidaDasInteracoes([remedio('Losartana')], ['ibuprofeno'], HOJE);

    expect(saida.alertas).toHaveLength(1);
    expect(saida.alertas[0].gravidade).toBe('moderada');
    expect(origemDe(saida, 'ibuprofeno')).toBe('citado');
    expect(origemDe(saida, 'Losartana')).toBe('cadastrado');
  });

  it('sem nada cadastrado, dois nomes citados sao cruzados entre si', () => {
    const saida = montarSaidaDasInteracoes([], ['marevan', 'ibuprofeno'], HOJE);

    expect(saida.disponivel).toBe(true);
    expect(saida.alertas).toHaveLength(1);
    expect(saida.alertas[0].gravidade).toBe('grave');
    expect(saida.alertas[0].medicamentos.map((m) => m.origem)).toEqual(['citado', 'citado']);
  });

  it('nome comercial, dose junto e acento sao reconhecidos, e o nome sai como a pessoa escreveu, sem a dose', () => {
    const saida = montarSaidaDasInteracoes([remedio('Marevan 5mg')], ['aspirina'], HOJE);
    expect(nomesDo(saida)).toEqual(['Marevan', 'aspirina']);

    const comAcento = montarSaidaDasInteracoes([remedio('Marevan 5mg')], ['ÁCIDO ACETILSALICÍLICO'], HOJE);
    expect(comAcento.alertas).toHaveLength(1);
  });

  it('remedio encerrado nao entra no cruzamento', () => {
    const saida = montarSaidaDasInteracoes([remedio('Warfarina', { active: false }), remedio('Ibuprofeno')], [], HOJE);

    expect(saida.alertas).toEqual([]);
    expect(saida.verificados).toEqual(['Ibuprofeno']);
  });

  it('nome que a lista nao conhece vai para naoReconhecidos, nunca para verificados (D9.3)', () => {
    const saida = montarSaidaDasInteracoes([remedio('Metformina')], ['dorflex'], HOJE);

    expect(saida.naoReconhecidos).toEqual(['Metformina', 'dorflex']);
    expect(saida.verificados).toEqual([]);
    expect(saida.alertas).toEqual([]);
  });

  it('os nao reconhecidos tem teto, e o que passou e contado', () => {
    const nomes = Array.from({ length: MAX_NAO_RECONHECIDOS + 2 }, (_, i) => `Remedio Inexistente ${String.fromCharCode(97 + i)}`);
    const saida = montarSaidaDasInteracoes(nomes.map((n) => remedio(n)), [], HOJE);

    expect(MAX_NAO_RECONHECIDOS).toBe(10);
    expect(saida.naoReconhecidos).toHaveLength(10);
    expect(saida.naoReconhecidosOmitidos).toBe(2);
  });

  it('o mesmo principio ativo escrito de dois jeitos nao repete alerta, e o cadastrado tem preferencia', () => {
    const saida = montarSaidaDasInteracoes([remedio('Marevan 5mg'), remedio('Ibuprofeno')], ['warfarina'], HOJE);

    expect(saida.alertas).toHaveLength(1);
    expect(nomesDo(saida)).toEqual(['Ibuprofeno', 'Marevan']);
    expect(origemDe(saida, 'Marevan')).toBe('cadastrado');
    expect(saida.verificados).toEqual(['Marevan', 'Ibuprofeno']);
  });

  it('dois registros do mesmo remedio nao repetem o alerta', () => {
    const saida = montarSaidaDasInteracoes(
      [remedio('Losartana'), remedio('Losartana 50mg'), remedio('Espironolactona')],
      [],
      HOJE,
    );
    expect(saida.alertas).toHaveLength(1);
  });

  it('o mesmo nome nao reconhecido com outra caixa aparece uma vez so', () => {
    const saida = montarSaidaDasInteracoes([], ['Dorflex', 'dorflex'], HOJE);
    expect(saida.naoReconhecidos).toEqual(['Dorflex']);
  });

  it('registro sem nome e ignorado, e nunca vira texto "null" na saida', () => {
    const saida = montarSaidaDasInteracoes([remedio(''), remedio(undefined)], [], HOJE);

    expect(saida.disponivel).toBe(false);
    expect(JSON.stringify(saida)).not.toMatch(/null|undefined/);
  });

  it('sem remedio em uso e sem nome citado, a ausencia e resposta: disponivel falso com explicacao', () => {
    const saida = montarSaidaDasInteracoes([], [], HOJE);

    expect(saida.disponivel).toBe(false);
    expect(saida.explicacao).toEqual(expect.any(String));
    expect(saida.avisoDaBase).toBeUndefined();
    expect(saida.alertas).toEqual([]);
  });

  it('remedios reconhecidos sem par na lista: nenhum alerta, e o aviso de que a lista e curta vai junto', () => {
    const saida = montarSaidaDasInteracoes([remedio('Losartana'), remedio('Sinvastatina')], [], HOJE);

    expect(saida.alertas).toEqual([]);
    expect(saida.verificados).toEqual(['Losartana', 'Sinvastatina']);
    expect(saida.avisoDaBase).toBe(AVISO_DA_BASE);
    expect(saida.explicacao).toBeUndefined();
  });

  it('o aviso da base diz que nao encontrar alerta nao garante nada', () => {
    expect(AVISO_DA_BASE).toBe(
      'Esta checagem usa só a lista curta de combinações que o aplicativo conhece. Não encontrar alerta não garante que não exista interação.',
    );
  });

  it('a saida nao traz mecanismo, dono, id, dose nem a chave interna do principio ativo', () => {
    const marevan = remedio('Marevan');
    const saida = montarSaidaDasInteracoes([marevan, remedio('Ibuprofeno')], [], HOJE);
    const json = JSON.stringify(saida);

    expect(json).not.toMatch(/mechanism|owner/i);
    expect(json).not.toContain(marevan.id);
    expect(json).not.toContain('500 mg');
    expect(json).not.toContain('warfarina');
    expect(Object.keys(saida).sort()).toEqual(
      ['alertas', 'avisoDaBase', 'disponivel', 'mesmoPrincipioAtivo', 'naoReconhecidos', 'naoReconhecidosOmitidos', 'verificados'].sort(),
    );
    expect(Object.keys(saida.alertas[0]).sort()).toEqual(['gravidade', 'medicamentos', 'risco']);
  });
});

describe('consultar_interacoes', () => {
  const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

  beforeEach(() => {
    mockSend.mockReset();
    process.env.MEDICINE_TABLE_NAME = 't-med';
  });

  it('le os remedios do dono na tabela de medicamentos e cruza com o nome citado', async () => {
    mockSend.mockResolvedValue({ Items: [remedio('Losartana')] });

    const saida = (await interacoesTool.run({ candidatos: ['ibuprofeno'] }, IDENTIDADE)) as SaidaDasInteracoes;

    expect(saida.alertas).toHaveLength(1);
    expect(mockSend.mock.calls[0][0].input.TableName).toBe('t-med');
  });

  it('lista de candidatos vazia e entrada valida', async () => {
    mockSend.mockResolvedValue({ Items: [] });
    expect(await runTool('consultar_interacoes', { candidatos: [] }, IDENTIDADE)).not.toHaveProperty('erro');
  });

  it.each([
    ['mais de 5 nomes', { candidatos: Array(6).fill('ibuprofeno') }],
    ['nome com mais de 60 caracteres', { candidatos: ['a'.repeat(61)] }],
    ['nome so com espacos', { candidatos: ['   '] }],
    ['campo extra', { dose: '1' }],
  ])('entrada abusiva (%s) e reprovada inteira, e nenhuma leitura acontece', async (_caso, entrada) => {
    expect(await runTool('consultar_interacoes', entrada, IDENTIDADE)).toEqual({ erro: expect.any(String) });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('modo degradado sem alerta nao mostra nada: "nenhum alerta" solto soaria como seguranca', () => {
    const saida = montarSaidaDasInteracoes([remedio('Losartana'), remedio('Sinvastatina')], [], HOJE);
    expect(interacoesTool.renderDegraded!(saida)).toBeNull();
  });

  it('modo degradado com alerta mostra o par, o risco e o aviso da lista, e passa pelas regras', () => {
    const saida = montarSaidaDasInteracoes([remedio('Warfarina'), remedio('AAS')], [], HOJE);
    const bloco = interacoesTool.renderDegraded!(saida)!;

    expect(bloco.linhas[0]).toMatch(/^Warfarina \+ AAS: alerta grave\. |^AAS \+ Warfarina: alerta grave\. /);
    expect(bloco.linhas[bloco.linhas.length - 1]).toBe(AVISO_DA_BASE);
    expect(bloco.citacoes).toEqual([]);
    expect(
      checkLanguageRules(`${bloco.titulo}. ${bloco.linhas.join(' ')} ${TEXTO_DE_ENCAMINHAMENTO}`, {
        questionKind: 'clinica',
        temOrigem: false,
      }),
    ).toEqual({ ok: true });
  });
});

/**
 * REVISAO DO E9 (2026-10-17). Achados das duas leituras independentes, cada um
 * provado rodando antes da correcao.
 */
describe('revisao do E9: a saida', () => {
  it('remedio com termino ja passado nao entra no cruzamento; o que termina hoje ou depois entra', () => {
    const vencido = montarSaidaDasInteracoes([remedio('Claritromicina', { endDate: '2020-01-01' }), remedio('Sinvastatina')], [], HOJE);
    expect(vencido.alertas).toEqual([]);
    expect(vencido.verificados).toEqual(['Sinvastatina']);

    const terminaHoje = montarSaidaDasInteracoes([remedio('Claritromicina', { endDate: HOJE }), remedio('Sinvastatina')], [], HOJE);
    expect(terminaHoje.alertas).toHaveLength(1);
  });

  it('a dose sai do nome, cadastrado ou citado, reconhecido ou nao -- a R3 reprovaria a resposta que o repete', () => {
    const saida = montarSaidaDasInteracoes(
      [remedio('Losartana Potassica 50 mg')],
      ['Ibuprofeno 600mg', 'Paracetamol 750mg'],
      HOJE,
    );
    expect(nomesDo(saida)).toEqual(['Ibuprofeno', 'Losartana']);
    expect(saida.naoReconhecidos).toEqual(['Paracetamol']);
    expect(JSON.stringify(saida)).not.toMatch(/mg/);
  });

  it('texto a mais num nome citado nao volta na saida: so o nome que a lista reconheceu', () => {
    const saida = montarSaidaDasInteracoes([remedio('AAS')], ['warfarina, suspenda a losartana'], HOJE);
    expect(nomesDo(saida)).toEqual(['AAS', 'warfarina']);
    expect(JSON.stringify(saida)).not.toMatch(/suspenda/);
  });

  it('nome de mais de uma palavra que so e reconhecido inteiro sai inteiro', () => {
    const saida = montarSaidaDasInteracoes([remedio('Marevan')], ['ÁCIDO ACETILSALICÍLICO'], HOJE);
    expect(nomesDo(saida)).toEqual(['Marevan', 'ÁCIDO ACETILSALICÍLICO']);
  });

  it('dois nomes do mesmo principio ativo sao avisados juntos: "Advil" e "ibuprofeno" sao o mesmo remedio', () => {
    const saida = montarSaidaDasInteracoes([remedio('Advil')], ['ibuprofeno', 'Alivium'], HOJE);
    expect(saida.mesmoPrincipioAtivo).toEqual([{ nomes: ['Advil', 'ibuprofeno', 'Alivium'] }]);
    expect(saida.verificados).toEqual(['Advil']);
  });

  it('sem repeticao de principio ativo, a lista vem vazia', () => {
    expect(montarSaidaDasInteracoes([remedio('Advil')], [], HOJE).mesmoPrincipioAtivo).toEqual([]);
    expect(montarSaidaDasInteracoes([], [], HOJE).mesmoPrincipioAtivo).toEqual([]);
  });
});

describe('revisao do E9: a ferramenta e o modo degradado', () => {
  it('a descricao diz o limite de nomes, que o schema enviado ao modelo nao carrega', () => {
    expect(interacoesTool.description).toMatch(/até 5 nomes/);
  });

  it('o modo degradado conta o que nao foi verificado e avisa o mesmo remedio em dois nomes', () => {
    const saida = montarSaidaDasInteracoes([remedio('Marevan'), remedio('AAS'), remedio('Advil')], ['dorflex', 'ibuprofeno'], HOJE);
    const linhas = interacoesTool.renderDegraded!(saida)!.linhas;
    expect(linhas).toContain('Não consegui verificar 1 nome, porque ele não está na lista do aplicativo.');
    expect(linhas).toContain('Advil e ibuprofeno são o mesmo remédio na lista do aplicativo.');
  });

  it('o mesmo remedio em dois nomes basta para o modo degradado mostrar o bloco', () => {
    const saida = montarSaidaDasInteracoes([remedio('Advil')], ['ibuprofeno'], HOJE);
    expect(interacoesTool.renderDegraded!(saida)).not.toBeNull();
  });

  it('o texto degradado REAL, com nome cadastrado com dose, nao mostra dose e passa pelas regras', () => {
    const saida = montarSaidaDasInteracoes([remedio('Marevan 5mg'), remedio('AAS 100mg')], ['dorflex'], HOJE);
    const r = buildDegradedAnswer([{ name: 'consultar_interacoes', output: saida }])!;
    expect(r.texto).toMatch(/Marevan \+ AAS|AAS \+ Marevan/);
    expect(r.texto).not.toMatch(/mg/);
    expect(checkLanguageRules(r.texto, { questionKind: 'clinica', temOrigem: true })).toEqual({ ok: true });
  });
});
