/**
 * Resumo do arquivo:
 * A saida de `consultar_doses_tomadas` (E3), montada sem banco: que horarios
 * eram esperados, quais foram marcados, e o que se diz de cada um. Os itens usam
 * os nomes de campo do schema publicado (`amplify/data/schemas/medicines.ts`):
 * um teste que inventa a forma do dado concorda com qualquer implementacao.
 *
 * "Agora", nos cenarios, e quarta-feira, 2026-10-21, 15h em Brasilia, e a
 * losartana e diaria as 08:00 e 20:00 desde 2026-10-01 (spec, secao 3).
 */
// O modulo importa `texto` de `ownerScopedRead.ts`, que importa o SDK: o mock
// so impede o carregamento, nenhum teste aqui le banco.
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: jest.fn() }) },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { LinhaDoBanco } from '../tools/ownerScopedRead';
import {
  agoraNoFuso,
  escolherRemedios,
  montarSaida,
  periodoDe,
  type Agora,
  type DosesDoRemedio,
} from '../tools/dosesTomadasSaida';

const AGORA: Agora = { data: '2026-10-21', minutos: 15 * 60 };

function remedio(campos: LinhaDoBanco = {}): LinhaDoBanco {
  return {
    id: 'med-1',
    owner: 's-1::u-1',
    name: 'Losartana',
    dosage: '50 mg',
    times: ['08:00', '20:00'],
    frequencyType: 'DAILY',
    startDate: '2026-10-01',
    currentStock: 10,
    initialStock: 30,
    active: true,
    ...campos,
  };
}

function marca(data: string, horario: string, medicineId = 'med-1'): LinhaDoBanco {
  return {
    id: `${medicineId}#${data}#${horario}`,
    owner: 's-1::u-1',
    medicineId,
    scheduledDate: data,
    scheduledTime: horario,
    takenAt: `${data}T12:00:00.000Z`,
    stockAdjusted: true,
  };
}

/** O caminho da ferramenta, sem o banco: periodo, escolha e saida. As
 *  marcacoes sao repartidas por remedio, como as consultas por indice fazem. */
function montar(
  remedios: LinhaDoBanco[],
  marcacoes: LinhaDoBanco[] = [],
  { agora = AGORA, dias = 7, filtro }: { agora?: Agora; dias?: number; filtro?: string } = {},
) {
  const periodo = periodoDe(agora, dias);
  const escolha = escolherRemedios(remedios, periodo, filtro);
  return montarSaida({
    escolha,
    marcacoes: escolha.escolhidos.map((r) => marcacoes.filter((m) => m.medicineId === r.id)),
    agora,
    periodo,
  });
}

const unico = (...args: Parameters<typeof montar>): DosesDoRemedio => {
  const saida = montar(...args);
  expect(saida.medicamentos).toHaveLength(1);
  return saida.medicamentos[0];
};

/** Todas as marcacoes de uma semana, menos as listadas. */
function semanaMarcadaMenos(...faltas: string[]): LinhaDoBanco[] {
  const marcacoes: LinhaDoBanco[] = [];
  for (let dia = 15; dia <= 21; dia += 1) {
    for (const horario of ['08:00', '20:00']) {
      const data = `2026-10-${dia}`;
      if (!faltas.includes(`${data} ${horario}`)) marcacoes.push(marca(data, horario));
    }
  }
  return marcacoes;
}

