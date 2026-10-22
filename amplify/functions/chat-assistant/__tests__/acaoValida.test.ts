/**
 * Resumo do arquivo:
 * A porta pela qual a acao proposta pelo modelo precisa passar antes de virar
 * cartao (E11). O que se prova: so entra o que a PESSOA escreveu nesta
 * conversa -- nem saida de ferramenta, nem anexo, nem resposta do assistente
 * --, a data e a hora sao resolvidas pelo codigo, e a dose nao tem por onde
 * entrar.
 */
import type { AcaoBruta } from '../chatSchema';
import { validarAcao } from '../acoes/acaoValida';

const HOJE = '2026-10-20';

// A primeira fala e a mensagem do turno; as outras, o historico da pessoa.
function agendar(campos: Omit<AcaoBruta, 'tipo'>, falas: string[]) {
  return validarAcao({ tipo: 'ABRIR_NOVO_AGENDAMENTO', ...campos }, { falasDaPessoa: falas, falaDoTurno: falas[0] ?? '', hoje: HOJE });
}

function lembrar(campos: Omit<AcaoBruta, 'tipo'>, falas: string[]) {
  return validarAcao({ tipo: 'ABRIR_NOVO_LEMBRETE', ...campos }, { falasDaPessoa: falas, falaDoTurno: falas[0] ?? '', hoje: HOJE });
}

