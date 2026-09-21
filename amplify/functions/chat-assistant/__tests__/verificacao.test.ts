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

import { TEXTO_DE_ENCAMINHAMENTO } from '../encaminhamento';
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

  it('pergunta clinica SEM encaminhamento recebe o encaminhamento do aplicativo', async () => {
    // Ate 2026-09-19 este caso gastava uma segunda geracao, e quando ela
    // tambem esquecia, a resposta inteira ia embora. A decisao A2 trocou isso:
    // a R2 sozinha nao derruba mais nada, porque o aplicativo sabe escrever a
    // frase que falta. O que continua valendo e a CLASSIFICACAO -- a pergunta
    // e clinica, e por isso o encaminhamento tem que estar na resposta.
    mockRunConversationTurn.mockResolvedValue(
      turno('Seu registro de março mostra 32,5 ng/mL.', ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toContain(TEXTO_DE_ENCAMINHAMENTO);
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
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

    const r = await responderComVerificacao({
      ...ENTRADA,
      anexo: { kind: 'texto', texto: 'Hemoglobina 12,1 g/dL' },
    });
    expect(r.status).toBe('APROVADA');
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('com anexo em PDF, que nao tem texto nenhum, o numero do papel TAMBEM tem origem', async () => {
    // A rota do PDF (D19) nao produz texto: os bytes vao direto ao modelo. Uma
    // conferencia de origem que procurasse TEXTO do anexo mandaria todo PDF
    // para o degradado -- justo o formato mais comum de laudo.
    mockRunConversationTurn.mockResolvedValue(turno(COM_NUMERO_DO_PAPEL, []));
    mockRegenerateAnswer.mockResolvedValue(turno('Não tenho esse exame registrado.', []));

    const r = await responderComVerificacao({
      ...ENTRADA,
      anexo: { kind: 'pdf', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) },
    });
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

/**
 * A C10 pede "a distribuicao das reprovacoes por regra (R1 a R4) e quantas sao
 * falso positivo". Em 2026-09-18 isso era IMPOSSIVEL de medir: a reprovacao nao
 * deixava rastro nenhum -- `verificacao.ts` nao tinha um `console.` sequer.
 *
 * O sintoma apareceu com o aplicativo na mao: a conversa devolveu "nao consegui
 * escrever uma resposta" e nem o log sabia por que. Sem estes registros, toda
 * reprovacao e uma caixa preta, e a C10 nao tem de onde tirar numero.
 *
 * O QUE NAO PODE SER REGISTRADO: o texto reprovado. Ele nao sai da funcao nem
 * para o log -- um log e lido por gente e guardado por tempo indeterminado, e
 * dado de saude num log e dado de saude vazado. So o identificador da regra.
 */
describe('rastro da reprovacao', () => {
  let info: jest.SpyInstance;

  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());

  function registros() {
    return info.mock.calls.map((c) => String(c[0]));
  }

  it('registra QUAL regra reprovou, nas duas geracoes', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_POSOLOGIA));
    mockBuildDegradedAnswer.mockReturnValue(null);

    await responderComVerificacao(ENTRADA);

    const tudo = registros().join('\n');
    expect(tudo).toContain('resposta-reprovada');
    expect(tudo).toMatch(/R[1-4]/);
    // As duas etapas deixam rastro, senao nao da para saber quantas a segunda
    // geracao salva -- que e o gatilho de reabertura da D31.
    expect(tudo).toContain('primeira');
    expect(tudo).toContain('segunda');
  });

  it('nunca registra o texto reprovado', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_POSOLOGIA));
    mockBuildDegradedAnswer.mockReturnValue(null);

    await responderComVerificacao(ENTRADA);

    for (const linha of registros()) {
      expect(linha).not.toContain('2000');
      expect(linha).not.toContain('Tome');
    }
  });

  it('nao registra reprovacao quando a resposta passa', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(registros().join('\n')).not.toContain('resposta-reprovada');
  });
});

/**
 * U1/U2/U3 -- a R2 classificava pelo eixo errado.
 *
 * Medido em producao, 2026-09-18: 2 de 2 reprovacoes foram R2, e as duas eram
 * falso positivo. "Faca uma visao de todos" foi classificada como CLINICA
 * porque `consultar_exames` estava na lista de tools clinicas -- nao porque a
 * resposta trouxesse medida nenhuma. O modelo escreveu um panorama, nao fechou
 * com o rodape, e a resposta foi descartada duas vezes.
 *
 * O eixo passa de "qual ferramenta rodou" para "o que a resposta diz". Isso
 * APERTA em um sentido e afrouxa em outro, e os dois tem caso aqui.
 */
