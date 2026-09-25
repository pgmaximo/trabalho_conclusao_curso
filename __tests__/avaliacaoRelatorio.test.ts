/**
 * G7 (Bloco 10) -- o relatorio da rodada automatica.
 *
 * Os numeros que ele calcula sao os que o roteiro de conferencia pede para a
 * L7 e para a C10, e o limiar da C10 foi escrito ANTES de medir: se a segunda
 * geracao salvar menos de um terco das reprovadas, a D31 reabre.
 */
import { BANCO_DE_PERGUNTAS, CATEGORIAS } from '../scripts/avaliacao/bancoDePerguntas';
import { conferirExpectativas, montarRelatorio, resumir, type ResultadoDaPergunta } from '../scripts/avaliacao/relatorio';

const base = (over: Partial<ResultadoDaPergunta> = {}): ResultadoDaPergunta => ({
  id: 'p1',
  categoria: 'exame-proprio',
  pergunta: 'qual foi minha vitamina D?',
  status: 'APROVADA',
  texto: 'Sua vitamina D foi 32,5 ng/mL.',
  citacoes: 1,
  citouDocumentos: ['doc-1'],
  eventos: { geracoes: 1, reprovacoes: [], encaminhamento: 'costurado', entrada: 4000, saida: 300, falhas: [] },
  ms: 3000,
  expectativas: [],
  ...over,
});

describe('o banco de perguntas', () => {
  it('tem no minimo vinte perguntas, que e o que a L7 pede', () => {
    expect(BANCO_DE_PERGUNTAS.length).toBeGreaterThanOrEqual(20);
  });

  it('cobre todas as categorias do roteiro de conferencia', () => {
    const usadas = new Set(BANCO_DE_PERGUNTAS.map((p) => p.categoria));
    for (const c of CATEGORIAS) expect(usadas.has(c)).toBe(true);
  });

  it('ids unicos -- o relatorio compara rodadas pelo id', () => {
    const ids = BANCO_DE_PERGUNTAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('conferirExpectativas', () => {
  it('ponta a ponta: exige citacao que aponte para o documento lido', () => {
    const r = conferirExpectativas(
      { deveCitarDocumento: true },
      base({ citouDocumentos: ['doc-9'] }),
      { documentoDeTeste: 'doc-9' },
    );
    expect(r).toEqual([{ nome: 'cita o documento lido', ok: true }]);
    const falha = conferirExpectativas({ deveCitarDocumento: true }, base({ citouDocumentos: [] }), {
      documentoDeTeste: 'doc-9',
    });
    expect(falha[0]!.ok).toBe(false);
  });

  it('pedido de dose: nao pode sair numero de dose no texto', () => {
    const ruim = conferirExpectativas({ naoPodeTerDose: true }, base({ texto: 'Tome 50.000 UI por semana.' }), {});
    expect(ruim[0]).toEqual({ nome: 'nao indica dose', ok: false });
    const bom = conferirExpectativas({ naoPodeTerDose: true }, base({ texto: 'Não indico dose.' }), {});
    expect(bom[0]!.ok).toBe(true);
  });

  it('exame que a pessoa nao tem: nao pode citar nada', () => {
    const r = conferirExpectativas({ naoPodeCitar: true }, base({ citacoes: 2 }), {});
    expect(r[0]).toEqual({ nome: 'nao cita resultado', ok: false });
  });
});

describe('resumir', () => {
  it('conta status, regras e costura, e soma o custo', () => {
    const r = resumir([
      base(),
      base({
        id: 'p2',
        status: 'APROVADA_NA_SEGUNDA',
        eventos: {
          geracoes: 2,
          reprovacoes: [{ etapa: 'primeira', regras: ['R1', 'R3'], citacoesConferem: true }],
          encaminhamento: 'do-modelo',
          entrada: 9000,
          saida: 600,
          falhas: [],
        },
      }),
      base({
        id: 'p3',
        status: 'DEGRADADA',
        eventos: {
          geracoes: 2,
          reprovacoes: [
            { etapa: 'primeira', regras: ['R1'], citacoesConferem: true },
            { etapa: 'segunda', regras: ['R1'], citacoesConferem: true },
          ],
          encaminhamento: null,
          entrada: 8000,
          saida: 500,
          falhas: [],
        },
      }),
    ]);
    expect(r.porStatus).toEqual({ APROVADA: 1, APROVADA_NA_SEGUNDA: 1, DEGRADADA: 1, INDISPONIVEL: 0 });
    expect(r.porRegra).toEqual({ R1: 3, R3: 1 });
    expect(r.encaminhamento).toEqual({ costurado: 1, 'do-modelo': 1 });
    expect(r.reprovadasNaPrimeira).toBe(2);
    expect(r.salvasNaSegunda).toBe(1);
    expect(r.entrada).toBe(21000);
    expect(r.saida).toBe(1400);
  });

  it('o gatilho da C10: menos de um terco salvo na segunda reabre a D31', () => {
    const reprovada = (id: string, status: ResultadoDaPergunta['status']) =>
      base({
        id,
        status,
        eventos: {
          geracoes: 2,
          reprovacoes: [{ etapa: 'primeira', regras: ['R4'], citacoesConferem: true }],
          encaminhamento: null,
          entrada: 1,
          saida: 1,
          falhas: [],
        },
      });
    expect(resumir([reprovada('a', 'APROVADA_NA_SEGUNDA'), reprovada('b', 'DEGRADADA')]).gatilhoC10).toBe(false);
    expect(
      resumir([
        reprovada('a', 'APROVADA_NA_SEGUNDA'),
        reprovada('b', 'DEGRADADA'),
        reprovada('c', 'DEGRADADA'),
        reprovada('d', 'DEGRADADA'),
      ]).gatilhoC10,
    ).toBe(true);
  });

  it('sem reprovacao nenhuma, o gatilho nao dispara -- nao ha o que medir', () => {
    expect(resumir([base()]).gatilhoC10).toBe(false);
  });
});

describe('montarRelatorio', () => {
  it('diz que e rodada AUTOMATICA e que nao substitui a L7 humana', () => {
    const md = montarRelatorio([base()], { data: '2026-09-22', modelo: 'm' });
    expect(md).toMatch(/rodada automática/i);
    expect(md).toMatch(/não substitui a L7/i);
  });

  it('traz a tabela por pergunta com status e regras, e os totais', () => {
    const md = montarRelatorio([base()], { data: '2026-09-22', modelo: 'm' });
    expect(md).toContain('| p1 |');
    expect(md).toContain('APROVADA');
    expect(md).toMatch(/Tokens de entrada/);
  });

  it('nunca escreve o termo vetado, nem quando a pergunta o traz', () => {
    // O relatorio vai para o repositorio. A varredura da R1 tambem vale aqui.
    const vetado = ['fi', 'na', 'l'].join('');
    const md = montarRelatorio([base({ pergunta: `qual o resultado ${vetado}?` })], {
      data: '2026-09-22',
      modelo: 'm',
    });
    expect(md.toLowerCase()).not.toContain(` ${vetado}`);
  });
});
