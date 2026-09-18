/**
 * A D31 em codigo: A -> E -> C. Uma nova geracao, depois o dado sem prosa,
 * depois o silencio honesto.
 *
 * O teste que mais importa aqui e o que NAO aparece como cenario feliz: o
 * texto reprovado nao sai daqui de jeito nenhum, nem inteiro nem recortado.
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

import { INDISPONIVEL, responderComVerificacao } from '../verificacao';

const IDENTIDADE = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

const ENTRADA = {
  message: 'como está minha vitamina D?',
  history: [],
  identity: IDENTIDADE,
  modelId: 'm',
  guardrailId: 'g',
  guardrailVersion: '1',
};

/** Um resultado de laco bem-sucedido, com o texto e as tools que o produziram. */
/** A saida de verdade da tool de analitos: e dela que sai o indice das linhas
 *  citaveis, e por isso o duplo devolve a forma real e nao um objeto qualquer. */
const SAIDA_DE_ANALITO = {
  disponivel: true,
  nome: 'Vitamina D (25-OH)',
  series: [
    {
      momento: null,
      unidade: 'ng/mL',
      coletas: [
        {
          id: 'l-1',
          valor: 32.5,
          unidade: 'ng/mL',
          dataDaColeta: '2026-03-12',
          documentoId: 'doc-1',
        },
      ],
      naoComparaveis: [],
    },
  ],
};

function turno(texto: string, toolsUsadas: string[] = ['consultar_analito'], citacoes: unknown[] = []) {
  return {
    ok: true,
    answer: { texto, citacoes, toolsUsadas },
    transcript: {
      messages: [],
      toolOutputs: toolsUsadas.map((name) => ({
        name,
        output: name === 'consultar_analito' ? SAIDA_DE_ANALITO : { disponivel: true },
      })),
    },
    inputTokens: 10,
    outputTokens: 5,
    modelId: 'm',
  };
}

function turnoQueFalhou(message = 'Não consegui reunir tudo o que essa pergunta pede.') {
  return {
    ok: false,
    message,
    transcript: { messages: [], toolOutputs: [{ name: 'consultar_analito', output: {} }] },
  };
}

const LIMPA = 'Seu registro de março mostra 32,5 ng/mL. Leve seus exames ao seu médico.';
const COM_POSOLOGIA = 'Tome 2000 UI por dia.';

/**
 * A citacao que aponta para a linha que `SAIDA_DE_ANALITO` devolve.
 *
 * Ela e OBRIGATORIA em toda resposta que reporte valor de exame -- e a R4 no
 * sentido da omissao. Antes de a R4 existir, `LIMPA` era aprovada com
 * `citacoes: []`, e esse teste era a brecha escrita como expectativa: um numero
 * de exame sem nenhuma origem passava como APROVADA.
 */
const CITACAO_VALIDA = [{ resultId: 'l-1', documentId: 'doc-1', collectedAt: '2026-03-12' }];

beforeEach(() => {
  mockRunConversationTurn.mockReset();
  mockRegenerateAnswer.mockReset();
  mockBuildDegradedAnswer.mockReset().mockReturnValue(null);
});

describe('a verificacao de linguagem', () => {
  it('resposta limpa passa na primeira e e marcada como tal', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(LIMPA);
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('resposta reprovada gera DE NOVO, com o motivo como instrucao', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(
      turno('Não indico quantidade. Leve seus exames ao seu médico.'),
    );
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
    const [, , motivo] = mockRegenerateAnswer.mock.calls[0];
    expect(motivo).toMatch(/dose|posologia|quantidade|medica/i);
  });

  it('o bilhete fala da REGRA, nunca do sintoma', async () => {
    // "Nao escreva 500 mg" ensina o modelo a escrever "meio grama". O motivo
    // sai do campo `reason` da violacao, que a EPIC de regras escreve para ser
    // dito ao modelo.
    mockRunConversationTurn.mockResolvedValue(turno('Tome 500 mg.'));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    await responderComVerificacao(ENTRADA);
    const [, , motivo] = mockRegenerateAnswer.mock.calls[0];
    expect(motivo).not.toMatch(/500/);
    expect(motivo).not.toMatch(/mg/);
  });

  it('a segunda geracao recebe o transcript da primeira, e nao a entrada crua', async () => {
    // E o que faz a D31 nao refazer as consultas: o transcript ja carrega os
    // resultados das ferramentas.
    const primeira = turno(COM_POSOLOGIA);
    mockRunConversationTurn.mockResolvedValue(primeira);
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    await responderComVerificacao(ENTRADA);
    const [, transcript] = mockRegenerateAnswer.mock.calls[0];
    expect(transcript).toBe(primeira.transcript);
  });

  it('NAO ha terceira tentativa', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno('Tome 1000 UI.'));
    await responderComVerificacao(ENTRADA);
    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
  });
});

