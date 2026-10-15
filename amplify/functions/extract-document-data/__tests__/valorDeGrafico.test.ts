/**
 * G10 -- o numero lido de grafico, medido em 2026-09-22.
 *
 * A pagina 11 do laudo do Delboni nao imprime o valor do HDL: ele fica no pe da
 * pagina 10, e a 11 traz a tabela de referencia e um GRAFICO DE HISTORICO com
 * dois pontos, de 2020 e de 2025. Vendo so a 11 -- que e o que uma foto de uma
 * folha entrega --, o modelo estimou o valor pelo grafico. Na imagem limpa leu
 * o rotulo do ponto e acertou; na desfocada leu 80, com confianca 0,95, e a
 * linha entraria como automatica.
 *
 * As duas frases abaixo sao as que o modelo escreveu, literalmente. Ele DISSE o
 * que fez; o defeito era ninguem ler.
 */
import { linhasLidasDeGrafico, rebaixarLidasDeGrafico } from '../valorDeGrafico';

const AVISO_LIMPA =
  'Página 11 de 20: apenas os analitos com valor numérico visível nesta página foram transcritos. O valor de HDL foi lido a partir do gráfico de histórico (ponto em 04/10/2025 = 62 mg/dL); confiança reduzida pois o valor foi extraído de gráfico e não de campo textual direto.';

const AVISO_FOTO =
  'O valor do HDL foi lido a partir do gráfico de histórico (ponto mais recente em 04/10/2025 09:15), pois o valor numérico principal não está explicitamente impresso em texto nesta página — leitura estimada como 80 mg/dL com confiança reduzida.';

/** Os nomes de cada linha: o do papel e o nosso, na ordem das linhas. */
const LINHAS = [
  ['HDL - Colesterol', 'HDL'],
  ['Não HDL - Colesterol', 'Colesterol nao-HDL'],
  ['LDL - Colesterol (calculado)', 'LDL'],
];

describe('linhasLidasDeGrafico', () => {
  it('acha a linha nomeada nas duas frases reais da medicao', () => {
    expect([...linhasLidasDeGrafico([AVISO_LIMPA], LINHAS)]).toContain(0);
    expect([...linhasLidasDeGrafico([AVISO_FOTO], LINHAS)]).toContain(0);
  });

  it('NAO acha a linha que o aviso nao nomeia', () => {
    // O LDL esta na mesma pagina e foi lido do numero impresso. Rebaixa-lo
    // seria punir a linha certa pelo erro da vizinha.
    expect(linhasLidasDeGrafico([AVISO_FOTO], LINHAS).has(2)).toBe(false);
  });

  it('NAO acha nada quando o aviso fala de grafico sem dizer que leu valor dele', () => {
    // Mencionar que o laudo TEM grafico e descricao, nao leitura. Se isto
    // contasse, todo laudo do Delboni iria inteiro para revisao.
    const avisos = [
      'O laudo apresenta gráfico de histórico para HDL; os pontos anteriores não foram transcritos.',
    ];
    expect(linhasLidasDeGrafico(avisos, LINHAS).size).toBe(0);
  });

  it('NAO acha nada em aviso que nao fala de grafico', () => {
    const avisos = [
      'A data de coleta de "HDL" não estava legível no documento; usamos a data informada no formulário.',
      'HDL: valor lido com dificuldade por causa da sombra na foto.',
    ];
    expect(linhasLidasDeGrafico(avisos, LINHAS).size).toBe(0);
  });

  it('acha pelo nome do papel mesmo quando o nosso rotulo e outro', () => {
    const linhas = [['25-OH-Vitamina D', 'Vitamina D (25-OH)']];
    const avisos = ['O resultado de 25-OH-Vitamina D foi estimado pela curva do gráfico.'];
    expect(linhasLidasDeGrafico(avisos, linhas).has(0)).toBe(true);
  });

  it('ignora acento e caixa -- o aviso e prosa do modelo, o rotulo e do laudo', () => {
    const linhas = [['Glicose', 'Glicose']];
    const avisos = ['valor de GLICOSE extraido do grafico de barras'];
    expect(linhasLidasDeGrafico(avisos, linhas).has(0)).toBe(true);
  });

  it('casa o nome inteiro, e nao pedaco de palavra', () => {
    // O par real do hemograma: "HCM" esta DENTRO de "CHCM". Um aviso sobre o
    // CHCM nao pode rebaixar o HCM.
    //
    // A primeira versao deste caso usava "Ferro" e "Ferritina" -- e a mutacao
    // que tira a fronteira de palavra sobreviveu a ela, porque "ferro" nem e
    // pedaco de "ferritina". O caso nao testava o que dizia testar.
    const linhas = [['HCM', 'HCM']];
    const avisos = ['O valor de CHCM foi lido a partir do gráfico.'];
    expect(linhasLidasDeGrafico(avisos, linhas).size).toBe(0);
  });

  it('rebaixa as DUAS linhas quando o mesmo analito aparece duas vezes (D22)', () => {
    // Curva glicemica: jejum e 120 minutos. O aviso nao diz qual delas veio
    // do grafico, entao as duas vao para revisao -- o lado seguro.
    const linhas = [
      ['Glicose', 'Glicose'],
      ['Glicose', 'Glicose'],
    ];
    const avisos = ['Glicose: valor lido a partir do gráfico da curva.'];
    expect([...linhasLidasDeGrafico(avisos, linhas)].sort()).toEqual([0, 1]);
  });
});

