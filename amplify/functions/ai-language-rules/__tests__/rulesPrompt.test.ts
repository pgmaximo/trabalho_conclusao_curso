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

  it('o proprio bloco de regras passa na verificacao', () => {
    // Se o texto que instrui o modelo nao passasse na propria verificacao, a
    // primeira coisa que o modelo leria seria um contraexemplo.
    expect(checkLanguageRules(LANGUAGE_RULES_PROMPT, { questionKind: 'operacional' }).ok).toBe(true);
  });
});