describe('o horario de hoje', () => {
  it('marcado e pendente (CA-3)', () => {
    expect(unico([remedio()], [marca('2026-10-21', '08:00')]).hoje).toEqual([
      { horario: '08:00', situacao: 'marcado' },
      { horario: '20:00', situacao: 'pendente' },
    ]);
  });

  it('vira "sem marcação" so depois da tolerancia de uma hora da tela (CA-4)', () => {
    const as = (minutos: number) => unico([remedio()], [], { agora: { data: '2026-10-21', minutos } }).hoje[0];
    expect(as(9 * 60 + 1)).toEqual({ horario: '08:00', situacao: 'sem marcação' });
    expect(as(9 * 60)).toEqual({ horario: '08:00', situacao: 'pendente' });
  });

  it('marcado antes da hora e marcado, nao pendente (Review Focus 3)', () => {
    expect(unico([remedio()], [marca('2026-10-21', '20:00')]).hoje[1]).toEqual({ horario: '20:00', situacao: 'marcado' });
  });

  it('hora com um digito ("8:00") e lida como 08:00, e passa da tolerancia como as outras (menor adiado)', () => {
    const doses = unico([remedio({ times: ['8:00'] })], [], { agora: { data: '2026-10-21', minutos: 23 * 60 } });
    expect(doses.hoje).toEqual([{ horario: '8:00', situacao: 'sem marcação' }]);
  });

  it('horario realmente ilegivel nunca vira "sem marcação" hoje, e nada lanca (Review Focus 4)', () => {
    const doses = unico([remedio({ times: ['lixo'] })], [], { agora: { data: '2026-10-21', minutos: 23 * 60 } });
    expect(doses.hoje).toEqual([{ horario: 'lixo', situacao: 'pendente' }]);
  });
});

describe('menores adiados da revisao do E3', () => {
  it('takenToday com horario que nao esta na agenda de hoje conta como marcacao fora do horario', () => {
    const saida = montar([remedio({ takenToday: '{"date":"2026-10-21","times":["07:00"]}' })], [], { dias: 1 });
    expect(saida.medicamentos[0].marcacoesForaDoHorarioAtual).toBe(1);
    expect(saida.medicamentos[0].contagem.marcados).toBe(0);
    expect(saida.explicacao).toBe('Os dias anteriores são contados com os horários cadastrados hoje.');
  });

  it('takenToday e historico do mesmo horario nao contam em dobro', () => {
    const doses = unico(
      [remedio({ takenToday: '{"date":"2026-10-21","times":["07:00"]}' })],
      [marca('2026-10-21', '07:00')],
      { dias: 1 },
    );
    expect(doses.marcacoesForaDoHorarioAtual).toBe(1);
  });

  it('nome nao encontrado: os nomes em uso tem teto, e os que ficaram de fora sao contados', () => {
    const remedios = Array.from({ length: 18 }, (_, i) => remedio({ id: `med-${i}`, name: `Remédio ${i}` }));
    const saida = montar(remedios, [], { filtro: 'atenolol' });
    expect(saida.nomesEmUso).toHaveLength(15);
    expect(saida.nomesEmUsoOmitidos).toBe(3);
  });

  it('sem corte, nomesEmUsoOmitidos e zero', () => {
    expect(montar([remedio()], [], { filtro: 'atenolol' }).nomesEmUsoOmitidos).toBe(0);
  });
});

describe('o takenToday, mesma regra da tela (D3.1, CA-5)', () => {
  const comTaken = (takenToday: unknown) => unico([remedio({ takenToday })]);

  it('marca o horario de hoje', () => {
    expect(comTaken('{"date":"2026-10-21","times":["08:00"]}').hoje[0].situacao).toBe('marcado');
  });

  it.each([
    ['de outro dia', '{"date":"2026-10-20","times":["08:00"]}'],
    ['malformado', '{'],
    ['ausente', undefined],
  ])('%s nao marca nada', (_nome, takenToday) => {
    expect(comTaken(takenToday).hoje[0].situacao).toBe('sem marcação');
  });

  it('nunca marca um dia anterior', () => {
    const doses = unico([remedio({ takenToday: '{"date":"2026-10-21","times":["08:00"]}' })], [], { dias: 2 });
    expect(doses.semMarcacao).toContainEqual({ data: '2026-10-20', diaDaSemana: 'terça', horario: '08:00' });
  });
});

