/**
 * A frase fixa da ausencia (DS14 = C1, E6 #2 da conferencia no sandbox). O
 * modelo diz que o dia pedido "fica fora desse periodo", com palavras que a R5
 * nao conhece. O aplicativo acrescenta a ausencia com as palavras da regra, mas
 * so quando o texto repete a data limite que a ferramenta devolveu: e ela que
 * prova que o modelo viu o limite. Sem essa prova, costurar faria passar
 * "Seu acompanhamento esta em dia" num turno sem dado nenhum.
 */
import { costurarAusencia, TEXTO_DA_AUSENCIA } from '../ausenciaFixa';

const SEM_DADO_DO_RELOGIO = [
  {
    name: 'consultar_wearable_dias',
    output: { disponivel: false, dadosDesde: '2026-08-01', dadosAte: '2026-10-12', explicacao: '...' },
  },
];

const FORA_DO_PERIODO =
  'Os dados do relógio vão só até 12/10/2026, e a última quinta (15/10) fica fora desse período.';

describe('costurarAusencia', () => {
  it('acrescenta a ausencia ao fim quando o texto repete a data limite da ferramenta', () => {
    expect(costurarAusencia(FORA_DO_PERIODO, SEM_DADO_DO_RELOGIO, true)).toBe(`${FORA_DO_PERIODO} ${TEXTO_DA_AUSENCIA}`);
  });

  it('aceita a data limite sem o ano', () => {
    const texto = 'Os dados vão até 12/10, e a quinta fica depois disso.';
    expect(costurarAusencia(texto, SEM_DADO_DO_RELOGIO, true)).toBe(`${texto} ${TEXTO_DA_AUSENCIA}`);
  });

  it('nao costura sem a data limite: e ela que prova que o modelo viu a ausencia', () => {
    const texto = 'Seu acompanhamento está em dia.';
    expect(costurarAusencia(texto, SEM_DADO_DO_RELOGIO, true)).toBe(texto);
  });

  it('nao costura quando a ferramenta nao devolveu data limite', () => {
    const semPeriodo = [{ name: 'consultar_exames', output: { disponivel: false } }];
    expect(costurarAusencia(FORA_DO_PERIODO, semPeriodo, true)).toBe(FORA_DO_PERIODO);
  });

  it('nao costura quando veio dado no turno', () => {
    expect(costurarAusencia(FORA_DO_PERIODO, SEM_DADO_DO_RELOGIO, false)).toBe(FORA_DO_PERIODO);
  });

  it('nao costura quando o texto ja diz a ausencia com as palavras da regra', () => {
    const texto = 'Não há dados do relógio depois de 12/10/2026.';
    expect(costurarAusencia(texto, SEM_DADO_DO_RELOGIO, true)).toBe(texto);
  });
});
