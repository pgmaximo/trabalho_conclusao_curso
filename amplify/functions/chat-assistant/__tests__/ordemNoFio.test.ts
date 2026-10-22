/**
 * A5 da conferencia no sandbox (2026-10-20): a saida estruturada escreve as
 * chaves em ORDEM ALFABETICA, e nao na do schema. "acao" vinha antes de
 * "texto" -- o modelo tinha de decidir a acao antes de escrever a resposta, e
 * pulava o campo --, e dentro dela "tipo" vinha quase por ultimo: depois de
 * escrever "tipo", "hora", "nome" e "quando" ja tinham passado. Medido com a
 * saida bruta: nenhum cartao em 3 pedidos; com a ordem certa, 3 de 3.
 *
 * Os nomes do FIO (o JSON Schema mandado ao modelo) ganham um prefixo que
 * ordena como o envelope quer; a resposta e traduzida de volta antes do zod.
 */
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send(comando: unknown) {
      return mockSend(comando);
    }
  },
  ConverseCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('../tools', () => ({ CHAT_TOOLS: [], findTool: () => undefined, runTool: jest.fn() }));

import { chatAnswerSchema, extrairResposta, schemaDaResposta } from '../chatSchema';
import { runConversationTurn } from '../conversationLoop';

const ordenadas = (o: Record<string, unknown>) => Object.keys(o).sort();
const semPrefixo = (k: string) => k.replace(/^\d+_/, '');

describe('a ordem no fio', () => {
  const schema = schemaDaResposta() as any;

  it('a acao e a memoria vem depois do texto', () => {
    expect(ordenadas(schema.properties).map(semPrefixo)).toEqual(['citacoes', 'texto', 'memoria', 'acao']);
    expect(schema.required.map(semPrefixo).sort()).toEqual(['citacoes', 'texto']);
  });

  it('dentro da acao, o tipo vem primeiro e os horarios por ultimo', () => {
    const chave = Object.keys(schema.properties).find((k) => semPrefixo(k) === 'acao')!;
    const acao = schema.properties[chave];
    expect(ordenadas(acao.properties).map(semPrefixo)).toEqual([
      'tipo', 'nome', 'profissional', 'endereco', 'tipoDeCompromisso', 'quando', 'hora', 'horarios',
    ]);
    expect(acao.required.map(semPrefixo)).toEqual(['tipo']);
  });

  it('a resposta no fio volta com os nomes do envelope', () => {
    const bruto = JSON.stringify({
      '1_citacoes': [],
      '2_texto': 'Para marcar, vá em Mais > Agenda > botão +.',
      '4_acao': { '1_tipo': 'ABRIR_NOVO_AGENDAMENTO', '2_nome': 'retorno', '6_quando': 'dia 30', '7_hora': '14h' },
    });
    const r = chatAnswerSchema.safeParse(extrairResposta(bruto));
    expect(r.success && r.data).toEqual({
      citacoes: [],
      texto: 'Para marcar, vá em Mais > Agenda > botão +.',
      acao: { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', quando: 'dia 30', hora: '14h' },
    });
  });

  it('sem saida estruturada, os nomes do envelope continuam valendo', () => {
    const r = chatAnswerSchema.safeParse(extrairResposta('{"texto":"Oi.","citacoes":[]}'));
    expect(r.success).toBe(true);
  });

  it('o laco manda ao modelo o schema do fio', async () => {
    mockSend.mockResolvedValue({
      stopReason: 'end_turn',
      output: { message: { content: [{ text: '{"1_citacoes":[],"2_texto":"Oi."}' }] } },
    });
    const r = await runConversationTurn({
      message: 'oi',
      history: [],
      identity: { sub: 's', username: 'u', owner: 's::u' },
      modelId: 'm',
      guardrailId: 'g',
      guardrailVersion: '1',
    } as any);
    const enviado = mockSend.mock.calls[0][0].input.additionalModelRequestFields.output_config.format.schema;
    expect(enviado).toEqual(schemaDaResposta());
    expect(r.ok && r.answer.texto).toBe('Oi.');
  });
});
