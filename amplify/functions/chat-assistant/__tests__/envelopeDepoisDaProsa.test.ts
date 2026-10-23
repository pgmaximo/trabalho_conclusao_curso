/**
 * Sem a saida estruturada (2026-10-22), o modelo as vezes escreve a resposta
 * em prosa e DEPOIS o envelope. Na medicao, 9 de 24 turnos vieram assim, todos
 * com o envelope completo -- e cada um custava uma segunda geracao. Os textos
 * abaixo sao as saidas brutas da medicao (dados ficticios).
 */
import { chatAnswerSchema, extrairResposta } from '../chatSchema';

const ler = (bruto: string) => chatAnswerSchema.safeParse(extrairResposta(bruto));

describe('o envelope depois da prosa', () => {
  it('a prosa antes do envelope e descartada, e o envelope vale', () => {
    const r = ler(
      'Para cadastrar um remédio novo, acesse Remédios > botão + (Adicionar medicamento). ' +
        '{"texto": "Para cadastrar um remédio novo, vá em Remédios > botão + (Adicionar medicamento).", "citacoes": []}',
    );
    expect(r.success && r.data.texto).toBe('Para cadastrar um remédio novo, vá em Remédios > botão + (Adicionar medicamento).');
  });

  it('a acao do envelope chega inteira', () => {
    const r = ler(
      'Preparei o compromisso para você. ' +
        '{"texto": "Preparei o compromisso para você.", "citacoes": [], ' +
        '"acao": {"tipo": "ABRIR_NOVO_AGENDAMENTO", "nome": "Retorno", "profissional": "cardiologista", "quando": "dia 30 de novembro", "hora": "14h"}}',
    );
    expect(r.success && r.data.acao).toEqual({
      tipo: 'ABRIR_NOVO_AGENDAMENTO',
      nome: 'Retorno',
      profissional: 'cardiologista',
      quando: 'dia 30 de novembro',
      hora: '14h',
    });
  });

  it('chave na prosa nao atrapalha', () => {
    const r = ler('O campo {nome} e opcional. {"texto": "Oi.", "citacoes": []}');
    expect(r.success && r.data.texto).toBe('Oi.');
  });

  it('prosa e depois a cerca de codigo', () => {
    const r = ler('Aqui está:\n```json\n{"texto": "Oi.", "citacoes": []}\n```');
    expect(r.success && r.data.texto).toBe('Oi.');
  });

  it('prosa depois do envelope tambem e descartada', () => {
    const r = ler('{"texto": "Oi.", "citacoes": []}\nEspero ter ajudado!');
    expect(r.success && r.data.texto).toBe('Oi.');
  });

  it('prosa sem envelope continua recusada', () => {
    expect(extrairResposta('Você tem 3 registros de vacinas aplicadas.')).toBeUndefined();
  });

  it('envelope cortado continua recusado', () => {
    expect(extrairResposta('Oi. {"texto": "Oi.", "citacoes": [')).toBeUndefined();
  });
});