describe('reprovada duas vezes', () => {
  it('COM dado de ferramenta, cai no modo degradado', async () => {
    mockBuildDegradedAnswer.mockReturnValue({
      texto: 'Não consegui escrever uma resposta sobre isso.\n\n• 12/03/2026 — 32,5 ng/mL',
      citacoes: [{ resultId: 'l-1', documentId: 'doc-1', collectedAt: '2026-03-12' }],
    });
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno('Tome 1000 UI.'));

    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('DEGRADADA');
    // O dado aparece...
    expect(r.texto).toContain('32,5');
    // ...e o texto reprovado, nao.
    expect(r.texto).not.toMatch(/UI/);
    expect(r.citacoes).toHaveLength(1);
  });

  it('SEM dado de ferramenta, vira indisponibilidade honesta', async () => {
    mockBuildDegradedAnswer.mockReturnValue(null);
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA, []));
    mockRegenerateAnswer.mockResolvedValue(turno('Tome 1000 UI.', []));

    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('INDISPONIVEL');
    expect(r.texto).toBe(INDISPONIVEL);
    expect(r.texto).not.toMatch(/UI/);
  });

  it('a copy de indisponibilidade diz o que o aplicativo FAZ', async () => {
    // "Tente reformular" convida a repetir uma pergunta que sera recusada de
    // novo, e a pessoa conclui que o aplicativo esta quebrado em vez de
    // entender que ele nao faz aquilo.
    expect(INDISPONIVEL).toMatch(/exames/i);
    expect(INDISPONIVEL).toMatch(/consultas/i);
    expect(INDISPONIVEL).toMatch(/medicamentos/i);
    expect(INDISPONIVEL).not.toMatch(/reformul/i);
  });

  it('o motivo tecnico da reprovacao NUNCA chega a pessoa', async () => {
    // Quem escreveu a posologia foi o modelo. Dizer isso a pessoa e acusatorio
    // e ensina a contornar.
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA, []));
    mockRegenerateAnswer.mockResolvedValue(turno('Tome 1000 UI.', []));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.texto.toLowerCase()).not.toMatch(/posologia|regra|r3|bloquead|viola/);
  });

  it('NUNCA remenda: o texto reprovado nao sai recortado', async () => {
    // Um texto remendado sobre saude nao foi escrito por ninguem -- nem por
    // uma pessoa, nem pelo modelo, que escreveu outra coisa.
    mockRunConversationTurn.mockResolvedValue(
      turno('Você tem anemia. Seu registro de março mostra 11,2 g/dL.'),
    );
    mockRegenerateAnswer.mockResolvedValue(turno('Você tem anemia.'));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.texto).not.toContain('11,2');
    expect(r.texto).not.toContain('anemia');
  });
});

describe('a classificacao da pergunta', () => {
  it('e feita pela TOOL usada, nao por adivinhacao sobre o texto', async () => {
    // Operacional: sem encaminhamento, e isso esta certo -- o aviso permanente
    // da tela ja cumpre o papel, e repetir vira rodape mecanico.
    mockRunConversationTurn.mockResolvedValue(
      turno('Sua próxima consulta é 24 de outubro.', ['consultar_consultas']),
    );
    expect((await responderComVerificacao(ENTRADA)).status).toBe('APROVADA');
  });

  it('pergunta clinica SEM encaminhamento e reprovada pela R2', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno('Seu registro de março mostra 32,5 ng/mL.', ['consultar_analito'], CITACAO_VALIDA),
    );
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    expect((await responderComVerificacao(ENTRADA)).status).toBe('APROVADA_NA_SEGUNDA');
  });

  it('sem tool nenhuma a pergunta e operacional', async () => {
    // "Bom dia" nao precisa de encaminhamento a profissional de saude.
    mockRunConversationTurn.mockResolvedValue(turno('Bom dia! Em que posso ajudar?', []));
    expect((await responderComVerificacao(ENTRADA)).status).toBe('APROVADA');
  });
});

describe('a R4 conferida depois do fato', () => {
  it('citacao que aponta para linha que nenhuma tool devolveu e reprovada', async () => {
    // Quem chamou SABE o que as tools devolveram, entao uma citacao inventada
    // e detectavel. Sem isso, a R4 seria so uma instrucao no prompt.
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, ['consultar_analito'], [
        { resultId: 'linha-inventada', documentId: 'doc-1', collectedAt: '2026-03-12' },
      ]),
    );
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
  });

  it('citacao que aponta para linha devolvida passa', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA),
    );
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA');
  });

  it('o bilhete da citacao inventada tambem fala da regra', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(LIMPA, ['consultar_analito'], [
        { resultId: 'linha-inventada', documentId: 'd', collectedAt: '2026-03-12' },
      ]),
    );
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    await responderComVerificacao(ENTRADA);
    const [, , motivo] = mockRegenerateAnswer.mock.calls[0];
    expect(motivo).toMatch(/ferramenta/i);
    expect(motivo).not.toContain('linha-inventada');
  });
});

