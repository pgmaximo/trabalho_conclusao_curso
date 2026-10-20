/**
 * A saida de `consultar_wearable_dias` (E6, 6.1 e 6.2): o recorte dia a dia e a
 * comparacao de dois periodos, sobre a serie ja lida. As regras de recorte
 * estao na tabela do plan.md do E6, secao 4. A data de hoje nao entra em
 * nenhuma: a importacao e manual e os dados param no dia da exportacao.
 */
import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { caminhoDaTela } from '../mapaDoApp';
import type { SerieDiaria } from '../tools/serieDiaria';
import { somarDias } from '../tools/serieDiaria';
import { montarSaidaDeDias, renderizarWearableDias } from '../tools/wearableDiasSaida';

const PERIODO = { inicio: '2026-09-01', fim: '2026-10-12' };

/** Sono todo dia de `de` a `ate`, menos os dias em `sem`. */
function sono(de: string, ate: string, valor = 400, sem: string[] = []) {
  const pontos = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) if (!sem.includes(d)) pontos.push({ dia: d, valor });
  return pontos;
}

const SERIE: SerieDiaria = { sleepMinutes: sono('2026-09-01', '2026-10-12', 400, ['2026-10-09']) };

type Saida = Record<string, any>;
const dias = (pedido: Record<string, unknown>, serie = SERIE, periodo = PERIODO) =>
  montarSaidaDeDias(serie, periodo, { metrica: 'sono', ...pedido } as never) as Saida;

afterEach(() => jest.useRealTimers());

describe('caminhoDaTela', () => {
  it('o caminho do mapa do app, em toques', () => {
    expect(caminhoDaTela('import-health-data')).toBe('Mais > Dados do smartwatch > Importar');
  });

  it('rota desconhecida e erro de programacao', () => {
    expect(() => caminhoDaTela('nao-existe')).toThrow();
  });
});

describe('recorte dia a dia', () => {
  it('C1.1: um dia, com o dia da semana do codigo, ate quando vao os dados e a nota do sono', () => {
    const s = dias({ de: '2026-10-08' });
    expect(s).toMatchObject({
      disponivel: true,
      tipo: 'dias',
      de: '2026-10-08',
      ate: '2026-10-08',
      dadosAte: '2026-10-12',
      dadosDesde: '2026-09-01',
      dias: [{ dia: '2026-10-08', diaDaSemana: 'quinta-feira', valor: '6 h 40 min' }],
    });
    expect(s.notaDoSono).toMatch(/noite que terminou/);
    expect(s.comoAtualizar).toContain(caminhoDaTela('import-health-data'));
  });

  it('C1.2 e C1.6: sete dias em ordem; dia sem ponto e "sem registro", nunca zero', () => {
    const s = dias({ de: '2026-10-06', ate: '2026-10-12' });
    expect(s.dias.map((d: Saida) => d.dia)).toEqual([
      '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12',
    ]);
    expect(s.dias[3]).toEqual({ dia: '2026-10-09', diaDaSemana: 'sexta-feira', semRegistro: true });
    expect(s.resumo).toEqual({ media: '6 h 40 min', diasComRegistro: 6, dias: 7 });
    expect(s.diasOmitidos).toBe(0);
    expect(s.diasDepoisDosDados).toBe(0);
  });

  it('C1.3: recorte longo traz o resumo inteiro e so os 14 dias mais recentes', () => {
    const s = dias({ de: '2026-09-01', ate: '2026-10-12' });
    expect(s.dias).toHaveLength(14);
    expect(s.dias[0].dia).toBe('2026-09-29');
    expect(s.diasOmitidos).toBe(28);
    expect(s.resumo.dias).toBe(42);
  });

  it('C1.4: sem datas, os 7 dias ate o fim dos dados -- nunca ate hoje', () => {
    const s = dias({});
    expect([s.de, s.ate]).toEqual(['2026-10-06', '2026-10-12']);
    jest.useFakeTimers().setSystemTime(new Date('2027-05-01T12:00:00Z'));
    expect(dias({})).toEqual(s);
  });

  it('so `ate`: os 7 dias que terminam nele', () => {
    const s = dias({ ate: '2026-10-01' });
    expect([s.de, s.ate]).toEqual(['2026-09-25', '2026-10-01']);
  });

  it('C1.5: dia depois dos dados -- ausencia, ate quando vao, e como atualizar', () => {
    const s = dias({ de: '2026-10-15' });
    expect(s.disponivel).toBe(false);
    expect(s.explicacao).toContain('12/10/2026');
    expect(s.explicacao).toContain(caminhoDaTela('import-health-data'));
    expect(s.comoAtualizar).toContain(caminhoDaTela('import-health-data'));
  });

  it('C1.5: dia antes do comeco dos dados', () => {
    const s = dias({ ate: '2026-08-01' });
    expect(s.disponivel).toBe(false);
    expect(s.explicacao).toContain('01/09/2026');
  });

  it('C1.5: recorte que passa do fim e cortado, com a conta do que ficou depois', () => {
    const s = dias({ de: '2026-10-10', ate: '2026-10-15' });
    expect([s.de, s.ate]).toEqual(['2026-10-10', '2026-10-12']);
    expect(s.diasDepoisDosDados).toBe(3);
  });

  it('o resumo de um recorte com pouco registro nao tem media, como nos periodos (code-review)', () => {
    const rala: SerieDiaria = { sleepMinutes: [{ dia: '2026-10-01', valor: 310 }] };
    const s = dias({ de: '2026-09-29', ate: '2026-10-12' }, rala);
    expect(s.resumo.media).toBeNull();
    expect(s.resumo.diasComRegistro).toBe(1);
    expect(s.resumo.semMediaPorque).toContain('1 de 14');
  });

  it('recorte que comeca antes dos dados e cortado no comeco', () => {
    const s = dias({ de: '2026-08-25', ate: '2026-09-03' });
    expect([s.de, s.ate]).toEqual(['2026-09-01', '2026-09-03']);
  });

  it('metrica que a importacao nunca trouxe: ausencia, com o nome dela', () => {
    const s = montarSaidaDeDias(SERIE, PERIODO, { metrica: 'estresse' }) as Saida;
    expect(s.disponivel).toBe(false);
    expect(s.explicacao).toContain('nível de estresse');
  });

  it('a nota do sono so vem para o sono', () => {
    const passos = montarSaidaDeDias({ steps: [{ dia: '2026-10-08', valor: 7430 }] }, PERIODO, {
      metrica: 'passos',
      de: '2026-10-08',
    }) as Saida;
    expect(passos.dias[0].valor).toBe('7.430 passos');
    expect(passos.notaDoSono).toBeUndefined();
  });
});

