/**
 * Resumo do arquivo:
 * O texto do bloco de data do turno (E1, D1.1 e D1.2). O que importa provar e
 * o fuso: a funcao roda em UTC, e entre 21h e meia-noite de Brasilia o UTC ja
 * e o dia seguinte -- "amanha" sairia um dia errado justamente a noite, quando
 * a pessoa confere a agenda do dia seguinte.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { montarContextoDeHoje } from '../contextoDeHoje';

const PREFIXO = 'Data e hora deste turno, informadas pelo aplicativo: hoje é ';

describe('montarContextoDeHoje', () => {
  it('vira o dia pelo fuso de Brasilia, e nao pelo UTC', () => {
    expect(montarContextoDeHoje(new Date('2026-10-18T01:30:00Z'))).toBe(
      `${PREFIXO}sábado, 17/10/2026, e agora são 22h30 no horário de Brasília.`,
    );
    expect(montarContextoDeHoje(new Date('2026-10-18T03:00:00Z'))).toBe(
      `${PREFIXO}domingo, 18/10/2026, e agora são 00h00 no horário de Brasília.`,
    );
  });

  it('hora e minuto sempre com dois digitos', () => {
    expect(montarContextoDeHoje(new Date('2026-10-19T12:05:00Z'))).toContain(
      'hoje é segunda-feira, 19/10/2026, e agora são 09h05',
    );
    expect(montarContextoDeHoje(new Date('2026-01-05T03:07:00Z'))).toContain(
      '05/01/2026, e agora são 00h07',
    );
  });

  it.each([
    ['2026-10-18T15:00:00Z', 'domingo'],
    ['2026-10-19T15:00:00Z', 'segunda-feira'],
    ['2026-10-20T15:00:00Z', 'terça-feira'],
    ['2026-10-21T15:00:00Z', 'quarta-feira'],
    ['2026-10-22T15:00:00Z', 'quinta-feira'],
    ['2026-10-23T15:00:00Z', 'sexta-feira'],
    ['2026-10-24T15:00:00Z', 'sábado'],
  ])('%s cai num(a) %s', (iso, dia) => {
    expect(montarContextoDeHoje(new Date(iso))).toContain(`hoje é ${dia},`);
  });

  it('nao usa getters locais de Date, e o fuso esta num lugar so', () => {
    // O bloco de data e o corte de `consultar_consultas` precisam do MESMO
    // fuso: se um mudar sem o outro (D1.2 = B, depois), o modelo recebe um
    // "hoje" que discorda das futuras e passadas da ferramenta.
    const ler = (arquivo: string) => readFileSync(join(__dirname, '..', arquivo), 'utf8');
    const contexto = ler('contextoDeHoje.ts');
    const formato = ler('formatoPtBr.ts');
    for (const fonte of [contexto, formato]) {
      expect(fonte).not.toMatch(/\.get(Hours|Minutes|Date|Day|Month|FullYear)\(/);
    }
    expect(contexto).not.toContain('America/Sao_Paulo');
    expect(contexto.match(/^import .*$/gm)).toEqual([
      "import { partesEmSaoPaulo } from './formatoPtBr';",
    ]);
    expect(formato.match(/'America\/Sao_Paulo'/g)).toHaveLength(1);
  });
});