describe('o periodo', () => {
  it('a semana: horarios sem marcacao do mais recente ao mais antigo, e a contagem (CA-6)', () => {
    const doses = unico(
      [remedio()],
      semanaMarcadaMenos('2026-10-17 20:00', '2026-10-19 08:00', '2026-10-21 20:00'),
    );
    expect(doses.semMarcacao).toEqual([
      { data: '2026-10-19', diaDaSemana: 'segunda', horario: '08:00' },
      { data: '2026-10-17', diaDaSemana: 'sábado', horario: '20:00' },
    ]);
    expect(doses.contagem).toEqual({ horariosEsperados: 14, marcados: 11, semMarcacao: 2, pendentes: 1 });
    expect(doses.semMarcacaoOmitidos).toBe(0);
    expect(doses.marcacoesForaDoHorarioAtual).toBe(0);
  });

  it('dias especificos: so os dias escolhidos geram horario (CA-7)', () => {
    const doses = unico([remedio({ frequencyType: 'SPECIFIC_DAYS', weekDays: ['MON', 'THU'], times: ['09:00'] })]);
    expect(doses.semMarcacao.map((h) => h.data)).toEqual(['2026-10-19', '2026-10-15']);
    expect(doses.contagem.horariosEsperados).toBe(2);
    expect(doses.hoje).toEqual([]);
  });

  it('a cada X horas: os mesmos horarios da tela (CA-7)', () => {
    const doses = unico([remedio({ frequencyType: 'EVERY_X_HOURS', intervalHours: 8, times: ['06:00'] })]);
    expect(doses.hoje.map((h) => h.horario)).toEqual(['06:00', '14:00', '22:00']);
  });

  it('intervalo que nao divide 24 horas: a marcacao das 02:00 do segundo dia conta (Review Focus 2)', () => {
    const doses = unico(
      [remedio({ frequencyType: 'EVERY_X_HOURS', intervalHours: 10, times: ['06:00'], startDate: '2026-10-20' })],
      [marca('2026-10-21', '02:00')],
      { dias: 2 },
    );
    expect(doses.hoje).toEqual([
      { horario: '02:00', situacao: 'marcado' },
      { horario: '12:00', situacao: 'sem marcação' },
      { horario: '22:00', situacao: 'pendente' },
    ]);
    expect(doses.marcacoesForaDoHorarioAtual).toBe(0);
  });

  it('termino dentro do periodo: nada depois dele, e o termino vai na saida (CA-7)', () => {
    const doses = unico([remedio({ endDate: '2026-10-18' })]);
    expect(doses.termino).toBe('2026-10-18');
    expect(doses.hoje).toEqual([]);
    expect(doses.semMarcacao.every((h) => h.data <= '2026-10-18')).toBe(true);
    expect(doses.contagem.horariosEsperados).toBe(8);
  });

  it('termino depois do periodo nao aparece (CA-7)', () => {
    expect(unico([remedio({ endDate: '2026-12-01' })]).termino).toBeNull();
  });

  it('remedio inativo nao entra, como na tela (CA-7)', () => {
    const saida = montar([remedio({ active: false }), remedio({ id: 'med-2', name: 'Metformina' })]);
    expect(saida.medicamentos.map((m) => m.nome)).toEqual(['Metformina']);
  });

  it('periodoDe: um dia e so hoje; o padrao e uma semana; vira o mes (CA-13)', () => {
    expect(periodoDe(AGORA, 1)).toEqual({ de: '2026-10-21', ate: '2026-10-21', dias: 1 });
    expect(periodoDe(AGORA, 7)).toEqual({ de: '2026-10-15', ate: '2026-10-21', dias: 7 });
    expect(periodoDe({ data: '2026-03-02', minutos: 0 }, 3).de).toBe('2026-02-28');
  });

  it('nada antes da data de inicio, e remedio que ainda nao comecou nao e escolhido (CA-13)', () => {
    const doses = unico([remedio({ startDate: '2026-10-19' })]);
    expect(doses.contagem.horariosEsperados).toBe(6);
    expect(doses.semMarcacao.every((h) => h.data >= '2026-10-19')).toBe(true);

    const futuro = montar([remedio({ startDate: '2026-10-25' })]);
    expect(futuro.medicamentos).toEqual([]);
    expect(futuro.explicacao).toBe('Nenhum remédio em uso tem horário previsto neste período.');
  });
});

