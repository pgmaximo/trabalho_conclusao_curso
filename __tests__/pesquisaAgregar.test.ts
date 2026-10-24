/**
 * Resumo do arquivo:
 * As contas do painel de resultados e o CSV da pesquisa da feira
 * (infra/site-pesquisa/agregar.mjs). Sao funcoes puras: o painel
 * (`resultados.html`) e o script `pesquisa:exportar` so desenham o que elas
 * devolvem, entao o numero que o grupo le e o que este teste confere.
 */
import { agregar, paraCsv } from '../infra/site-pesquisa/agregar.mjs';
import { PERGUNTAS } from '../infra/site-pesquisa/pesquisa.mjs';

type Item = Record<string, unknown>;

const resposta = (id: string, respostas: Item, extra: Item = {}): Item => ({
  id,
  tipo: 'resposta',
  versaoDoFormulario: '1',
  criadoEm: '2026-10-24T15:00:00.000Z',
  atualizadoEm: '2026-10-24T15:00:00.000Z',
  etapa: 11,
  concluido: true,
  respostas,
  ...extra,
});
const clique = (origem: string): Item => ({
  id: `clique-${origem}-${Math.random()}`,
  tipo: 'clique',
  origem,
  criadoEm: '2026-10-24T15:00:00.000Z',
});

describe('agregar', () => {
  it('conta respondentes e concluidas, e nao conta cliques como resposta', () => {
    const r = agregar([
      resposta('a', { usaria: 'usaria' }),
      resposta('b', { usaria: 'nao_sei' }, { concluido: false, etapa: 4 }),
      clique('inicio'),
    ]);
    expect(r.respondentes).toBe(2);
    expect(r.concluidas).toBe(1);
  });

  it('ignora item de tipo desconhecido em vez de contar como resposta', () => {
    const r = agregar([{ id: 'x', tipo: 'outra-coisa', respostas: { usaria: 'usaria' } }, resposta('a', {})] as Item[]);
    expect(r.respondentes).toBe(1);
    expect(r.unicas.usaria).toBeUndefined();
  });

  it('soma os cliques por origem', () => {
    const r = agregar([clique('inicio'), clique('inicio'), clique('fim'), resposta('a', {})]);
    expect(r.cliques).toEqual({ inicio: 2, fim: 1 });
  });

  it('conta escolha unica e multipla, e guarda quantas pessoas responderam cada pergunta', () => {
    const r = agregar([
      resposta('a', { usaria: 'usaria', barreiras: ['privacidade', 'so_iphone'] }),
      resposta('b', { usaria: 'usaria', barreiras: ['privacidade'] }),
      resposta('c', { usaria: 'nao_sei' }),
    ]);
    expect(r.unicas.usaria).toEqual({ usaria: 2, nao_sei: 1 });
    expect(r.multiplas.barreiras).toEqual({ privacidade: 2, so_iphone: 1 });
    expect(r.bases).toEqual({ usaria: 3, barreiras: 2 });
  });

  it('cruza a faixa de idade com "usaria" ou "usaria muito", so entre quem respondeu as duas', () => {
    const r = agregar([
      resposta('a', { idade: '18_24', usaria: 'usaria_muito' }),
      resposta('b', { idade: '18_24', usaria: 'nao_sei' }),
      resposta('c', { idade: '18_24' }),
      resposta('d', { idade: '60_mais', usaria: 'usaria' }),
    ]);
    expect(r.porIdade).toEqual({
      '18_24': { total: 2, usariaAlto: 1 },
      '60_mais': { total: 1, usariaAlto: 1 },
    });
  });

  it('lista os comentarios nao vazios, do mais novo para o mais antigo, sem tocar no texto', () => {
    const r = agregar([
      resposta('a', { comentario: 'primeiro' }, { atualizadoEm: '2026-10-24T15:00:00.000Z' }),
      resposta('b', { comentario: '' }),
      resposta('c', { comentario: '<script>alert(1)</script>' }, { atualizadoEm: '2026-10-24T16:00:00.000Z' }),
    ]);
    expect(r.comentarios).toEqual(['<script>alert(1)</script>', 'primeiro']);
    expect(r.unicas.comentario).toBeUndefined();
  });

  it('nao quebra com lista vazia nem com itens malformados', () => {
    expect(agregar([])).toMatchObject({ respondentes: 0, concluidas: 0, cliques: { inicio: 0, fim: 0 }, comentarios: [] });
    expect(() => agregar([{}, { tipo: 'resposta' }, { tipo: 'resposta', respostas: null }, null, 42] as Item[])).not.toThrow();
    expect(agregar([{ tipo: 'resposta' }] as Item[]).respondentes).toBe(1);
  });
});

describe('paraCsv', () => {
  const linhas = (csv: string) => csv.split('\r\n').filter(Boolean);

  it('tem uma linha de cabecalho com os titulos das perguntas e uma linha por resposta, da mais antiga a mais nova', () => {
    const csv = paraCsv(
      [
        resposta('b', { usaria: 'usaria' }, { criadoEm: '2026-10-24T16:00:00.000Z' }),
        resposta('a', { usaria: 'nao_sei' }, { criadoEm: '2026-10-24T15:00:00.000Z' }),
        clique('fim'),
      ],
      PERGUNTAS,
    );
    const l = linhas(csv);
    expect(l).toHaveLength(3);
    expect(l[0].split(',').slice(0, 5)).toEqual(['Resposta', 'Início', 'Última atualização', 'Telas respondidas', 'Concluída']);
    expect(l[0]).toContain('Você usaria o SuaSaúde?');
    expect(l[1].startsWith('a,')).toBe(true);
    expect(l[2].startsWith('b,')).toBe(true);
  });

  it('mostra o texto da opcao (e nao o codigo), junta as multiplas com "; " e escreve sim ou nao em Concluida', () => {
    const csv = paraCsv(
      [resposta('a', { usaria: 'usaria_muito', barreiras: ['privacidade', 'so_iphone'] }, { concluido: false })],
      PERGUNTAS,
    );
    const linha = linhas(csv)[1];
    expect(linha).toContain('Usaria muito');
    expect(linha).toContain('Preocupação com a privacidade dos meus dados; Só tenho iPhone');
    expect(linha).toContain(',não,');
  });

  it('protege virgula, aspas e quebra de linha do comentario', () => {
    const csv = paraCsv([resposta('a', { comentario: 'Gostei, mas "faltou"\nlembrar' })], PERGUNTAS);
    expect(csv).toContain('"Gostei, mas ""faltou""\nlembrar"');
  });

  it.each(['=1+1', '+1', '-1', '@SOMA(A1)'])('neutraliza comentario que a planilha leria como formula: %s', (texto) => {
    const csv = paraCsv([resposta('a', { comentario: texto })], PERGUNTAS);
    expect(csv).toContain(`'${texto}`);
    expect(csv).not.toMatch(new RegExp(`(^|,)${texto.replace(/[+()@=]/g, '\\$&')}(,|\\r|$)`));
  });

  it('com lista vazia devolve so o cabecalho', () => {
    expect(linhas(paraCsv([], PERGUNTAS))).toHaveLength(1);
  });
});
