/**
 * A proposta de memória atravessando a verificação (M5).
 *
 * O TESTE QUE IMPORTA É O PRIMEIRO: proposta ruim não pode derrubar resposta
 * boa. São dois caminhos separados de propósito — uma resposta correta perdida
 * porque o modelo propôs um fato ruim seria a EPIC nova quebrando a entregue
 * (regra 5 da constituição). Por isso as duas afirmações vivem na MESMA
 * execução: o defeito que este arquivo previne é exatamente uma derrubar a
 * outra.
 */
const mockRunConversationTurn = jest.fn();
const mockRegenerateAnswer = jest.fn();
jest.mock('../conversationLoop', () => ({
  runConversationTurn: (...a: unknown[]) => mockRunConversationTurn(...a),
  regenerateAnswer: (...a: unknown[]) => mockRegenerateAnswer(...a),
}));

// `verificacao.ts` passou a importar a leitura da memoria (M6), que le o
// DynamoDB pela mesma porta das tools. O SDK publicado e ESM e o jest-expo o
// carrega como CommonJS, entao importa-lo aqui quebraria a suite inteira antes
// de qualquer assercao -- armadilha ja registrada no Bloco E.
//
// Mockar a LEITURA, e nao o SDK, e o recorte certo: estes testes sao sobre a
// D31, e a memoria tem suite propria.
jest.mock('../memoria/leitura', () => ({
  lerMemoria: jest.fn().mockResolvedValue([]),
  montarSystemPrompt: () => 'prompt-de-sistema',
}));

const mockBuildDegradedAnswer = jest.fn();
jest.mock('../degradedAnswer', () => ({
  buildDegradedAnswer: (...a: unknown[]) => mockBuildDegradedAnswer(...a),
}));

import { responderComVerificacao } from '../verificacao';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const ENTRADA = {
  message: 'pode responder mais curto?',
  history: [],
  identity: IDENTIDADE,
  modelId: 'm',
  guardrailId: 'g',
  guardrailVersion: '1',
  memoriaAtiva: true,
};

const LIMPA = 'Certo, vou responder mais curto. Leve suas dúvidas ao seu médico.';
const COM_POSOLOGIA = 'Tome 2000 UI por dia.';

const BOA = { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' };
const COM_DOSE = { texto: 'Tomo losartana 50 mg', tipo: 'ROTINA' };
const COM_JULGAMENTO = { texto: 'Tem dificuldade de seguir o tratamento', tipo: 'ROTINA' };

function turno(texto: string, memoria?: unknown) {
  return {
    ok: true,
    answer: { texto, citacoes: [], toolsUsadas: ['consultar_consultas'], memoria },
    transcript: { messages: [], toolOutputs: [{ name: 'consultar_consultas', output: {} }] },
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

describe('proposta ruim NÃO derruba resposta boa', () => {
  it('a resposta é entregue inteira e a proposta some — na mesma execução', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, COM_DOSE));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(LIMPA);
    expect(r.memoriaProposta).toBeUndefined();
    // E não houve segunda geração: a proposta ruim não é motivo de reprovação.
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('vale também para proposta de julgamento', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, COM_JULGAMENTO));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA');
    expect(r.memoriaProposta).toBeUndefined();
  });
});

describe('proposta boa chega inteira', () => {
  it('a proposta válida acompanha a resposta aprovada', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, BOA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.memoriaProposta).toEqual(BOA);
  });

  it('o texto da proposta chega sem reescrita', async () => {
    // O texto que a pessoa vê é o texto que será gravado. Qualquer reescrita
    // aqui esvaziaria o consentimento do art. 11, I.
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, BOA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.memoriaProposta?.texto).toBe('Prefiro respostas curtas');
  });

  it('resposta sem proposta nenhuma continua sendo o caminho normal', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA');
    expect(r.memoriaProposta).toBeUndefined();
  });
});

describe('a proposta não sobrevive a uma resposta que não foi aprovada', () => {
  it('resposta reprovada duas vezes cai em DEGRADADA e não leva proposta', async () => {
    // O caminho degradado não é gerado, é montado. Uma proposta pendurada nele
    // viria de um texto que foi descartado por quebrar as regras.
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA, BOA));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_POSOLOGIA, BOA));
    mockBuildDegradedAnswer.mockReturnValue({ texto: 'Seus registros:', citacoes: [] });

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('DEGRADADA');
    expect(r.memoriaProposta).toBeUndefined();
  });

  it('a proposta da SEGUNDA geração é a que vale quando ela é a aprovada', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA, COM_DOSE));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, BOA));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
    expect(r.memoriaProposta).toEqual(BOA);
  });
});

describe('a memória desligada', () => {
  it('com a memória desligada, nenhuma proposta é devolvida', async () => {
    // Art. 18, IX -- revogação do consentimento interrompe o tratamento dali
    // para frente. Um cartão aparecendo depois de a pessoa desligar seria a
    // revogação não valendo nada.
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, BOA));
    const r = await responderComVerificacao({ ...ENTRADA, memoriaAtiva: false });
    expect(r.memoriaProposta).toBeUndefined();
    expect(r.status).toBe('APROVADA');
  });

  it('ausência do sinalizador é tratada como memória ligada', async () => {
    // Ausência significa que o aplicativo é anterior a esta EPIC, ou que a
    // pessoa nunca mexeu no interruptor. Nenhum dos dois grava nada sozinho:
    // gravar depende de confirmação.
    const { memoriaAtiva: _ignorado, ...semSinalizador } = ENTRADA;
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, BOA));
    const r = await responderComVerificacao(semSinalizador);
    expect(r.memoriaProposta).toEqual(BOA);
  });
});