describe('a marcacao que nao bate com o horario de hoje (CA-10)', () => {
  it('e contada a parte, nunca como marcado, e a saida explica', () => {
    const saida = montar([remedio()], [marca('2026-10-15', '07:00')]);
    expect(saida.medicamentos[0].marcacoesForaDoHorarioAtual).toBe(1);
    expect(saida.medicamentos[0].contagem.marcados).toBe(0);
    expect(saida.explicacao).toContain('Os dias anteriores são contados com os horários cadastrados hoje.');
  });
});

describe('o filtro por nome (CA-8)', () => {
  it('casa sem acento, sem maiuscula e por parte do nome', () => {
    const saida = montar([remedio({ name: 'Losartana 50mg' }), remedio({ id: 'med-2', name: 'Metformina' })], [], {
      filtro: 'LOSÁRTANA',
    });
    expect(saida.medicamentos.map((m) => m.nome)).toEqual(['Losartana 50mg']);
  });

  it('dois remedios com o mesmo nome voltam os dois (Review Focus 5)', () => {
    const saida = montar([remedio({ name: 'Losartana 50mg' }), remedio({ id: 'med-2', name: 'Losartana 25mg' })], [], {
      filtro: 'losartana',
    });
    expect(saida.medicamentos).toHaveLength(2);
  });

  it('nome que nao existe: diz que nao achou e lista os em uso, sem inventar', () => {
    const saida = montar([remedio()], [], { filtro: 'atenolol' });
    expect(saida).toMatchObject({
      disponivel: true,
      naoEncontrado: true,
      medicamentos: [],
      nomesEmUso: ['Losartana'],
      explicacao: 'Nenhum remédio em uso tem esse nome.',
    });
  });
});

describe('ausencia de dado e resposta, nao erro (CA-9)', () => {
  it('sem marcacao nenhuma no periodo', () => {
    expect(montar([remedio()]).explicacao).toBe(
      'Não há nenhum horário marcado como tomado no aplicativo neste período.',
    );
  });

  it('sem remedio em uso', () => {
    expect(montar([])).toMatchObject({
      disponivel: false,
      medicamentos: [],
      explicacao: 'O usuário não tem remédio em uso cadastrado no aplicativo.',
    });
  });

  it('com marcacao, nao ha explicacao de vazio', () => {
    expect(montar([remedio()], [marca('2026-10-21', '08:00')]).explicacao).toBeUndefined();
  });
});

describe('os tetos (CA-11)', () => {
  it('15 remedios, em ordem de nome, e os outros contados', () => {
    const remedios = Array.from({ length: 20 }, (_, i) => {
      const n = String(20 - i).padStart(2, '0');
      return remedio({ id: `med-${n}`, name: `Remédio ${n}` });
    });
    const saida = montar(remedios);
    expect(saida.medicamentos).toHaveLength(15);
    expect(saida.medicamentos[0].nome).toBe('Remédio 01');
    expect(saida.omitidos).toBe(5);
  });

  it('14 horarios sem marcacao por remedio, do mais recente, e os outros contados', () => {
    const doses = unico([remedio({ times: ['08:00'], startDate: '2026-09-01' })], [], { dias: 30 });
    expect(doses.contagem.semMarcacao).toBe(30);
    expect(doses.semMarcacao).toHaveLength(14);
    expect(doses.semMarcacao[0].data).toBe('2026-10-21');
    expect(doses.semMarcacao[13].data).toBe('2026-10-08');
    expect(doses.semMarcacaoOmitidos).toBe(16);
  });
});

