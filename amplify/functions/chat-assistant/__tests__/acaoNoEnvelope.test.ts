/**
 * Resumo do arquivo:
 * O campo `acao` no envelope da resposta (E11). Como na memoria, o que mais
 * importa e o que NAO muda: a resposta sem acao continua valida exatamente
 * como era (regra 5 da constituicao), e o esquema que vai ao Bedrock leva so o
 * que o servico aceita.
 */
import { toStructuredOutputSchema } from '../../extract-document-data/extractionSchema';
import { chatAnswerSchema } from '../chatSchema';

const SEM_ACAO = { texto: 'Preparei o formulário para você conferir e salvar.', citacoes: [] };
const ACAO = { tipo: 'ABRIR_NOVO_AGENDAMENTO', nome: 'retorno', quando: 'dia 30', hora: '14h' };

describe('o campo acao no envelope (E11)', () => {
  it('resposta sem acao continua valida e sem o campo', () => {
    const r = chatAnswerSchema.safeParse(SEM_ACAO);
    expect(r.success && r.data).toEqual(SEM_ACAO);
  });

  it('aceita uma acao com tipo da lista e campos conhecidos', () => {
    expect(chatAnswerSchema.safeParse({ ...SEM_ACAO, acao: ACAO }).success).toBe(true);
  });

  it('aceita um nome longo: o teto e aplicado depois, sem derrubar a resposta', () => {
    expect(chatAnswerSchema.safeParse({ ...SEM_ACAO, acao: { ...ACAO, nome: 'a'.repeat(500) } }).success).toBe(true);
  });

  // Revisao do E11 (menor 8): a recusa nao depende de o Bedrock impor o
  // formato. Acao com tipo fora da lista ou campo desconhecido vira AUSENTE, e
  // a resposta continua valida -- proposta ruim nunca derruba resposta boa.
  it('tipo fora da lista: a acao some e a resposta continua', () => {
    const r = chatAnswerSchema.safeParse({ ...SEM_ACAO, acao: { ...ACAO, tipo: 'APAGAR' } });
    expect(r.success && r.data).toEqual(SEM_ACAO);
  });

  it('campo desconhecido na acao: a acao some e a resposta continua', () => {
    const r = chatAnswerSchema.safeParse({ ...SEM_ACAO, acao: { ...ACAO, dose: '2000 UI' } });
    expect(r.success && r.data).toEqual(SEM_ACAO);
  });

  it('o envelope continua estrito fora da acao', () => {
    expect(chatAnswerSchema.safeParse({ ...SEM_ACAO, comentario: 'oi' }).success).toBe(false);
  });

  it('o esquema do Bedrock traz a acao com os dois tipos e sem maxItems', () => {
    const esquema = JSON.stringify(toStructuredOutputSchema(chatAnswerSchema));
    expect(esquema).toContain('"acao"');
    expect(esquema).toContain('ABRIR_NOVO_AGENDAMENTO');
    expect(esquema).toContain('ABRIR_NOVO_LEMBRETE');
    expect(esquema).not.toContain('maxItems');
  });
});
