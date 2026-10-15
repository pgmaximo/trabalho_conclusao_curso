import { checkLanguageRules } from '../languageRules';
import { LANGUAGE_RULES_PROMPT } from '../rulesPrompt';

describe('LANGUAGE_RULES_PROMPT', () => {
  it('cita as cinco regras -- o prompt e a verificacao nao podem divergir calados', () => {
    for (const regra of ['R1', 'R2', 'R3', 'R4', 'R5']) {
      expect(LANGUAGE_RULES_PROMPT).toContain(regra);
    }
  });

  it('nao contem o termo vetado -- nem o prompt escreve a palavra que proibe', () => {
    const RAIZ = ['fi', 'na', 'l'].join('');
    expect(LANGUAGE_RULES_PROMPT.toLowerCase()).not.toContain(RAIZ);
  });

  it('diz que quem escreve o encaminhamento e o APLICATIVO (C3)', () => {
    // Decisao C3 do Bloco 9. Enquanto o encaminhamento fosse prosa gerada, ele
    // carregava o que prosa gerada carrega: na conversa real de 2026-09-18 ele
    // veio com "o especialista que solicitou o exame" -- dois fatos que o
    // aplicativo nao sabe -- e com "se tiver algum valor que te preocupa", que
    // nao julga mas convida a julgar.
    expect(LANGUAGE_RULES_PROMPT).toMatch(/o aplicativo acrescenta/i);
    expect(LANGUAGE_RULES_PROMPT).toMatch(/n[aã]o escreva esse encaminhamento/i);
  });

  it('NAO manda mais o modelo sugerir especialidade', () => {
    expect(LANGUAGE_RULES_PROMPT).not.toMatch(/qual especialidade/i);
  });

  it('a R1 alcanca os sentidos inocentes, e diz o que usar no lugar de cada um (Bloco 11)', () => {
    // Medido em 2026-09-24, nove turnos: 2 reprovacoes por R1 na primeira
    // geracao, e UMA virou resposta perdida (a segunda caiu na R3). As duas
    // vieram da pergunta que usa a palavra no sentido de POSICAO no documento;
    // o outro sentido que a rodada provoca e o de PROPOSITO do exame. O modelo
    // nao sabia qual era "a palavra que encerra uma questao" -- e repetia a da
    // pergunta.
    const r1 = LANGUAGE_RULES_PROMPT.split('R2 —')[0];
    expect(r1).toMatch(/nenhum sentido/i);
    expect(r1).toMatch(/no fim/i);
    expect(r1).toMatch(/para que serve/i);
    expect(r1).toMatch(/sem repeti-la/i);
  });

  it('o proprio bloco de regras passa na verificacao', () => {
    // Se o texto que instrui o modelo nao passasse na propria verificacao, a
    // primeira coisa que o modelo leria seria um contraexemplo.
    expect(checkLanguageRules(LANGUAGE_RULES_PROMPT, { questionKind: 'operacional' }).ok).toBe(true);
  });
});
