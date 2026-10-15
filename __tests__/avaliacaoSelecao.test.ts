/**
 * Bloco 11 -- a medicao da R1 antes e depois do vocabulario no prompt (E7).
 *
 * A rodada inteira sao 22 perguntas. Medir o efeito de uma instrucao sobre tres
 * delas pede rodar SO essas tres, varias vezes cada: uma vez so e sorte, e o
 * modelo nao e deterministico nem com temperatura baixa.
 */
import { BANCO_DE_PERGUNTAS, selecionarPerguntas } from '../scripts/avaliacao/bancoDePerguntas';

describe('selecionarPerguntas', () => {
  it('sem filtro e com uma repeticao, e o banco inteiro, com os ids de sempre', () => {
    const lista = selecionarPerguntas(BANCO_DE_PERGUNTAS, undefined, 1);
    expect(lista.map((p) => p.id)).toEqual(BANCO_DE_PERGUNTAS.map((p) => p.id));
  });

  it('filtra pelos ids pedidos, na ordem do banco', () => {
    const lista = selecionarPerguntas(BANCO_DE_PERGUNTAS, ['r1c', 'r1a'], 1);
    expect(lista.map((p) => p.id)).toEqual(['r1a', 'r1c']);
  });

  it('repete cada pergunta, e o id diz qual rodada e', () => {
    const lista = selecionarPerguntas(BANCO_DE_PERGUNTAS, ['r1a', 'r1b'], 3);
    expect(lista.map((p) => p.id)).toEqual(['r1a#1', 'r1a#2', 'r1a#3', 'r1b#1', 'r1b#2', 'r1b#3']);
    expect(lista[1].pergunta).toBe(lista[0].pergunta);
  });

  it('id que nao existe no banco e erro, e nao uma rodada vazia', () => {
    expect(() => selecionarPerguntas(BANCO_DE_PERGUNTAS, ['r1a', 'nao-existe'], 1)).toThrow(/nao-existe/);
  });

  it('repeticao menor que 1 e erro', () => {
    expect(() => selecionarPerguntas(BANCO_DE_PERGUNTAS, undefined, 0)).toThrow();
  });
});
