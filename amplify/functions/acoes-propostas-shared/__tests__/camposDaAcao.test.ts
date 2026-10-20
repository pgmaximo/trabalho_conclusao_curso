/**
 * Resumo do arquivo:
 * O contrato da acao proposta ja resolvida (E11), conferido nos tres lugares
 * por onde ela passa: a saida da Lambda, a resposta que o app recebe e os
 * parametros da rota do formulario. O que se prova aqui e que os tres recusam
 * as MESMAS coisas, e que o modulo nao depende de nada (o app e a Lambda o
 * importam).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  dataPorExtenso,
  lerAcaoProposta,
  MAX_ENDERECO,
  MAX_HORARIOS,
  MAX_NOME,
  MAX_PROFISSIONAL,
  MIN_CARACTERES_CAMPO,
  paramsDaAcao,
  rotaDaAcao,
  type AcaoProposta,
} from '../camposDaAcao';

const FONTE = readFileSync(join(__dirname, '..', 'camposDaAcao.ts'), 'utf8');

const AGENDAMENTO = 'ABRIR_NOVO_AGENDAMENTO';
const LEMBRETE = 'ABRIR_NOVO_LEMBRETE';

function agendamento(campos: Record<string, unknown>) {
  return lerAcaoProposta({ tipo: AGENDAMENTO, campos });
}

describe('o modulo compartilhado da acao (E11)', () => {
  it('nao importa nada', () => {
    expect(FONTE).not.toMatch(/^import /m);
  });

  it('fixa os limites da spec', () => {
    expect([MAX_NOME, MAX_PROFISSIONAL, MAX_ENDERECO, MAX_HORARIOS, MIN_CARACTERES_CAMPO]).toEqual([80, 80, 120, 4, 2]);
  });
});

describe('lerAcaoProposta: agendamento', () => {
  it('aceita a acao completa como veio', () => {
    const campos = { appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '14:00' };
    expect(agendamento(campos)).toEqual({ tipo: AGENDAMENTO, campos });
  });

  it.each([['APAGAR_TUDO'], [null], ['x']])('tipo fora da lista (%p) nao vira acao', (tipo) => {
    expect(lerAcaoProposta({ tipo, campos: { appointmentName: 'retorno' } })).toBeUndefined();
  });

  it.each([[null], ['texto'], [42], [undefined]])('entrada que nao e objeto (%p) nao vira acao', (bruto) => {
    expect(lerAcaoProposta(bruto)).toBeUndefined();
  });

  it.each([['2026-13-40'], ['2026-02-30'], ['30/10/2026']])('data invalida (%s) some, e sem outro campo nao ha acao', (data) => {
    expect(agendamento({ scheduledDate: data })).toBeUndefined();
    expect(agendamento({ scheduledDate: data, appointmentName: 'retorno' })).toEqual({
      tipo: AGENDAMENTO,
      campos: { appointmentName: 'retorno' },
    });
  });

  it('hora fora de hh:mm some', () => {
    expect(agendamento({ appointmentName: 'retorno', scheduledTime: '25:00' })?.campos).toEqual({ appointmentName: 'retorno' });
    expect(agendamento({ appointmentName: 'retorno', scheduledTime: '8:00' })?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('aplica os limites de tamanho por campo', () => {
    expect(agendamento({ appointmentName: 'a'.repeat(81) })).toBeUndefined();
    expect(agendamento({ appointmentName: 'a'.repeat(80) })?.campos).toEqual({ appointmentName: 'a'.repeat(80) });
    expect(agendamento({ appointmentName: 'retorno', professionalName: 'b'.repeat(81) })?.campos).toEqual({ appointmentName: 'retorno' });
    expect(agendamento({ appointmentName: 'retorno', address: 'c'.repeat(121) })?.campos).toEqual({ appointmentName: 'retorno' });
    expect(agendamento({ appointmentName: ' x ' })).toBeUndefined();
  });

  // Revisao do E11 (menor 2): "de" passa no minimo de 2 caracteres e casa em
  // quase qualquer fala. Campo feito so de palavra vazia nao e nome de nada.
  it.each([['de'], ['da'], ['o'], ['com a'], ['pra'], ['De ']])('campo so de palavra vazia (%p) some', (vazio) => {
    expect(agendamento({ appointmentName: 'retorno', professionalName: vazio })?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('nome curto que nao e palavra vazia fica', () => {
    expect(agendamento({ professionalName: 'dr' })?.campos).toEqual({ professionalName: 'dr' });
  });

  it('tira espaco das pontas', () => {
    expect(agendamento({ appointmentName: '  retorno  ' })?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('tipo de compromisso so da lista fechada', () => {
    expect(agendamento({ appointmentType: 'EXAME' })?.campos).toEqual({ appointmentType: 'EXAME' });
    expect(agendamento({ appointmentName: 'retorno', appointmentType: 'PLANTAO' })?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('ignora campos de outro tipo e campos desconhecidos', () => {
    expect(agendamento({ appointmentName: 'retorno', times: ['08:00'], owner: 'outra-pessoa' })?.campos).toEqual({
      appointmentName: 'retorno',
    });
  });
});

describe('lerAcaoProposta: lembrete', () => {
  it('limpa horarios repetidos e invalidos', () => {
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { name: 'vitamina d', times: ['08:00', '08:00', '25:00', '20:00'] } })).toEqual({
      tipo: LEMBRETE,
      campos: { name: 'vitamina d', times: ['08:00', '20:00'] },
    });
  });

  it('aceita os horarios como texto de rota', () => {
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { times: '08:00,20:00' } })?.campos).toEqual({ times: ['08:00', '20:00'] });
  });

  it('fica com os primeiros MAX_HORARIOS', () => {
    const times = ['06:00', '08:00', '12:00', '18:00', '22:00'];
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { times } })?.campos).toEqual({ times: times.slice(0, 4) });
  });

  it('sem horario valido e sem nome, nao ha acao', () => {
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { times: ['99:99'] } })).toBeUndefined();
  });

  // Revisao do E11, achado 4: a dose tambem vem por extenso ou pelo link.
  // Cortar aqui vale para os tres caminhos: a Lambda, o servico e a rota.
  it.each([
    ['losartana cinquenta mg', 'losartana'],
    ['dipirona meio comprimido', 'dipirona'],
    ['Losartana 50mg', 'Losartana'],
    ['vitamina d duas gotas', 'vitamina d'],
    ['omeprazol 20 mg', 'omeprazol'],
    ['fluoxetina cápsula', 'fluoxetina'],
    ['dipirona três gotas', 'dipirona'],
    ['vitamina b12', 'vitamina b12'],
    ['vitamina d', 'vitamina d'],
  ])('o nome do lembrete sai sem dose: %s -> %s', (nome, esperado) => {
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { name: nome } })?.campos).toEqual({ name: esperado });
  });

  it('nome que e so dose some', () => {
    expect(lerAcaoProposta({ tipo: LEMBRETE, campos: { name: 'meio comprimido' } })).toBeUndefined();
  });

  it('nao tem lugar para dose', () => {
    const acao = lerAcaoProposta({ tipo: LEMBRETE, campos: { name: 'vitamina d', dosage: '2000 UI' } });
    expect(acao?.campos).toEqual({ name: 'vitamina d' });
  });
});

describe('parametros de rota', () => {
  const lembrete: AcaoProposta = { tipo: LEMBRETE, campos: { name: 'vitamina d', times: ['08:00', '20:00'] } };
  const compromisso: AcaoProposta = {
    tipo: AGENDAMENTO,
    campos: { appointmentName: 'retorno', professionalName: 'dra ana', appointmentType: 'EXAME', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
  };

  it('junta os horarios com virgula', () => {
    expect(paramsDaAcao(lembrete)).toEqual({ tipo: LEMBRETE, name: 'vitamina d', times: '08:00,20:00' });
  });

  it.each([[lembrete], [compromisso]])('ida e volta pela rota devolve a mesma acao', (acao) => {
    expect(lerAcaoProposta({ tipo: acao.tipo, campos: paramsDaAcao(acao) })).toEqual(acao);
  });

  it('cada tipo abre o seu formulario', () => {
    expect(rotaDaAcao(AGENDAMENTO)).toBe('/add-appointment');
    expect(rotaDaAcao(LEMBRETE)).toBe('/add-medicine');
  });
});

describe('dataPorExtenso', () => {
  it('diz o dia da semana sem depender do fuso', () => {
    expect(dataPorExtenso('2026-10-30')).toBe('sexta-feira, 30/10/2026');
    expect(dataPorExtenso('2026-10-20')).toBe('terça-feira, 20/10/2026');
    expect(dataPorExtenso('2026-10-25')).toBe('domingo, 25/10/2026');
  });
});
