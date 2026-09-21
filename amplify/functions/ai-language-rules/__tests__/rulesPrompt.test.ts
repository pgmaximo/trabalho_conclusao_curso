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

  it('o proprio bloco de regras passa na verificacao', () => {
    // Se o texto que instrui o modelo nao passasse na propria verificacao, a
    // primeira coisa que o modelo leria seria um contraexemplo.
    expect(checkLanguageRules(LANGUAGE_RULES_PROMPT, { questionKind: 'operacional' }).ok).toBe(true);
  });
});