describe('classificacao clinica (U2)', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());

  const regrasRegistradas = () => info.mock.calls.map((c) => String(c[0])).join('\n');

  // Comeca com "Encontrei" e nao com "Você tem" de proposito: a primeira
  // redacao deste caso usava "Você tem um Exame de sangue guardado" e falhava
  // -- nao pela R2, mas pela R3, cujo padrao de diagnostico e "você tem" SEM
  // exigir objeto nenhum. O caso estava errado, nao o codigo; corrigido aqui, e
  // o defeito da R3 que ele revelou virou tarefa propria (U3b, abaixo).
  const SO_DOCUMENTO = 'Encontrei um Exame de sangue guardado, de 18/09/2026.';
  const COM_MEDIDA_SEM_ENCAMINHAMENTO = 'Sua glicose foi 86 mg/dL nesse exame.';
  const CONDICAO_SEM_UNIDADE = 'No seu perfil está registrado que você tem asma.';

  it('resposta com so nome e data de documento NAO e reprovada pela R2', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(SO_DOCUMENTO, ['consultar_exames']));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(regrasRegistradas()).not.toContain('R2');
  });

  it('resposta COM medida continua obrigada ao encaminhamento, venha de onde vier', async () => {
    // O aperto: mesmo com uma tool que saiu da lista clinica, o texto manda.
    mockRunConversationTurn.mockResolvedValue(
      turno(COM_MEDIDA_SEM_ENCAMINHAMENTO, ['consultar_exames']),
    );
    mockRegenerateAnswer.mockResolvedValue(turno(COM_MEDIDA_SEM_ENCAMINHAMENTO, ['consultar_exames']));
    mockBuildDegradedAnswer.mockReturnValue(null);

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
    expect(regrasRegistradas()).toContain('R2');
  });

  it('dado de saude SEM unidade continua clinico -- a armadilha do perfil', async () => {
    // Condicao cronica e alergia sao dado de saude e nao tem unidade de
    // medida. So o texto nao bastaria: o classificador tem DUAS entradas.
    mockRunConversationTurn.mockResolvedValue(turno(CONDICAO_SEM_UNIDADE, ['consultar_perfil']));
    mockRegenerateAnswer.mockResolvedValue(turno(CONDICAO_SEM_UNIDADE, ['consultar_perfil']));
    mockBuildDegradedAnswer.mockReturnValue(null);

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
    expect(regrasRegistradas()).toContain('R2');
  });
});

/**
 * U18 -- o custo por turno, que a C10 pede e que nunca foi escrito.
 *
 * O dado ja chega do Bedrock e era descartado: `runConversationTurn` devolve
 * `inputTokens` e `outputTokens`, e ninguem os lia. Sem isto, "quanto custa um
 * turno" so se descobre pela fatura no fim do mes, que nao separa por pergunta.
 *
 * Uma linha POR GERACAO, e nao por turno: e a unica forma de saber o que a
 * segunda geracao custa, que e metade do gatilho de reabertura da D31.
 */
describe('rastro do custo (U18)', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());

  const linhasDeCusto = () =>
    info.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('geracao-concluida'));

  it('registra os tokens da geracao aprovada', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    await responderComVerificacao(ENTRADA);

    expect(linhasDeCusto()).toHaveLength(1);
    expect(linhasDeCusto()[0]).toContain('"entrada":10');
    expect(linhasDeCusto()[0]).toContain('"saida":5');
    expect(linhasDeCusto()[0]).toContain('"etapa":"primeira"');
  });

  it('registra as DUAS geracoes quando houve duas', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    await responderComVerificacao(ENTRADA);

    expect(linhasDeCusto()).toHaveLength(2);
    expect(linhasDeCusto()[1]).toContain('"etapa":"segunda"');
  });

  it('nunca registra o texto da resposta', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    await responderComVerificacao(ENTRADA);

    for (const linha of linhasDeCusto()) {
      expect(linha).not.toContain('32,5');
      expect(linha).not.toContain('vitamina');
    }
  });
});

/**
 * U13 -- a ORDEM entre limpar e verificar, que e onde mora o risco.
 *
 * Limpar depois de verificar seria uma porta de evasao: a marcacao parte a
 * palavra ao meio, a regra nao a reconhece, e a limpeza a remonta inteira na
 * tela. O caso abaixo usa a R3 para demonstrar isso sem escrever o termo
 * vetado do projeto em lugar nenhum.
 */
