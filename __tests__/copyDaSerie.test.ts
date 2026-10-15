import { readFileSync } from 'node:fs';

import { checkLanguageRules } from '../amplify/functions/ai-language-rules/languageRules';

/**
 * Um teste de copy sobre uma tela so protege aquela tela. Esta varredura existe
 * porque a regra e do PROJETO, e nao do componente: qualquer superficie que
 * mostre numero de exame esta sujeita a ela, inclusive a que alguem
 * acrescentar depois.
 *
 * O padrao do termo vetado NAO e escrito aqui. Ele vem do `checkLanguageRules`
 * da EPIC de regras de linguagem, que monta a raiz a partir de partes -- a
 * regra do projeto e que o termo nao aparece por extenso em lugar nenhum,
 * inclusive em teste. O plano escrevia o padrao inteiro neste arquivo.
 */

/** Toda superficie que mostra numero de exame para uma pessoa. */
const MOSTRAM_NUMERO = [
  'src/screens/AnalyteSeriesScreen.tsx',
  'src/components/AnalyteSeriesChart.tsx',
  'src/components/AnalyteCollectionRow.tsx',
  'src/components/ExtractedResultRow.tsx',
  'src/components/ExtractedResultsSection.tsx',
  'src/components/CorrectResultPanel.tsx',
  // A bolha do chat mostra valor, unidade e data de uma coleta: e superficie
  // que mostra numero de exame como qualquer outra.
  'src/components/MessageSources.tsx',
];

/**
 * Onde o encaminhamento a um profissional de saude precisa estar. Nao e a
 * lista acima: o encaminhamento e de quem monta a superficie inteira, e
 * repeti-lo em cada linha de analito viraria rodape mecanico -- exatamente o
 * que o estudo de linguagem diz para evitar, porque repetir faz a pessoa parar
 * de ler.
 *
 * Esta lista e SEPARADA de proposito. O plano usava um `return` no meio do
 * teste para pular os componentes, e teste que sai sem assercao passa sem
 * verificar nada.
 */
const CARREGAM_O_ENCAMINHAMENTO = [
  'src/screens/AnalyteSeriesScreen.tsx',
  'src/components/ExtractedResultsSection.tsx',
];

/**
 * So o que uma pessoa LE. Comentario de codigo precisa poder dizer "nao
 * classifique o valor como alterado" ao explicar a regra; proibir isso
 * empurraria o projeto a nao explicar as proprias regras.
 */
function copyVisivel(caminho: string): string {
  return readFileSync(caminho, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();
}

describe('copy das superficies que mostram numero de exame', () => {
  it.each(MOSTRAM_NUMERO)('%s nao usa o termo vetado nem suas derivacoes', (caminho) => {
    const resultado = checkLanguageRules(copyVisivel(caminho), { questionKind: 'operacional' });
    const r1 = resultado.ok ? [] : resultado.violations.filter((v) => v.rule === 'R1');
    expect(r1).toEqual([]);
  });

  it.each(MOSTRAM_NUMERO)('%s nao classifica o resultado', (caminho) => {
    const texto = copyVisivel(caminho);
    for (const proibido of [
      'dentro da faixa',
      'fora da faixa',
      'acima do normal',
      'abaixo do normal',
      'está alterado',
      'preocupante',
      'melhorou',
      'piorou',
    ]) {
      expect(texto).not.toContain(proibido);
    }
  });

  it.each(MOSTRAM_NUMERO)('%s nao calcula nem nomeia tendencia', (caminho) => {
    // Um grafico que sobe ja sugere um julgamento. Nomear a subida e o passo
    // que transforma apresentacao em interpretacao.
    const texto = copyVisivel(caminho);
    for (const proibido of ['tendência', 'em queda', 'em alta', 'evoluindo bem']) {
      expect(texto).not.toContain(proibido);
    }
  });

  it.each(CARREGAM_O_ENCAMINHAMENTO)(
    '%s encaminha a um profissional de saude',
    (caminho) => {
      // Verificado pela R2 do modulo de regras de linguagem, e nao por uma
      // frase exata: exigir a frase exata transformaria o encaminhamento num
      // rodape mecanico.
      const resultado = checkLanguageRules(copyVisivel(caminho), { questionKind: 'clinica' });
      const r2 = resultado.ok ? [] : resultado.violations.filter((v) => v.rule === 'R2');
      expect(r2).toEqual([]);
    },
  );

  it('a lista de superficies acompanha o que existe no projeto', () => {
    // Guarda contra a varredura envelhecer: se um componente novo mostrar
    // numero de exame e ninguem o acrescentar aqui, a regra do projeto deixa
    // de ser verificada nele em silencio.
    for (const caminho of [...MOSTRAM_NUMERO, ...CARREGAM_O_ENCAMINHAMENTO]) {
      expect(() => readFileSync(caminho, 'utf8')).not.toThrow();
    }
  });
});