describe('dois periodos', () => {
  const LONGA: SerieDiaria = {
    sleepMinutes: [...sono('2026-08-01', '2026-09-12', 380), ...sono('2026-09-13', '2026-10-12', 412)],
  };
  const PERIODO_LONGO = { inicio: '2026-08-01', fim: '2026-10-12' };

  it('C2.1: sem datas, os 30 dias ate o fim dos dados contra os 30 anteriores, e a diferenca do codigo', () => {
    const s = dias({ comparar: true }, LONGA, PERIODO_LONGO);
    expect(s).toMatchObject({
      disponivel: true,
      tipo: 'periodos',
      atual: { de: '2026-09-13', ate: '2026-10-12', dias: 30, diasComRegistro: 30, media: '6 h 52 min' },
      anterior: { de: '2026-08-14', ate: '2026-09-12', dias: 30, diasComRegistro: 30, media: '6 h 20 min' },
      diferenca: '32 min a mais por dia no período atual',
      aviso: null,
    });
  });

  it('o periodo anterior cortado no comeco dos dados nao e diretamente comparavel', () => {
    const s = dias({ comparar: true });
    expect(s.atual).toMatchObject({ de: '2026-09-13', ate: '2026-10-12', dias: 30 });
    expect(s.anterior).toMatchObject({ de: '2026-09-01', ate: '2026-09-12', dias: 12 });
    expect(s.diferenca).toBeNull();
    expect(s.aviso).toMatch(/não são diretamente comparáveis/);
  });

  it('C2.2: periodos pedidos de tamanhos diferentes: as duas medias, sem diferenca', () => {
    const s = dias(
      { comparar: true, de: '2026-09-13', ate: '2026-10-12', compararDe: '2026-08-01', compararAte: '2026-08-10' },
      LONGA,
      PERIODO_LONGO,
    );
    expect(s.anterior).toMatchObject({ de: '2026-08-01', ate: '2026-08-10', dias: 10 });
    expect(s.diferenca).toBeNull();
    expect(s.aviso).toMatch(/não são diretamente comparáveis/);
  });

  it('compararDe sem `comparar` tambem compara', () => {
    const s = dias({ de: '2026-09-13', ate: '2026-10-12', compararDe: '2026-08-14', compararAte: '2026-09-12' }, LONGA, PERIODO_LONGO);
    expect(s.tipo).toBe('periodos');
    expect(s.diferenca).toBe('32 min a mais por dia no período atual');
  });

  it('C2.3: menos de 7 dias com registro nao da media', () => {
    const pouco: SerieDiaria = { sleepMinutes: [...sono('2026-08-01', '2026-08-06', 380), ...sono('2026-09-13', '2026-10-12', 412)] };
    const s = dias({ comparar: true, de: '2026-09-13', ate: '2026-10-12', compararDe: '2026-08-01', compararAte: '2026-08-30' }, pouco, PERIODO_LONGO);
    expect(s.anterior.media).toBeNull();
    expect(s.anterior.semMediaPorque).toContain('6');
    expect(s.diferenca).toBeNull();
  });

  it('C2.3: menos da metade dos dias com registro nao da media', () => {
    const metade: SerieDiaria = {
      sleepMinutes: [...sono('2026-08-01', '2026-08-08', 380), ...sono('2026-09-13', '2026-10-12', 412)],
    };
    const s = dias({ comparar: true, de: '2026-09-13', ate: '2026-10-12', compararDe: '2026-08-01', compararAte: '2026-08-20' }, metade, PERIODO_LONGO);
    expect(s.anterior).toMatchObject({ dias: 20, diasComRegistro: 8, media: null });
  });

  it('C2.5: periodos com dias em comum nao sao comparados', () => {
    const s = dias({ comparar: true, de: '2026-09-13', ate: '2026-10-12', compararDe: '2026-09-01', compararAte: '2026-09-30' }, LONGA, PERIODO_LONGO);
    expect(s.diferenca).toBeNull();
    expect(s.aviso).toMatch(/dias em comum/);
  });

  it('importacao sem dias antes do periodo atual: o aviso diz isso, e nao "dias diferentes" (revisao)', () => {
    const curta: SerieDiaria = { sleepMinutes: sono('2026-09-13', '2026-10-12', 412) };
    const s = dias({ comparar: true }, curta, { inicio: '2026-09-13', fim: '2026-10-12' });
    expect(s.anterior.dias).toBe(0);
    expect(s.aviso).toBe('A importação não tem dias antes de 13/09/2026, e por isso não há período anterior para comparar.');
  });

  it('periodo pedido para comparar fora dos dados: o aviso diz isso, e nao "antes de" (code-review)', () => {
    const s = dias({ comparar: true, compararDe: '2026-11-01', compararAte: '2026-11-30' });
    expect(s.anterior.dias).toBe(0);
    expect(s.aviso).toBe('O período pedido para comparar fica fora dos dados da importação, que vão de 01/09/2026 a 12/10/2026.');
  });

  it('periodo atual que passa do fim dos dados conta os dias cortados (revisao)', () => {
    const s = dias({ comparar: true, de: '2026-10-01', ate: '2026-10-20' });
    expect(s.atual).toMatchObject({ de: '2026-10-01', ate: '2026-10-12' });
    expect(s.diasDepoisDosDados).toBe(8);
  });

  it('C2.4: mesma media depois do arredondamento', () => {
    const igual: SerieDiaria = { sleepMinutes: sono('2026-08-01', '2026-10-12', 400) };
    expect(dias({ comparar: true }, igual, PERIODO_LONGO).diferenca).toBe('a mesma média nos dois períodos');
  });
});

