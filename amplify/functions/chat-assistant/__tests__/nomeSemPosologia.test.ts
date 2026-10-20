/**
 * Resumo do arquivo:
 * O corte do nome do remedio antes do primeiro numero (D4.2), agora num modulo
 * proprio (E11). Ele saiu de `receitasSaida.ts` porque o validador da acao
 * proposta precisa da MESMA regra, e `receitasSaida.ts` importa o SDK da AWS;
 * uma segunda copia divergiria, e a divergencia deixaria a dose entrar pelo
 * nome no lembrete.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { nomeSemPosologia } from '../tools/nomeSemPosologia';

const FONTE = readFileSync(join(__dirname, '..', 'tools', 'nomeSemPosologia.ts'), 'utf8');

describe('nomeSemPosologia (E11, regra do E4)', () => {
  it('corta antes do primeiro numero', () => {
    expect(nomeSemPosologia('vitamina d 2000 ui')).toBe('vitamina d');
  });

  it('limpa cada parte de uma combinacao', () => {
    expect(nomeSemPosologia('Amoxicilina 875 + Clavulanato 125mg')).toBe('Amoxicilina + Clavulanato');
  });

  it('nome sem numero fica como esta', () => {
    expect(nomeSemPosologia('losartana')).toBe('losartana');
  });

  it('so posologia vira texto vazio, e nao o rotulo de ilegivel das receitas', () => {
    expect(nomeSemPosologia('500mg')).toBe('');
  });

  it('nao carrega o SDK da AWS nem a porta de leitura', () => {
    expect(FONTE).not.toMatch(/@aws-sdk|ownerScopedRead/);
  });
});
