/**
 * A frase fixa da comparacao (E10, D10.1 = B): escrita pelo aplicativo, no fim,
 * so quando houve par -- e nunca duas vezes.
 */
import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { costurarComparacao, TEXTO_DA_COMPARACAO } from '../comparacaoFixa';

const COM_PAR = [
  { name: 'consultar_comparacao', output: { disponivel: true, pares: [{ exame: { id: 'l1' } }] } },
];

describe('costurarComparacao', () => {
  it('com par na conversa, a frase vai no fim, separada por um espaco', () => {
    expect(costurarComparacao('O exame e o sono de março.  ', COM_PAR)).toBe(
      `O exame e o sono de março. ${TEXTO_DA_COMPARACAO}`,
    );
  });

  it('texto que ja traz a frase fica como esta', () => {
    const texto = `Os blocos. ${TEXTO_DA_COMPARACAO}`;
    expect(costurarComparacao(texto, COM_PAR)).toBe(texto);
  });

  it.each([
    ['sem par', [{ name: 'consultar_comparacao', output: { disponivel: true, pares: [] } }]],
    ['indisponivel', [{ name: 'consultar_comparacao', output: { disponivel: false, explicacao: 'x' } }]],
    ['sem a ferramenta', [{ name: 'consultar_wearable', output: { disponivel: true } }]],
  ])('%s: nada muda', (_caso, saidas) => {
    expect(costurarComparacao('Texto.', saidas)).toBe('Texto.');
  });

  it.each(['clinica', 'operacional'] as const)('a frase passa nas regras de linguagem (%s)', (questionKind) => {
    const r = checkLanguageRules(TEXTO_DA_COMPARACAO, { questionKind, temOrigem: true });
    expect(r.ok ? [] : r.violations.filter((v) => v.rule !== 'R2')).toEqual([]);
  });
});