describe('o tamanho da saida (spec, secao 5: abaixo de 600 tokens)', () => {
  it('no pior caso, 14 dias de passos com o resumo, cabe em 2.400 caracteres', () => {
    const passos: SerieDiaria = { steps: sono('2026-09-01', '2026-10-12', 12345) };
    const s = montarSaidaDeDias(passos, PERIODO, { metrica: 'passos', de: '2026-09-01', ate: '2026-10-12' });
    expect(JSON.stringify(s).length).toBeLessThan(2400);
  });
});

describe('renderizarWearableDias (modo degradado)', () => {
  it('uma linha por dia, com "sem registro" no dia sem ponto', () => {
    const b = renderizarWearableDias(dias({ de: '2026-10-08', ate: '2026-10-09' }))!;
    expect(b.linhas).toContain('quinta-feira, 08/10/2026: 6 h 40 min');
    expect(b.linhas).toContain('sexta-feira, 09/10/2026: sem registro');
    expect(b.linhas.join(' ')).toContain('12/10/2026');
  });

  it('dois periodos e a diferenca', () => {
    const LONGA: SerieDiaria = { sleepMinutes: [...sono('2026-08-01', '2026-09-12', 380), ...sono('2026-09-13', '2026-10-12', 412)] };
    const b = renderizarWearableDias(dias({ comparar: true }, LONGA, { inicio: '2026-08-01', fim: '2026-10-12' }))!;
    expect(b.linhas.join(' ')).toContain('32 min a mais por dia no período atual');
    expect(b.linhas.join(' ')).toContain('13/09/2026');
  });

  it('ausencia nao tem bloco', () => {
    expect(renderizarWearableDias(dias({ de: '2026-10-15' }))).toBeNull();
  });

  // A R2 (encaminhamento) fica de fora: quem o acrescenta e a montagem do modo
  // degradado, e nao o bloco de cada ferramenta (como no teste do E10).
  it('nenhuma linha do degradado viola as regras, fora a R2', () => {
    const fc = montarSaidaDeDias({ restingHeartRateBpm: sono('2026-10-01', '2026-10-12', 58) }, PERIODO, { metrica: 'fc_repouso' });
    for (const saida of [dias({ de: '2026-10-06', ate: '2026-10-12' }), fc]) {
      const r = checkLanguageRules(renderizarWearableDias(saida)!.linhas.join('. '), { questionKind: 'clinica', temOrigem: true });
      expect(r.ok ? [] : r.violations.filter((v) => v.rule !== 'R2')).toEqual([]);
    }
  });
});
