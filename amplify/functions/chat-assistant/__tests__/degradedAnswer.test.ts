/**
 * A etapa E da D31. O teste que justifica esta etapa existir e o
 * "PASSA no proprio verificador": se a resposta degradada precisasse ser
 * verificada, ela nao seria uma saida da reprovacao -- seria mais uma coisa
 * que pode ser reprovada.
 */
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: jest.fn() }) },
  ScanCommand: class {},
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { ANALYTE_CATALOG } from '../../extract-document-data/analyteCatalog';
import { buildDegradedAnswer } from '../degradedAnswer';
import { formatarDecimal } from '../formatoPtBr';

// D27: nenhum codigo LOINC e digitado a mao, nem como exemplo em teste, e
// comentario dizendo "vem do extrato oficial" nao e verificacao -- um literal
// errado e o comentario ao lado dele erram juntos. O codigo sai do catalogo
// gerado a partir do extrato, buscado pelo rotulo em portugues, que e campo
// nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const VITAMINA_D = doCatalogo('Vitamina D (25-OH)');

const saidaDeAnalito = {
  name: 'consultar_analito',
  output: {
    disponivel: true,
    analyteCode: VITAMINA_D.code,
    nome: VITAMINA_D.projectLabel,
    series: [
      {
        momento: null,
        unidade: 'ng/mL',
        coletas: [
          {
            id: 'l-1',
            valor: 32.5,
            unidade: 'ng/mL',
            dataDaColeta: '2026-03-12',
            comoEstavaNoPapel: '32,5',
            faixaDoLaboratorio: { minimo: 30, maximo: 100 },
            documentoId: 'doc-marco',
          },
          {
            id: 'l-2',
            valor: 41,
            unidade: 'ng/mL',
            dataDaColeta: '2026-09-20',
            comoEstavaNoPapel: '41',
            faixaDoLaboratorio: { minimo: 30, maximo: 100 },
            documentoId: 'doc-setembro',
          },
        ],
        naoComparaveis: [],
      },
    ],
  },
};

describe('buildDegradedAnswer', () => {
  it('monta o dado com valor, data e unidade', () => {
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.texto).toContain('Vitamina D (25-OH)');
    expect(r.texto).toContain('32,5');
    expect(r.texto).toContain('12/03/2026');
    expect(r.texto).toContain('ng/mL');
  });

  it('a PRIMEIRA linha diz que aquilo nao e a resposta da conversa', () => {
    // Sem isso, a pessoa le o texto de modelo como se fosse a IA falando.
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.texto.split('\n')[0]).toMatch(/não consegui escrever/i);
  });

  it('encaminha a um profissional de saude', () => {
    expect(buildDegradedAnswer([saidaDeAnalito])!.texto).toMatch(/médico|profissional de saúde/i);
  });

  it('leva as citacoes, para a origem continuar clicavel', () => {
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.citacoes.map((c) => c.documentId)).toEqual(['doc-marco', 'doc-setembro']);
    expect(r.citacoes.map((c) => c.resultId)).toEqual(['l-1', 'l-2']);
  });

  it('PASSA no proprio verificador -- ela e segura por construcao', () => {
    // O teste que justifica a opcao E existir.
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(checkLanguageRules(r.texto, { questionKind: 'clinica' })).toEqual({ ok: true });
  });

  it('nao interpreta: nenhuma palavra compara o valor com a faixa', () => {
    const texto = buildDegradedAnswer([saidaDeAnalito])!.texto.toLowerCase();
    expect(texto).not.toMatch(/dentro|fora|acima|abaixo|normal|alterado|melhor|pior/);
  });

  it('devolve null quando nenhuma ferramenta tem o que mostrar', () => {
    // E o que faz a etapa C existir: sem dado, indisponibilidade honesta.
    expect(buildDegradedAnswer([])).toBeNull();
    expect(
      buildDegradedAnswer([{ name: 'consultar_analito', output: { disponivel: false } }]),
    ).toBeNull();
  });

  it('ignora ferramenta que nao sabe se renderizar, sem quebrar', () => {
    const r = buildDegradedAnswer([
      saidaDeAnalito,
      { name: 'consultar_perfil', output: { qualquer: 'coisa' } },
    ]);
    expect(r).not.toBeNull();
  });

  it('ignora nome de ferramenta que nao existe, sem quebrar', () => {
    expect(buildDegradedAnswer([{ name: 'nao_existe', output: {} }])).toBeNull();
  });

  it('nao usa o termo vetado', () => {
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    const check = checkLanguageRules(r.texto, { questionKind: 'operacional' });
    const r1 = check.ok ? [] : check.violations.filter((v) => v.rule === 'R1');
    expect(r1).toEqual([]);
  });

  it('a dose cadastrada NAO entra no texto de modelo fixo', () => {
    // A tool pode devolver a posologia ao modelo -- e o dado da pessoa. Mas
    // uma linha de texto com "500 mg" e exatamente o que a R3 reprova, e o
    // modo degradado precisa passar por construcao.
    const r = buildDegradedAnswer([
      {
        name: 'consultar_medicamentos',
        output: {
          disponivel: true,
          emUso: [{ nome: 'Losartana', doseRegistrada: '50 mg', horarios: ['08:00'], ativo: true }],
        },
      },
    ]);
    expect(r).not.toBeNull();
    expect(r!.texto).not.toContain('50 mg');
    expect(checkLanguageRules(r!.texto, { questionKind: 'clinica' })).toEqual({ ok: true });
  });

  it('junta mais de uma ferramenta na mesma resposta', () => {
    const r = buildDegradedAnswer([
      saidaDeAnalito,
      {
        name: 'consultar_consultas',
        output: {
          disponivel: true,
          futuras: [{ nome: 'Cardiologista', quando: '2026-10-24T14:00', profissional: null }],
        },
      },
    ])!;
    expect(r.texto).toContain('Vitamina D (25-OH)');
    expect(r.texto).toContain('Cardiologista');
  });

  it('separa as series por momento da coleta, como a tela faz (D22)', () => {
    const r = buildDegradedAnswer([
      {
        name: 'consultar_analito',
        output: {
          disponivel: true,
          nome: 'Glicose',
          series: [
            {
              momento: 'jejum',
              unidade: 'mg/dL',
              coletas: [
                {
                  id: 'g-1',
                  valor: 92,
                  unidade: 'mg/dL',
                  dataDaColeta: '2026-03-12',
                  documentoId: 'doc-1',
                },
              ],
              naoComparaveis: [],
            },
          ],
        },
      },
    ])!;
    expect(r.texto).toContain('jejum');
  });
});

describe('formatarDecimal na funcao', () => {
  it('escreve com virgula, como o laudo brasileiro', () => {
    expect(formatarDecimal(32.5)).toBe('32,5');
  });

  it('NUNCA transforma uma medida em zero por arredondamento', () => {
    // Um TSH de 0,004 exibido como "0" e um numero errado. Mesma regra do
    // `decimalDisplay.ts` da tela -- duplicada aqui porque a Lambda nao
    // importa de `src/`, e um teste em cada lado e o que impede as duas de
    // divergirem em silencio.
    expect(formatarDecimal(0.004)).not.toBe('0');
    expect(formatarDecimal(0.004)).toBe('0,004');
  });

  it('valor ausente vira travessao, nunca zero', () => {
    expect(formatarDecimal(null)).toBe('—');
  });

  it('nao corta zeros a esquerda da virgula', () => {
    expect(formatarDecimal(100)).toBe('100');
  });
});