describe('o que a saida NAO traz (CA-12)', () => {
  it('nem identificador, nem dose, nem estoque, nem juizo', () => {
    const chaves: string[] = [];
    const varrer = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(varrer);
      else if (v && typeof v === 'object') {
        for (const [k, filho] of Object.entries(v)) {
          chaves.push(k);
          varrer(filho);
        }
      }
    };
    varrer(montar([remedio({ takenToday: '{"date":"2026-10-21","times":["08:00"]}' })], semanaMarcadaMenos()));

    expect(chaves.length).toBeGreaterThan(10);
    for (const proibida of ['id', 'medicineId', 'owner', 'takenAt', 'stockAdjusted', 'dosage', 'doseRegistrada', 'currentStock']) {
      expect(chaves).not.toContain(proibida);
    }
    expect(chaves.filter((k) => /adesao|emDia|percent|atrasad/i.test(k))).toEqual([]);
  });
});

describe('agoraNoFuso (Review Focus 1 e D3.5)', () => {
  it('sem UF, Brasilia: as 23:30 ainda e o mesmo dia, embora em UTC ja seja o seguinte', () => {
    expect(agoraNoFuso(new Date('2026-10-22T02:30:00Z'))).toEqual({ data: '2026-10-21', minutos: 1410 });
    expect(agoraNoFuso(new Date('2026-10-22T02:30:00Z'), 'SP')).toEqual({ data: '2026-10-21', minutos: 1410 });
  });

  it('com UF de outro fuso, o relogio da pessoa (D3.5)', () => {
    const instante = new Date('2026-10-21T12:01:00Z'); // 09:01 em Brasilia
    expect(agoraNoFuso(instante, 'AC')).toEqual({ data: '2026-10-21', minutos: 7 * 60 + 1 });
    expect(agoraNoFuso(instante, 'AM')).toEqual({ data: '2026-10-21', minutos: 8 * 60 + 1 });
    expect(agoraNoFuso(instante, 'MS')).toEqual({ data: '2026-10-21', minutos: 8 * 60 + 1 });
  });

  it('UF desconhecida cai em Brasilia', () => {
    expect(agoraNoFuso(new Date('2026-10-21T12:01:00Z'), 'XX')).toEqual({ data: '2026-10-21', minutos: 9 * 60 + 1 });
  });
});

describe('revisao do E3: contagem, filtro e explicacao', () => {
  it('horario repetido no cadastro conta uma vez so, e a contagem fecha', () => {
    const doses = unico([remedio({ times: ['08:00', '08:00'] })], [marca('2026-10-21', '08:00')], { dias: 1 });
    expect(doses.hoje).toEqual([{ horario: '08:00', situacao: 'marcado' }]);
    const { horariosEsperados, marcados, semMarcacao, pendentes } = doses.contagem;
    expect(marcados + semMarcacao + pendentes).toBe(horariosEsperados);
  });

  it('filtro que perde as letras na normalizacao ("b12") nao vira "contem b"', () => {
    const saida = montar([remedio({ name: 'Vitamina B12' }), remedio({ id: 'med-2', name: 'Ibuprofeno' })], [], {
      filtro: 'b12',
    });
    expect(saida.medicamentos.map((m) => m.nome)).toEqual(['Vitamina B12']);
  });

  it('filtro so com a dose ("50mg") casa pela palavra inteira', () => {
    const saida = montar([remedio({ name: 'Losartana 50mg' }), remedio({ id: 'med-2', name: 'Metformina 850mg' })], [], {
      filtro: '50mg',
    });
    expect(saida.medicamentos.map((m) => m.nome)).toEqual(['Losartana 50mg']);
  });

  it('so marcacao fora do horario: nao diz que nao ha marcacao, diz que os horarios mudaram', () => {
    const saida = montar([remedio()], [marca('2026-10-15', '07:00')]);
    expect(saida.explicacao).toBe('Os dias anteriores são contados com os horários cadastrados hoje.');
  });
});
