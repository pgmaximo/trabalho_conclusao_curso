/**
 * U13 -- a marcacao aparecia crua na tela.
 *
 * Medido com o aplicativo na mao, 2026-09-18: a pessoa leu
 * `📅 **04/10/2025** — **27,92 ng/mL**`, com os asteriscos. Nao ha
 * renderizador de markdown em componente nenhum do chat, e NAO VAI HAVER: um
 * renderizador dentro de uma resposta de modelo abre superficie de link --
 * `[texto](url)` viraria algo clicavel --, e este aplicativo nao precisa dessa
 * porta.
 *
 * Entao a marcacao e REMOVIDA, e nao reprovada. Descartar uma resposta correta
 * por causa de tres asteriscos seria repetir o erro da R2, que esta EPIC esta
 * consertando duas tarefas acima.
 *
 * ORDEM IMPORTA, e e o caso mais importante deste arquivo: a limpeza roda
 * ANTES da verificacao. Se rodasse depois, `v**eto**` passaria pela R1 partido
 * ao meio e voltaria inteiro na tela.
 */
import { limparFormatacao } from '../textoLimpo';

describe('limparFormatacao', () => {
  it('tira negrito e italico, mantendo o texto', () => {
    expect(limparFormatacao('**04/10/2025** — **27,92 ng/mL**')).toBe('04/10/2025 — 27,92 ng/mL');
    expect(limparFormatacao('o valor *pode* mudar')).toBe('o valor pode mudar');
    expect(limparFormatacao('__importante__')).toBe('importante');
  });

  it('tira emoji', () => {
    expect(limparFormatacao('\u{1F4C5} 04/10/2025')).toBe('04/10/2025');
    expect(limparFormatacao('resultado ✅ conferido')).toBe('resultado conferido');
  });

  it('tira titulo e marcador de lista, preservando a linha', () => {
    expect(limparFormatacao('## Resultados\n- glicose\n- colesterol')).toBe(
      'Resultados\nglicose\ncolesterol',
    );
    expect(limparFormatacao('* item')).toBe('item');
  });

  it('desmonta link de markdown, deixando so o texto', () => {
    // O endereco some junto: um link numa resposta de modelo e exatamente o
    // que este aplicativo nao quer mostrar.
    expect(limparFormatacao('veja [o documento](https://exemplo.com/x)')).toBe('veja o documento');
  });

  it('NAO estraga o que nao e marcacao', () => {
    // Multiplicacao, intervalo com traco, e o asterisco do UCUM em "10*3/uL".
    expect(limparFormatacao('a faixa e 70 a 99 mg/dL')).toBe('a faixa e 70 a 99 mg/dL');
    expect(limparFormatacao('leucocitos em 10*3/uL')).toBe('leucocitos em 10*3/uL');
    expect(limparFormatacao('relacao 2*3 = 6')).toBe('relacao 2*3 = 6');
  });

  it('nao deixa espaco sobrando nem linha em branco no fim', () => {
    expect(limparFormatacao('  **a**  \n\n')).toBe('a');
  });

  it('aguenta texto vazio', () => {
    expect(limparFormatacao('')).toBe('');
  });
});
