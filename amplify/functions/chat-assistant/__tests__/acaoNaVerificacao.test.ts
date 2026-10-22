/**
 * Resumo do arquivo:
 * A acao proposta atravessando a verificacao (E11). Mesmo molde da memoria
 * (`memoriaNaVerificacao.test.ts`): proposta ruim nunca derruba resposta boa,
 * so resposta aprovada leva proposta, e -- novidade do E11 -- a acao vence a
 * memoria no mesmo turno, porque a acao foi pedida e a memoria nao.
 */
const mockRunConversationTurn = jest.fn();
const mockRegenerateAnswer = jest.fn();
jest.mock('../conversationLoop', () => ({
  runConversationTurn: (...a: unknown[]) => mockRunConversationTurn(...a),
  regenerateAnswer: (...a: unknown[]) => mockRegenerateAnswer(...a),
}));

// A leitura da memoria passa pelo SDK da AWS; mocka-la e o recorte certo, como
// em `memoriaNaVerificacao.test.ts`.
jest.mock('../memoria/leitura', () => ({
  lerMemoria: jest.fn().mockResolvedValue([]),
  montarSystemPrompt: () => 'prompt-de-sistema',
}));

const mockBuildDegradedAnswer = jest.fn();
jest.mock('../degradedAnswer', () => ({
  buildDegradedAnswer: (...a: unknown[]) => mockBuildDegradedAnswer(...a),
}));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { TEXTO_DA_ACAO } from '../acoes/fraseDaAcao';
import { responder, responderComVerificacao } from '../verificacao';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const ENTRADA = {
  message: 'marca retorno dia 30 as 14h e me chama de Pedro',
  history: [],
  identity: IDENTIDADE,
  modelId: 'm',
  guardrailId: 'g',
  guardrailVersion: '1',
  memoriaAtiva: true,
  hoje: '2026-10-20',
};

// O modelo nao fala do formulario (revisao do E11): quem diz que ele esta
// pronto e o aplicativo, e so quando o cartao sai.
const LIMPA = 'Para marcar, vá em Mais > Agenda > botão +.';
const COM_POSOLOGIA = 'Tome 2000 UI por dia.';

const ACAO = { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', quando: 'dia 30', hora: '14h' };
const ACAO_RESOLVIDA = {
  tipo: 'ABRIR_NOVO_AGENDAMENTO',
  campos: { appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
};
const MEMORIA = { texto: 'Me chame de Pedro', tipo: 'COMO_ME_CHAMAR' };

function turno(texto: string, extras: { acao?: unknown; memoria?: unknown } = {}) {
  return {
    ok: true,
    answer: { texto, citacoes: [], toolsUsadas: [], ...extras },
    transcript: { messages: [], toolOutputs: [] },
    inputTokens: 10,
    outputTokens: 5,
    modelId: 'm',
  };
}

beforeEach(() => {
  mockRunConversationTurn.mockReset();
  mockRegenerateAnswer.mockReset();
  mockBuildDegradedAnswer.mockReset().mockReturnValue(null);
});

describe('a acao na verificacao (E11)', () => {
  it('acao valida sai resolvida com a resposta aprovada', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: ACAO }));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.acaoProposta).toEqual(ACAO_RESOLVIDA);
  });

  it('acao sem campo que sobreviva some, e a resposta fica inteira', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'hemograma' } }));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(LIMPA);
    expect(r.acaoProposta).toBeUndefined();
  });

  it('com acao e memoria validas, so a acao sai', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: ACAO, memoria: MEMORIA }));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.acaoProposta).toEqual(ACAO_RESOLVIDA);
    expect(r.memoriaProposta).toBeUndefined();
  });

  it('so a memoria valida continua saindo como antes', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { memoria: MEMORIA }));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.memoriaProposta).toEqual(MEMORIA);
    expect(r.acaoProposta).toBeUndefined();
  });

  it('acao que nao sobrevive nao apaga a memoria valida', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'hemograma' }, memoria: MEMORIA }),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.memoriaProposta).toEqual(MEMORIA);
  });

  it('resposta degradada nunca leva acao', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA, { acao: ACAO }));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_POSOLOGIA, { acao: ACAO }));
    mockBuildDegradedAnswer.mockReturnValue({ texto: 'dado cru', citacoes: [] });

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('DEGRADADA');
    expect(r.acaoProposta).toBeUndefined();
  });

  it('sem o dia do turno, nao ha acao: o codigo nao chuta a data', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: ACAO }));
    const { hoje: _hoje, ...semHoje } = ENTRADA;

    const r = await responderComVerificacao(semHoje);

    expect(r.acaoProposta).toBeUndefined();
  });

  it('a acao aprovada na segunda geracao usa o mesmo dia', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, { acao: ACAO }));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
    expect(r.acaoProposta).toEqual(ACAO_RESOLVIDA);
  });

  it('o historico da pessoa conta, o do assistente nao', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', profissional: 'dra ana' } }),
    );

    const r = await responderComVerificacao({
      ...ENTRADA,
      message: 'dia 30',
      history: [
        { role: 'user', content: 'preciso marcar o retorno' },
        { role: 'assistant', content: 'Com a dra ana?' },
      ],
    });

    expect(r.acaoProposta).toEqual({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'retorno' } });
  });
});