describe('limpeza antes da verificacao (U13)', () => {
  // O encaminhamento esta AQUI de proposito: sem ele a R2 reprovaria a frase e
  // o caso passaria pelo motivo errado -- foi o que aconteceu na primeira
  // redacao deste teste. Com a R2 satisfeita, so a R3 pode reprovar, e e ela
  // que a marcacao estava escondendo.
  const COM_MARCACAO = 'Seu exame está **alterado**. Leve ao seu médico.';

  it('a marcacao nao esconde a violacao da regra', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(COM_MARCACAO, ['consultar_analito']));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_MARCACAO, ['consultar_analito']));
    mockBuildDegradedAnswer.mockReturnValue(null);

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
  });

  it('a resposta aprovada sai sem marcacao nenhuma', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(`**${LIMPA}**`, ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).not.toContain('**');
    expect(r.texto).toBe(LIMPA);
  });
});

/**
 * A R5 ligada ao turno. O verificador so sabe se ha dado se alguem contar, e
 * quem viu o que as tools devolveram e ESTE modulo -- mesma razao pela qual
 * `temOrigem` e `questionKind` tambem nascem aqui.
 *
 * `semDados` e verdadeiro quando ferramentas FORAM chamadas e TODAS disseram
 * que nao ha dado. As duas metades importam: sem a primeira, um "ola" sem tool
 * nenhuma seria reprovado por nao dizer que falta algo.
 */
describe('R5 no turno', () => {
  function turnoSemDado(texto: string) {
    return {
      ok: true,
      answer: { texto, citacoes: [], toolsUsadas: ['consultar_exames'] },
      transcript: {
        messages: [],
        toolOutputs: [{ name: 'consultar_exames', output: { disponivel: false } }],
      },
      inputTokens: 10,
      outputTokens: 5,
      modelId: 'm',
    };
  }

  it('reprova a resposta que nao reconhece a ausencia de dado', async () => {
    mockRunConversationTurn.mockResolvedValue(turnoSemDado('Seu acompanhamento está em dia.'));
    mockRegenerateAnswer.mockResolvedValue(turnoSemDado('Seu acompanhamento está em dia.'));
    mockBuildDegradedAnswer.mockReturnValue(null);

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
  });

  it('aprova a resposta que DIZ que nao ha', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turnoSemDado('Não encontrei nenhum exame registrado no aplicativo.'),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
  });

  it('nao se aplica quando alguma ferramenta trouxe dado', async () => {
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
  });
});

/**
 * Decisoes A2 e C3 do Bloco 9 -- o encaminhamento costurado.
 *
 * Ate aqui, faltar o encaminhamento custava uma geracao inteira e, quando a
 * segunda tambem esquecia, a resposta inteira. Foram 2 de 2 reprovacoes
 * medidas em producao, e uma delas caiu no degradado duas vezes.
 *
 * A troca: a garantia da R2 deixa de ser probabilistica -- o modelo lembra ou
 * nao -- e passa a ser deterministica. E ela continua sendo UMA excecao, e nao
 * uma porta: com qualquer outra regra junto, o caminho continua A -> E -> C.
 */