describe('validarAcao: compromisso', () => {
  it('H1: aceita o que a pessoa disse e resolve data e hora', () => {
    const acao = agendar(
      { nome: 'retorno', profissional: 'Dra. Ana', quando: 'dia 30', hora: '14h' },
      ['marca retorno com a dra ana dia 30 as 14h'],
    );
    expect(acao).toEqual({
      tipo: 'ABRIR_NOVO_AGENDAMENTO',
      campos: { appointmentName: 'retorno', professionalName: 'Dra. Ana', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
    });
  });

  it('H8: nome que nao esta na fala some; sem nada mais, nao ha acao', () => {
    expect(agendar({ nome: 'hemograma completo' }, ['agenda pra mim o exame que ta na minha receita'])).toBeUndefined();
  });

  it('nome reescrito pelo modelo nao passa', () => {
    expect(agendar({ nome: 'Retorno com a Dra. Ana Souza' }, ['marca retorno com a dra ana'])).toBeUndefined();
  });

  it('casa palavra inteira: "ana" nao casa dentro de "banana"', () => {
    expect(agendar({ profissional: 'ana' }, ['comprei banana'])).toBeUndefined();
  });

  it('H15: os campos podem vir de mensagens diferentes da pessoa', () => {
    const acao = agendar({ nome: 'retorno', quando: 'dia 30', hora: 'as 9' }, ['dia 30 as 9', 'preciso marcar o retorno']);
    expect(acao?.campos).toEqual({ appointmentName: 'retorno', scheduledDate: '2026-10-30', scheduledTime: '09:00' });
  });

  it('com duas datas ditas, fica a que o modelo mandou, desde que dita', () => {
    const acao = agendar({ nome: 'retorno', quando: 'dia 22' }, ['nao, dia 22', 'marca o retorno dia 20']);
    expect(acao?.campos).toMatchObject({ scheduledDate: '2026-10-22' });
  });

  // Revisao do E11, achado 5: o historico nao tem data. "amanha" dito numa
  // conversa de segunda e retomada na quinta seria resolvido contra quinta.
  // Data e hora saem so da mensagem do turno; o nome pode vir do historico.
  it('data e hora so valem na mensagem do turno', () => {
    const acao = agendar({ nome: 'retorno', quando: 'amanha', hora: '14h' }, ['pode marcar', 'marca retorno amanha as 14h']);
    expect(acao?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('horario do lembrete dito so no historico nao vale', () => {
    expect(lembrar({ nome: 'losartana', horarios: ['8h'] }, ['pode criar', 'me lembra da losartana as 8h'])?.campos).toEqual({
      name: 'losartana',
    });
  });

  it('expressao de data que a pessoa nao disse some', () => {
    expect(agendar({ nome: 'retorno', quando: 'sexta' }, ['marca o retorno'])?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('H6: data no passado some, a hora fica', () => {
    expect(agendar({ quando: '15/10/2026', hora: 'as 10' }, ['marca consulta 15/10/2026 as 10'])?.campos).toEqual({
      scheduledTime: '10:00',
    });
  });

  it('tipo EXAME so com "exame" na fala; CONSULTA nao entra (o formulario ja marca)', () => {
    expect(agendar({ nome: 'exame de sangue', tipoDeCompromisso: 'EXAME' }, ['agenda exame de sangue'])?.campos).toEqual({
      appointmentName: 'exame de sangue',
      appointmentType: 'EXAME',
    });
    expect(agendar({ nome: 'retorno', tipoDeCompromisso: 'EXAME' }, ['marca o retorno'])?.campos).toEqual({
      appointmentName: 'retorno',
    });
    expect(agendar({ nome: 'retorno', tipoDeCompromisso: 'CONSULTA' }, ['marca a consulta de retorno'])?.campos).toEqual({
      appointmentName: 'retorno',
    });
  });

  // Revisao do E11 (menor 8 da lista): "exame" solto na conversa nao faz da
  // consulta um exame. A palavra do tipo tem de estar no proprio nome; sem
  // nome, na mensagem do turno.
  it('consulta para ver o resultado do exame continua consulta', () => {
    expect(
      agendar({ nome: 'consulta', tipoDeCompromisso: 'EXAME' }, ['marca a consulta pra ver o resultado do exame'])?.campos,
    ).toEqual({ appointmentName: 'consulta' });
  });

  it('exame dito em outra mensagem nao muda o tipo', () => {
    expect(
      agendar({ nome: 'retorno', tipoDeCompromisso: 'EXAME' }, ['marca o retorno', 'meu exame deu alterado'])?.campos,
    ).toEqual({ appointmentName: 'retorno' });
  });

  it('sem nome, vale a palavra na mensagem do turno', () => {
    expect(agendar({ tipoDeCompromisso: 'CIRURGIA', quando: 'dia 30' }, ['marca a cirurgia dia 30'])?.campos).toEqual({
      appointmentType: 'CIRURGIA',
      scheduledDate: '2026-10-30',
    });
  });

  it('horarios num compromisso sao ignorados', () => {
    expect(agendar({ nome: 'retorno', horarios: ['8h'] }, ['marca o retorno as 8h'])?.campos).toEqual({ appointmentName: 'retorno' });
  });

  it('sem fala da pessoa, nada passa', () => {
    expect(agendar({ nome: 'retorno', quando: 'amanha' }, [])).toBeUndefined();
  });
});

describe('validarAcao: lembrete', () => {
  it('H3: nome sem a dose e horario resolvido; nenhum campo de dose', () => {
    const acao = lembrar({ nome: 'vitamina d 2000 ui', horarios: ['8h'] }, ['me lembra de tomar vitamina d 2000 ui as 8h']);
    expect(acao).toEqual({ tipo: 'ABRIR_NOVO_LEMBRETE', campos: { name: 'vitamina d', times: ['08:00'] } });
    expect(JSON.stringify(acao)).not.toMatch(/dos/i);
  });

  it('horario que nao esta na fala some', () => {
    expect(lembrar({ nome: 'losartana', horarios: ['8h', '20h'] }, ['me lembra da losartana as 8h'])?.campos).toEqual({
      name: 'losartana',
      times: ['08:00'],
    });
  });

  it('so dose no nome vira nome vazio', () => {
    expect(lembrar({ nome: '500mg' }, ['me lembra do 500mg'])).toBeUndefined();
  });
});
