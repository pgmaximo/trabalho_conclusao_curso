/**
 * O agrupamento da gaveta de histórico (C9).
 *
 * É lógica pura, testada como função e não através de uma renderização: os
 * casos que importam são de FRONTEIRA — a conversa de 23h59 de ontem, a de
 * exatamente sete dias atrás —, e montar uma tela para cada um deles
 * esconderia a regra em vez de mostrá-la.
 */
import { agruparPorPeriodo } from '@/utils/conversationGrouping';

/**
 * As datas sao montadas no fuso DO APARELHO, e nao em UTC, porque o corte do
 * agrupamento e por dia de calendario local -- "ontem" significa ontem para a
 * pessoa. Escrever `2026-09-17T00:10:00Z` neste teste seria escrever 21h10 do
 * dia 16 no Brasil, e o caso deixaria de ser o que ele diz ser.
 */
function local(ano: number, mes: number, dia: number, hora = 12, minuto = 0): string {
  return new Date(ano, mes - 1, dia, hora, minuto).toISOString();
}

const AGORA = new Date(2026, 8, 17, 15, 0);

function conversa(id: string, lastMessageAt: string | null, title = `conversa ${id}`) {
  return { id, title, lastMessageAt, startedAt: lastMessageAt, messageCount: 2 };
}

describe('agruparPorPeriodo', () => {
  it('separa hoje, ontem, os últimos 7 dias e o resto', () => {
    const grupos = agruparPorPeriodo(
      [
        conversa('a', local(2026, 9, 17, 9)),
        conversa('b', local(2026, 9, 16, 9)),
        conversa('c', local(2026, 9, 13, 9)),
        conversa('d', local(2026, 6, 1, 9)),
      ],
      AGORA,
    );
    expect(grupos.map((g) => g.group)).toEqual([
      'Hoje',
      'Ontem',
      'Últimos 7 dias',
      'Mais antigas',
    ]);
  });

  it('grupo sem conversa nenhuma NAO aparece', () => {
    // Um cabeçalho "Ontem" sobre uma lista vazia faz a pessoa procurar o que
    // não existe.
    const grupos = agruparPorPeriodo([conversa('a', local(2026, 9, 17, 9))], AGORA);
    expect(grupos.map((g) => g.group)).toEqual(['Hoje']);
  });

  it('a conversa de 23h59 de ontem cai em Ontem, e nao em Hoje', () => {
    // O corte é por DIA DE CALENDÁRIO, não por 24 horas. "Ontem" significa
    // ontem para a pessoa, não "entre 24 e 48 horas atrás".
    const grupos = agruparPorPeriodo([conversa('a', local(2026, 9, 16, 23, 59))], AGORA);
    expect(grupos[0].group).toBe('Ontem');
  });

  it('a conversa de hoje de madrugada cai em Hoje', () => {
    const grupos = agruparPorPeriodo([conversa('a', local(2026, 9, 17, 0, 10))], AGORA);
    expect(grupos[0].group).toBe('Hoje');
  });

  it('dentro do grupo, a mais recente vem primeiro', () => {
    const grupos = agruparPorPeriodo(
      [conversa('cedo', local(2026, 9, 17, 8)), conversa('tarde', local(2026, 9, 17, 14))],
      AGORA,
    );
    expect(grupos[0].items.map((i) => i.id)).toEqual(['tarde', 'cedo']);
  });

  it('conversa sem data NAO some -- ela vai para o fim', () => {
    // Uma conversa que existe e não aparece na gaveta é uma conversa que a
    // pessoa não consegue abrir nem apagar.
    const grupos = agruparPorPeriodo(
      [conversa('a', local(2026, 9, 17, 9)), conversa('sem-data', null)],
      AGORA,
    );
    const todos = grupos.flatMap((g) => g.items.map((i) => i.id));
    expect(todos).toContain('sem-data');
    expect(todos.at(-1)).toBe('sem-data');
  });

  it('lista vazia devolve nenhum grupo, e nao um grupo vazio', () => {
    expect(agruparPorPeriodo([], AGORA)).toEqual([]);
  });

  it('nenhum rótulo de grupo interpreta a conversa', () => {
    // Os rótulos são de TEMPO. "Conversas importantes" ou "Sobre seus exames"
    // exigiriam ler o conteúdo e classificá-lo, que é o que este projeto não
    // faz com dado de saúde.
    const grupos = agruparPorPeriodo(
      [
        conversa('a', local(2026, 9, 17, 9)),
        conversa('b', local(2026, 9, 16, 9)),
        conversa('c', local(2026, 9, 13, 9)),
        conversa('d', local(2026, 6, 1, 9)),
      ],
      AGORA,
    );
    for (const g of grupos) {
      expect(g.group.toLowerCase()).not.toMatch(/importante|exame|saúde|resultado/);
    }
  });
});