describe('o encaminhamento costurado (A2 e C3)', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());

  const registrado = () => info.mock.calls.map((c) => String(c[0])).join('\n');

  const SEM_ENCAMINHAMENTO = 'Seu registro de março mostra 32,5 ng/mL.';

  it('R2 sozinha: costura e entrega, SEM gastar uma segunda geracao', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(SEM_ENCAMINHAMENTO, ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).toBe(`${SEM_ENCAMINHAMENTO} ${TEXTO_DE_ENCAMINHAMENTO}`);
    expect(mockRegenerateAnswer).not.toHaveBeenCalled();
  });

  it('a costura nao mexe em NADA do que o modelo escreveu', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(SEM_ENCAMINHAMENTO, ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.texto.startsWith(SEM_ENCAMINHAMENTO)).toBe(true);
    expect(r.citacoes).toEqual(CITACAO_VALIDA);
  });

  it('R2 COM outra regra junto continua no caminho A -> E -> C', async () => {
    // Este e o teste que impede a costura de virar afrouxamento. A posologia
    // nao ganha um rodape: ela derruba a resposta, como sempre derrubou.
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(turno(COM_POSOLOGIA));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
    expect(r.texto).not.toContain(TEXTO_DE_ENCAMINHAMENTO);
    expect(mockRegenerateAnswer).toHaveBeenCalled();
  });

  it('valor sem origem nao e costurado: R4 junto da R2 derruba', async () => {
    // A costura vale para a AUSENCIA de um texto fixo, e so para ela. Um numero
    // sem origem e presenca de algo proibido, e nenhum rodape conserta isso.
    mockRunConversationTurn.mockResolvedValue(turno(SEM_ENCAMINHAMENTO, ['consultar_analito']));
    mockRegenerateAnswer.mockResolvedValue(turno(SEM_ENCAMINHAMENTO, ['consultar_analito']));

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).not.toBe('APROVADA');
    expect(mockRegenerateAnswer).toHaveBeenCalled();
  });

  it('a SEGUNDA geracao tambem pode ser costurada', async () => {
    // Se a segunda so falha na R2, descarta-la seria repetir o defeito que
    // esta decisao conserta -- so que uma geracao mais caro.
    mockRunConversationTurn.mockResolvedValue(turno(COM_POSOLOGIA));
    mockRegenerateAnswer.mockResolvedValue(
      turno(SEM_ENCAMINHAMENTO, ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA_NA_SEGUNDA');
    expect(r.texto).toBe(`${SEM_ENCAMINHAMENTO} ${TEXTO_DE_ENCAMINHAMENTO}`);
  });

  it('registra a costura no log, e NAO como reprovacao', async () => {
    // A reprovacao por R2 deixaria de existir na contagem da L7 se a costura
    // fosse silenciosa -- e foi por isso que "costurar sempre, sem registrar"
    // (A3) foi recusada.
    mockRunConversationTurn.mockResolvedValue(
      turno(SEM_ENCAMINHAMENTO, ['consultar_analito'], CITACAO_VALIDA),
    );

    await responderComVerificacao(ENTRADA);

    expect(registrado()).toContain('encaminhamento-costurado');
    expect(registrado()).not.toContain('resposta-reprovada');
  });

  it('o log da costura NAO carrega o texto da resposta', async () => {
    mockRunConversationTurn.mockResolvedValue(
      turno(SEM_ENCAMINHAMENTO, ['consultar_analito'], CITACAO_VALIDA),
    );

    await responderComVerificacao(ENTRADA);

    const linha = info.mock.calls
      .map((c) => String(c[0]))
      .find((l) => l.includes('encaminhamento-costurado'));
    expect(linha).not.toContain('32,5');
    expect(linha).not.toContain('março');
  });

  it('quando o MODELO escreve o encaminhamento, isso tambem e contado', async () => {
    // Sob a C3 o prompt pede que ele NAO escreva. Quem mede se a instrucao
    // pegou e este numero -- a costura virou o caminho normal, entao contar so
    // ela nao diria mais nada sobre o comportamento do modelo.
    mockRunConversationTurn.mockResolvedValue(turno(LIMPA, ['consultar_analito'], CITACAO_VALIDA));

    await responderComVerificacao(ENTRADA);

    expect(registrado()).toContain('encaminhamento-do-modelo');
  });

  it('a ORDEM: limpa, verifica, e so entao costura', async () => {
    // A marcacao e removida ANTES da verificacao (U13) -- senao ela parte a
    // palavra ao meio e a regra nao a reconhece. A costura vem DEPOIS da
    // verificacao, sobre o texto ja limpo: o que a pessoa le sai sem marcacao
    // E com o encaminhamento, e o texto costurado nao volta para a limpeza.
    mockRunConversationTurn.mockResolvedValue(
      turno('Seu registro mostra **32,5 ng/mL** em março.', ['consultar_analito'], CITACAO_VALIDA),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.texto).not.toContain('**');
    expect(r.texto.endsWith(TEXTO_DE_ENCAMINHAMENTO)).toBe(true);
  });

  it('pergunta operacional nao recebe encaminhamento nenhum', async () => {
    // Repetir o aviso em pergunta de cadastro e o rodape mecanico que a R2
    // manda evitar -- a tela ja carrega o aviso permanente.
    mockRunConversationTurn.mockResolvedValue(
      turno('Sua próxima consulta é 24 de outubro.', ['consultar_consultas']),
    );

    const r = await responderComVerificacao(ENTRADA);

    expect(r.status).toBe('APROVADA');
    expect(r.texto).not.toContain(TEXTO_DE_ENCAMINHAMENTO);
  });
});