/**
 * A remedicao de 2026-09-22, com a regra de prompt JA no lugar, mostrou a
 * outra forma do mesmo defeito. Na foto da pagina 11 o modelo nao falou em
 * grafico: ele criou HDL = 40 -- o numero de "Superior a 40 mg/dL", da tabela
 * de referencia -- e escreveu a frase abaixo. A regra de prompt falhou nas
 * duas variantes; a trava e quem protege.
 */
const AVISO_NAO_IMPRESSO =
  'Pág. 11 de 20: valor numérico do HDL não está claramente impresso; lido a partir do contexto. Verificar demais páginas.';

describe('linhasLidasDeGrafico -- o valor que o modelo diz que NAO esta impresso', () => {
  it('acha a linha na frase real da remedicao', () => {
    expect(linhasLidasDeGrafico([AVISO_NAO_IMPRESSO], LINHAS).has(0)).toBe(true);
  });

  it('acha "nao esta explicitamente impresso", que e a frase da primeira medicao', () => {
    const aviso =
      'Resultado de HDL não está explicitamente impresso como número nesta página; confiança reduzida.';
    expect(linhasLidasDeGrafico([aviso], LINHAS).has(0)).toBe(true);
  });

  it('NAO acha quando o aviso diz que o valor ESTA impresso', () => {
    const aviso = 'O valor de HDL está impresso em fonte pequena, mas legível.';
    expect(linhasLidasDeGrafico([aviso], LINHAS).size).toBe(0);
  });
});

describe('rebaixarLidasDeGrafico', () => {
  const linha = (projectLabel: string, value: number) => ({
    projectLabel,
    value,
    valueQualifier: null as '<' | '>' | null,
    referenceLow: 40,
    referenceHigh: null as number | null,
    reviewStatus: 'AUTO' as 'AUTO' | 'PENDENTE_DE_REVISAO',
  });

  it('a linha lida de grafico perde o valor e vai para revisao, com confianca alta ou nao', () => {
    // D29: numero sem leitura segura e AUSENTE, nunca um chute. O 80 do HDL
    // nao pode sobreviver nem como sugestao.
    const r = rebaixarLidasDeGrafico(
      [linha('HDL', 80), linha('LDL', 90)],
      [['HDL - Colesterol'], ['LDL - Colesterol (calculado)']],
      [AVISO_FOTO],
    );
    expect(r.linhas[0]).toMatchObject({ value: null, reviewStatus: 'PENDENTE_DE_REVISAO' });
    expect(r.linhas[1]).toMatchObject({ value: 90, reviewStatus: 'AUTO' });
    expect(r.quantidade).toBe(1);
  });

  it('a faixa continua: ela veio da tabela impressa, e nao do grafico', () => {
    const r = rebaixarLidasDeGrafico([linha('HDL', 80)], [['HDL']], [AVISO_FOTO]);
    expect(r.linhas[0]!.referenceLow).toBe(40);
  });

  it('diz o que fez, em aviso que a pessoa le, nomeando a linha', () => {
    const r = rebaixarLidasDeGrafico([linha('HDL', 80)], [['HDL']], [AVISO_FOTO]);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toContain('"HDL"');
    expect(r.avisos[0]).toMatch(/gráfico/);
    expect(r.avisos[0]).toMatch(/confira no papel/i);
  });

  it('sem aviso de grafico, nada muda e nenhum aviso novo aparece', () => {
    const linhas = [linha('HDL', 62)];
    const r = rebaixarLidasDeGrafico(linhas, [['HDL']], ['Laudo legivel.']);
    expect(r.linhas).toEqual(linhas);
    expect(r.avisos).toEqual([]);
    expect(r.quantidade).toBe(0);
  });
});