describe('quando o laco nem chega a produzir texto', () => {
  it('o teto de iteracoes com dado de ferramenta cai no degradado', async () => {
    mockBuildDegradedAnswer.mockReturnValue({ texto: 'o dado', citacoes: [] });
    mockRunConversationTurn.mockResolvedValue(turnoQueFalhou());
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('DEGRADADA');
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('o bloqueio do guardrail NAO vira degradado nem indisponibilidade generica', async () => {
    // A mensagem do filtro e especifica e honesta; troca-la pela copy generica
    // esconderia da pessoa que houve um bloqueio, e nao um vazio.
    mockBuildDegradedAnswer.mockReturnValue({ texto: 'o dado', citacoes: [] });
    mockRunConversationTurn.mockResolvedValue({
      ok: false,
      bloqueadoPeloFiltro: true,
      message: 'Não consigo responder a essa mensagem.',
      transcript: { messages: [], toolOutputs: [] },
    });
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('INDISPONIVEL');
    expect(r.texto).toBe('Não consigo responder a essa mensagem.');
  });
});

describe('a R4 no sentido da OMISSAO', () => {
  it('valor de exame sem citacao nenhuma NAO e aprovado', async () => {
    // A brecha que esta EPIC fechou. `[].every(...)` e verdadeiro, entao a
    // conferencia de citacao aprovava a resposta que nao citava nada -- e um
    // numero de exame sem origem subia com status APROVADA.
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], []));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
  });

  it('a reprovacao por omissao segue a D31: UMA segunda geracao, com bilhete de REGRA', async () => {
    // O caminho continua valendo, e e o que a spec pede que se confirme: a
    // omissao de R4 nao vira degradado direto. Ela rende uma nova geracao com o
    // motivo em maos, como qualquer outra violacao.
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], []));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));
    await responderComVerificacao(ENTRADA);

    expect(mockRegenerateAnswer).toHaveBeenCalledTimes(1);
    const [, , motivo] = mockRegenerateAnswer.mock.calls[0];
    expect(motivo).toMatch(/origem|ferramenta/i);
    // Fala da regra, nunca do sintoma: repetir o numero ensinaria o modelo a
    // escrever o mesmo valor por extenso.
    expect(motivo).not.toContain('32,5');
    expect(motivo).not.toContain('ng/mL');
  });

  it('reprovada DUAS vezes por omissao cai no degradado, e o texto sem origem nao sai', async () => {
    mockBuildDegradedAnswer.mockReturnValue({
      texto: 'O dado, sem prosa: 12/03/2026 — 32,5 ng/mL',
      citacoes: CITACAO_VALIDA,
    });
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], []));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], []));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('DEGRADADA');
    // O dado do degradado vem da ferramenta e leva citacao; o texto reprovado,
    // que trazia o mesmo numero sem origem, nao aparece.
    expect(r.citacoes).toEqual(CITACAO_VALIDA);
    expect(r.texto).not.toContain('Leve seus exames');
  });

  const COM_NUMERO_DO_PAPEL =
    'No papel que você enviou, a hemoglobina está 12,1 g/dL. Vale levar ao seu médico.';

  it('com anexo pontual no turno, o numero do papel TEM origem', async () => {
    // D15: o anexo passa pelo OCR e NAO grava dado clinico, entao nao existe
    // linha citavel para ele. Exigir citacao aqui faria "me explica este papel
    // aqui" cair no degradado toda vez -- a EPIC nova quebrando a entregue
    // (regra 5 da constituicao). O papel esta na mao de quem perguntou, e foi
    // essa pessoa quem o mandou: a origem existe, so nao esta no banco.
    mockRunConversationTurn.mockResolvedValue(turno(COM_NUMERO_DO_PAPEL, []));
    // A segunda geracao fica armada de proposito: se a R4 reprovar o numero do
    // papel, a falha aparece como status errado, e nao como um erro de mock.
    mockRegenerateAnswer.mockResolvedValue(turno('Não tenho esse exame registrado.', []));

    const r = await responderComVerificacao({ ...ENTRADA, attachmentText: 'Hemoglobina 12,1 g/dL' });
    expect(r.status).toBe('APROVADA');
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('SEM anexo, a mesma resposta sem citacao nao passa', async () => {
    // O par do teste de cima, e ele e o que da sentido ao outro: prova que quem
    // aprovou foi o anexo, e nao o texto.
    mockRunConversationTurn.mockResolvedValue(turno(COM_NUMERO_DO_PAPEL, []));
    mockRegenerateAnswer.mockResolvedValue(turno('Não tenho esse exame registrado.', []));
    const r = await responderComVerificacao(ENTRADA);
    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
  });
});
