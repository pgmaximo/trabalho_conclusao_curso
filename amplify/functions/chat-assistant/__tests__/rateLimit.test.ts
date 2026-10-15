/**
 * O plano declara `rateLimit.ts` na estrutura de arquivos e a lista de tarefas
 * exige "limite de chamadas por dono -- sem isso, o endereco direto e uma
 * conta de Bedrock aberta", mas NENHUMA tarefa do plano especifica o arquivo.
 * Este teste e o contrato que faltava, escrito antes do codigo.
 */
import {
  JANELA_MS,
  MAX_POR_JANELA,
  checkRateLimit,
  resetRateLimit,
} from '../rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('deixa passar ate o teto da janela', () => {
    for (let i = 0; i < MAX_POR_JANELA; i += 1) {
      expect(checkRateLimit('dono-1', 1000)).toEqual({ allowed: true });
    }
  });

  it('recusa a chamada seguinte dentro da mesma janela', () => {
    for (let i = 0; i < MAX_POR_JANELA; i += 1) checkRateLimit('dono-1', 1000);
    const decisao = checkRateLimit('dono-1', 1000);
    expect(decisao.allowed).toBe(false);
  });

  it('diz em quantos segundos vale tentar de novo', () => {
    // Sem isso a tela so pode dizer "tente mais tarde", que e a copy que o
    // estudo de linguagem chama de inutil: manda a pessoa adivinhar.
    for (let i = 0; i < MAX_POR_JANELA; i += 1) checkRateLimit('dono-1', 1000);
    const decisao = checkRateLimit('dono-1', 1000 + JANELA_MS / 2);
    expect(decisao).toEqual({ allowed: false, retryAfterSeconds: expect.any(Number) });
    if (!decisao.allowed) {
      expect(decisao.retryAfterSeconds).toBeGreaterThan(0);
      expect(decisao.retryAfterSeconds).toBeLessThanOrEqual(JANELA_MS / 1000);
    }
  });

  it('volta a deixar passar quando a janela vira', () => {
    for (let i = 0; i < MAX_POR_JANELA; i += 1) checkRateLimit('dono-1', 1000);
    expect(checkRateLimit('dono-1', 1000 + JANELA_MS + 1)).toEqual({ allowed: true });
  });

  it('e uma janela DESLIZANTE, e nao um balde que zera de periodo em periodo', () => {
    // Num balde fixo, quem gasta o teto no fim de um periodo recebe o teto
    // INTEIRO um segundo depois -- o dobro das chamadas em dois segundos. Na
    // janela deslizante abrem exatamente as vagas que expiraram, e nem uma a
    // mais.
    for (let i = 0; i < MAX_POR_JANELA; i += 1) checkRateLimit('dono-1', 1000 + i);

    // Neste instante expiraram as chamadas feitas em 1000 e em 1001: duas.
    const agora = 1000 + JANELA_MS + 1;
    expect(checkRateLimit('dono-1', agora).allowed).toBe(true);
    expect(checkRateLimit('dono-1', agora).allowed).toBe(true);
    expect(checkRateLimit('dono-1', agora).allowed).toBe(false);
  });

  it('conta POR DONO -- o limite de um nao atinge o outro', () => {
    // Um limite global transformaria uma pessoa em negacao de servico para
    // todas as outras.
    for (let i = 0; i < MAX_POR_JANELA; i += 1) checkRateLimit('dono-1', 1000);
    expect(checkRateLimit('dono-2', 1000)).toEqual({ allowed: true });
  });

  it('esquece dono inativo, para a memoria nao crescer sem limite', () => {
    // A instancia da Lambda vive por horas e atende muitos donos; guardar
    // todos para sempre e um vazamento lento.
    checkRateLimit('dono-antigo', 1000);
    for (let i = 0; i < 50; i += 1) checkRateLimit(`dono-${i}`, 1000 + JANELA_MS * 2);
    expect(donosLembrados()).not.toContain('dono-antigo');
  });
});

function donosLembrados(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../rateLimit') as { donosEmMemoria: () => string[] }).donosEmMemoria();
}