describe('conversa retomada (revisao do E11, achado 5)', () => {
  it('a data dita numa mensagem antiga nao e resolvida contra hoje', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', quando: 'amanha' } }),
    );

    const r = await responderComVerificacao({
      ...ENTRADA,
      message: 'pode marcar',
      history: [
        { role: 'user', content: 'marca retorno amanha' },
        { role: 'assistant', content: 'Para marcar, vá em Mais > Agenda.' },
      ],
    });

    expect(r.acaoProposta).toEqual({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'retorno' } });
  });
});

describe('a janela do historico (revisao do E11)', () => {
  // O modelo so ve as ultimas 12 mensagens. Um campo "confirmado" por uma fala
  // que ele nunca viu foi inventado e casou por acaso.
  it('fala da pessoa fora da janela que o modelo ve nao confirma campo', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', profissional: 'dra ana' } }),
    );
    const antigas = [{ role: 'user' as const, content: 'marca o retorno com a dra ana' }];
    const recentes = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? 'assistant' : 'user') as 'assistant' | 'user',
      content: i % 2 === 0 ? 'Certo.' : 'e o retorno?',
    }));

    const r = await responderComVerificacao({ ...ENTRADA, message: 'pode', history: [...antigas, ...recentes] });

    expect(r.acaoProposta).toEqual({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'retorno' } });
  });
});

describe('a passiva no turno com acao (revisao do E11)', () => {
  it('"Consulta marcada!" com acao pede a segunda geracao', async () => {
    mockRunConversationTurn.mockResolvedValue(turno('Consulta marcada!', { acao: ACAO }));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, { acao: ACAO }));

    const r = await responderComVerificacao(ENTRADA);

    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
  });

  // A4/B da conferencia no sandbox: o modelo mandou `acao` sem ninguem pedir,
  // com todos os campos vazios, e a passiva do dado das doses ("o das 8h foi
  // marcado") foi reprovada como se fosse cadastro. A segunda geracao apagou o
  // conteudo para escapar. So a acao que SAI (a valida) liga a regra.
  it('acao que nao sobrevive nao reprova a passiva honesta', async () => {
    const acaoVazia = { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: '', profissional: '', quando: '', hora: '' };
    mockRunConversationTurn.mockResolvedValue(
      turno('Losartana: 7 horários foram marcados; o das 8h de hoje foi marcado.', { acao: acaoVazia }),
    );

    const r = await responderComVerificacao({ ...ENTRADA, message: 'to tomando direitinho?' });

    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
    expect(r.status).toBe('APROVADA');
  });

  it('sem acao, a passiva honesta passa de primeira', async () => {
    mockRunConversationTurn.mockResolvedValue(turno('Sua consulta está marcada para sexta, às 14h.'));

    const r = await responderComVerificacao(ENTRADA);

    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
    expect(r.status).toBe('APROVADA');
  });
});

describe('o dia do turno (E11)', () => {
  // 02:30 em UTC do dia 21 ainda e 23:30 do dia 20 em Sao Paulo.
  const AGORA = new Date('2026-10-21T02:30:00Z');

  beforeEach(() => {
    jest.useFakeTimers({
      now: AGORA,
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval'],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('responder entrega o dia de Sao Paulo e devolve a acao ao app', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: ACAO }));

    const r = await responder({ message: 'marca retorno dia 30 as 14h', history: [] }, { identity: IDENTIDADE });

    expect(mockRunConversationTurn.mock.calls[0][0].hoje).toBe('2026-10-20');
    expect(r.acaoProposta).toEqual(ACAO_RESOLVIDA);
  });
});

/**
 * Revisao do E11, achado 1: a frase de que o formulario esta pronto e do
 * APLICATIVO, e so entra quando a acao sobreviveu. Escrita pelo modelo, ela
 * saia tambem quando a acao era descartada, e a pessoa lia "preparei o
 * formulario" sem botao nenhum.
 */
describe('a frase do formulario (revisao do E11)', () => {
  it('entra no fim quando a acao sai', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: ACAO }));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.texto).toBe(`${LIMPA} ${TEXTO_DA_ACAO}`);
  });

  it('nao entra quando a acao e descartada', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, { acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'hemograma' } }));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.texto).toBe(LIMPA);
  });

  it('nao entra duas vezes', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(`${LIMPA} ${TEXTO_DA_ACAO}`, { acao: ACAO }));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.texto).toBe(`${LIMPA} ${TEXTO_DA_ACAO}`);
  });

  // A5 da conferencia no sandbox: a frase do formulario escrita pelo MODELO
  // pede nova geracao com ou sem cartao; a do aplicativo, so sem cartao.
  it('sem cartao, "preparei as informacoes" pede nova geracao', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(`${LIMPA} Preparei as informações abaixo para facilitar.`));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA));
    const r = await responderComVerificacao(ENTRADA);
    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
    expect(r.texto).toBe(LIMPA);
  });

  it('com cartao, a frase do modelo tambem pede nova geracao', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(`${LIMPA} Preparei as informações abaixo para facilitar.`, { acao: ACAO }));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, { acao: ACAO }));
    const r = await responderComVerificacao(ENTRADA);
    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
    expect(r.texto).toBe(`${LIMPA} ${TEXTO_DA_ACAO}`);
  });

  it('sem cartao, nem a frase exata do aplicativo passa', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(`${LIMPA} ${TEXTO_DA_ACAO}`));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA));
    await responderComVerificacao(ENTRADA);
    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
  });

  it('a propria frase passa pelas regras de linguagem', () => {
    expect(checkLanguageRules(TEXTO_DA_ACAO, { questionKind: 'operacional' })).toEqual({ ok: true });
  });
});
