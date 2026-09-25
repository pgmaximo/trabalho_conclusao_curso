# Série por analito — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao usuário uma tela que ponha as coletas do mesmo analito lado a lado, na mesma unidade, com a faixa de cada laboratório e o documento de origem de cada número — sem nenhuma interpretação clínica.

**Architecture:** EPIC inteiramente de leitura. A lógica que decide **o que pode ser comparado** vive num módulo puro (`analyteSeries.ts`), testado sem React e sem AWS; a consulta usa o índice `analyteCode`/`collectedAt` criado na EPIC de extração; a tela é uma casca fina sobre os dois, feita com o `LineChart` que já existe no repositório.

**Tech Stack:** React Native + Expo Router, NativeWind, `react-native-svg` (já instalado), Amplify Data (leitura), Jest + Testing Library. **Nenhuma dependência nova.**

**Spec:** `specs/06-ia-leitura-exames/serie-por-analito/spec.md`

## Restrições globais

Valem para toda tarefa deste plano. Copiadas da spec e da constituição, com os valores exatos.

- **Nenhuma dependência nova** (regra 3). `LineChart`, `chartScale`, `react-native-svg` 15.12.1 e os componentes do Bloco 1 já existem.
- **`src/components/charts/chartScale.ts` não é modificado.** A feature de wearable depende dele (regra 5).
- **Nenhuma interpretação clínica** (regra 4). Sem "melhorou", "piorou", "normal", "alterado", "dentro da faixa", "preocupante". Sem cálculo de tendência. Sem cor de julgamento.
- **A palavra vetada e suas derivações não aparecem em copy nenhuma.**
- **Toda tela que mostra número de exame carrega o encaminhamento a um profissional de saúde.**
- **A tela não converte unidade.** Linha fora da unidade canônica é excluída com motivo (D29).
- **Linha `PENDENTE_DE_REVISAO` não participa de comparação** — promessa dos critérios de aceite da EPIC anterior, cumprida ou quebrada aqui.
- **Valor com qualificador não vira ponto do gráfico** (D21). É limite, não medida.
- **A série é chaveada por `(analyteCode, collectionMoment)`** (D22).
- **Nada é interpolado.** Buraco quebra o traço.
- **Node 20** (`nvm use 20.20.1`) para qualquer comando de Amplify. `npm run validate` antes de considerar qualquer coisa concluída.

---

## Estrutura de arquivos

### Novo

| Arquivo | Responsabilidade |
|---|---|
| `src/services/analyteSeries.ts` | **puro:** agrupa, ordena, exclui com motivo, decide a faixa comum |
| `src/services/analyteSeriesService.ts` | consulta o `LabResult` pelo índice e monta a lista do seletor |
| `src/hooks/useAnalyteSeries.ts` | estado da tela: carregamento, escolha de analito e de momento |
| `src/screens/AnalyteSeriesScreen.tsx` | a tela, com os quatro estados |
| `src/components/AnalyteSeriesChart.tsx` | casca sobre o `LineChart`, com a regra da faixa comum |
| `src/components/AnalyteCollectionRow.tsx` | uma coleta na lista, com faixa, papel e atalho |
| `src/app/(app)/analyte-series.tsx` | rota, lê `code` e `moment` dos parâmetros |

### Modificado

| Arquivo | Mudança |
|---|---|
| `src/screens/DocumentDetailScreen.tsx` | o ícone da linha de analito passa a navegar para cá (a EPIC anterior já o desenhou) |

`analyteSeries.ts` tem teste em `__tests__/`, sem React e sem AWS. É onde mora o produto desta EPIC.

---

## Tarefa S1: Montagem da série

O coração da EPIC. Tudo que decide **o que pode ser comparado** está aqui, e nada disso passa por React.

**Arquivos:**
- Criar: `src/services/analyteSeries.ts`
- Teste: `__tests__/analyteSeries.test.ts`

**Interfaces:**
- Consome: `LabResultView` de `src/services/extractionService.ts` (EPIC de extração, tarefa 11).
- Produz:
  - `type ExclusionReason = 'pendente-de-revisao' | 'sem-valor' | 'limite-de-deteccao' | 'unidade-divergente'`
  - `type SeriesPoint = { id: string; documentId: string; collectedAt: string; value: number; referenceLow: number | null; referenceHigh: number | null; rawValue: string; rawUnit: string | null }`
  - `type ExcludedResult = { id: string; documentId: string; collectedAt: string | null; reason: ExclusionReason; result: LabResultView }`
  - `type AnalyteSeries = { analyteCode: string; projectLabel: string; analyteLabel: string; collectionMoment: string | null; unit: string; points: SeriesPoint[]; excluded: ExcludedResult[] }`
  - `buildAnalyteSeries(results: LabResultView[]): AnalyteSeries[]`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { buildAnalyteSeries } from '@/services/analyteSeries';
import type { LabResultView } from '@/services/extractionService';

// 62292-8 = 25-OH-D3+D2 [Mass/volume], ng/mL. Do extrato oficial, nunca de
// memoria (D27).
function linha(over: Partial<LabResultView> = {}): LabResultView {
  return {
    id: 'l1',
    analyteCode: '62292-8',
    projectLabel: 'Vitamina D (25-OH)',
    analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
    value: 32.5,
    valueQualifier: null,
    unit: 'ng/mL',
    rawValue: '32,5',
    rawUnit: 'ng/mL',
    referenceLow: 30,
    referenceHigh: 100,
    collectedAt: '2026-03-12',
    collectionMoment: null,
    sourcePage: 2,
    reviewStatus: 'AUTO',
    documentId: 'doc-marco',
    ...over,
  } as LabResultView;
}

describe('buildAnalyteSeries', () => {
  it('poe as duas coletas na mesma serie, em ordem de data de coleta', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'b', collectedAt: '2026-09-20', value: 41, documentId: 'doc-setembro' }),
      linha({ id: 'a', collectedAt: '2026-03-12', value: 32.5 }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points.map((p) => p.id)).toEqual(['a', 'b']);
    expect(series[0].unit).toBe('ng/mL');
  });

  it('linha pendente sai da serie COM MOTIVO, nunca em silencio', () => {
    // A EPIC de extracao prometeu isto nos criterios de aceite dela. E aqui
    // que a promessa e cumprida ou quebrada.
    const series = buildAnalyteSeries([
      linha({ id: 'ok' }),
      linha({ id: 'pendente', reviewStatus: 'PENDENTE_DE_REVISAO', value: null }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['ok']);
    expect(series[0].excluded).toHaveLength(1);
    expect(series[0].excluded[0]).toMatchObject({ id: 'pendente', reason: 'pendente-de-revisao' });
  });

  it('linha confirmada pela pessoa ENTRA na serie', () => {
    const series = buildAnalyteSeries([linha({ id: 'x', reviewStatus: 'CONFIRMADO_PELO_USUARIO' })]);
    expect(series[0].points.map((p) => p.id)).toEqual(['x']);
  });

  it('valor ausente sai com motivo -- nunca vira zero (D29)', () => {
    const series = buildAnalyteSeries([linha({ id: 'ok' }), linha({ id: 'sem', value: null })]);
    expect(series[0].points.map((p) => p.id)).toEqual(['ok']);
    expect(series[0].excluded[0].reason).toBe('sem-valor');
    // O que NAO pode acontecer de jeito nenhum:
    expect(series[0].points.some((p) => p.value === 0)).toBe(false);
  });

  it('valor censurado sai do traco e CONTINUA listado como limite (D21)', () => {
    // Desenhar <0,01 como 0,01 afirma uma medida que o laboratorio declarou
    // nao ter feito, e ligar isso aos vizinhos por uma reta transforma uma
    // nao-medida em tendencia.
    const series = buildAnalyteSeries([
      linha({ id: 'medida' }),
      linha({ id: 'limite', value: 0.01, valueQualifier: '<', rawValue: '<0,01' }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['medida']);
    expect(series[0].excluded[0]).toMatchObject({ id: 'limite', reason: 'limite-de-deteccao' });
  });

  it('unidade divergente sai com motivo -- a tela nao converte (D29)', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'a' }),
      linha({ id: 'b', unit: 'nmol/L', value: 79.87, collectedAt: '2026-09-20' }),
    ]);
    expect(series[0].points.map((p) => p.id)).toEqual(['a']);
    expect(series[0].excluded[0].reason).toBe('unidade-divergente');
  });

  it('curva glicemica vira DUAS series, nunca uma serra (D22)', () => {
    const glicose = { analyteCode: '2345-7', projectLabel: 'Glicose', unit: 'mg/dL', rawUnit: 'mg/dL' };
    const series = buildAnalyteSeries([
      linha({ ...glicose, id: 'j1', value: 92, collectionMoment: 'jejum', collectedAt: '2026-03-12' }),
      linha({ ...glicose, id: 'c1', value: 128, collectionMoment: '120 minutos', collectedAt: '2026-03-12' }),
      linha({ ...glicose, id: 'j2', value: 97, collectionMoment: 'jejum', collectedAt: '2026-09-20' }),
      linha({ ...glicose, id: 'c2', value: 134, collectionMoment: '120 minutos', collectedAt: '2026-09-20' }),
    ]);
    expect(series).toHaveLength(2);
    const jejum = series.find((s) => s.collectionMoment === 'jejum');
    expect(jejum?.points.map((p) => p.id)).toEqual(['j1', 'j2']);
  });

  it('momento vazio e momento ausente sao a mesma serie', () => {
    const series = buildAnalyteSeries([
      linha({ id: 'a', collectionMoment: null }),
      linha({ id: 'b', collectionMoment: '', collectedAt: '2026-09-20' }),
    ]);
    expect(series).toHaveLength(1);
  });

  it('duas coletas na mesma data desempatam por id, NUNCA por valor', () => {
    // Desempatar por valor produziria uma serie artificialmente crescente --
    // um padrao que a pessoa leria como evolucao e que nao existe.
    const a = buildAnalyteSeries([
      linha({ id: 'zz', value: 10 }),
      linha({ id: 'aa', value: 90 }),
    ]);
    expect(a[0].points.map((p) => p.id)).toEqual(['aa', 'zz']);
  });

  it('linha sem data de coleta nao quebra a montagem', () => {
    // A EPIC anterior garante a reserva da data do formulario, mas um dado
    // antigo pode nao ter passado por ela.
    expect(() => buildAnalyteSeries([linha({ id: 'a', collectedAt: null })])).not.toThrow();
  });

  it('lista vazia devolve lista vazia, sem lancar', () => {
    expect(buildAnalyteSeries([])).toEqual([]);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest analyteSeries`
Esperado: FALHA com "Cannot find module '@/services/analyteSeries'".

- [ ] **Passo 3: Implementar**

```typescript
// src/services/analyteSeries.ts

/**
 * Resumo do arquivo:
 * Decide O QUE PODE SER COMPARADO. E o produto desta EPIC, e por isso e um
 * modulo puro -- sem React, sem Amplify, sem AWS -- testado como funcao e nao
 * atraves de uma renderizacao.
 *
 * Regra que organiza o arquivo inteiro: NADA sai da serie em silencio. Toda
 * linha que existe e nao vira ponto entra em `excluded` com o motivo. Uma tela
 * que mostra dois pontos quando existem tres, sem dizer nada, mente por
 * omissao -- e esta e uma tela que a pessoa leva para uma consulta.
 */
import type { LabResultView } from './extractionService';

export type ExclusionReason =
  | 'pendente-de-revisao'
  | 'sem-valor'
  | 'limite-de-deteccao'
  | 'unidade-divergente';

export type SeriesPoint = {
  id: string;
  documentId: string;
  collectedAt: string;
  value: number;
  referenceLow: number | null;
  referenceHigh: number | null;
  rawValue: string;
  rawUnit: string | null;
};

export type ExcludedResult = {
  id: string;
  documentId: string;
  collectedAt: string | null;
  reason: ExclusionReason;
  result: LabResultView;
};

export type AnalyteSeries = {
  analyteCode: string;
  projectLabel: string;
  analyteLabel: string;
  /** null quando o laudo nao nomeou o momento -- o caso comum. */
  collectionMoment: string | null;
  unit: string;
  points: SeriesPoint[];
  excluded: ExcludedResult[];
};

/** Momento vazio e momento ausente sao a MESMA serie: o modelo pode devolver
 *  null ou "", e um laudo com um valor so nao pode virar duas series conforme
 *  qual dos dois veio. */
function chaveDoMomento(momento: string | null): string {
  return (momento ?? '').trim();
}

/**
 * A unidade da serie e a da coleta MAIS RECENTE que tem valor. Nao e uma
 * escolha arbitraria: se a normalizacao mudar de unidade canonica no futuro, a
 * serie passa a falar a lingua nova e as antigas aparecem como divergentes,
 * visiveis e contadas -- em vez de a serie inteira virar invisivel.
 */
function unidadeDaSerie(linhas: LabResultView[]): string {
  const comUnidade = linhas
    .filter((l) => l.unit && l.value !== null)
    .sort((a, b) => (b.collectedAt ?? '').localeCompare(a.collectedAt ?? ''));
  return comUnidade[0]?.unit ?? linhas[0]?.unit ?? '';
}

function motivoDaExclusao(linha: LabResultView, unidade: string): ExclusionReason | null {
  // A ORDEM IMPORTA. Uma linha pendente com valor nulo e reportada como
  // pendente, porque e isso que a pessoa pode resolver.
  if (linha.reviewStatus === 'PENDENTE_DE_REVISAO') return 'pendente-de-revisao';
  if (linha.value === null) return 'sem-valor';
  if (linha.valueQualifier) return 'limite-de-deteccao';
  if (linha.unit !== unidade) return 'unidade-divergente';
  return null;
}

export function buildAnalyteSeries(results: LabResultView[]): AnalyteSeries[] {
  const grupos = new Map<string, LabResultView[]>();

  for (const linha of results) {
    // A chave e (analito, momento), nunca so o analito (D22). Glicose em jejum
    // e glicose de 120 minutos sao a mesma substancia medida em condicoes que
    // nao se comparam.
    const chave = `${linha.analyteCode}${chaveDoMomento(linha.collectionMoment)}`;
    const atual = grupos.get(chave);
    if (atual) atual.push(linha);
    else grupos.set(chave, [linha]);
  }

  const series: AnalyteSeries[] = [];

  for (const linhas of grupos.values()) {
    const unidade = unidadeDaSerie(linhas);
    const points: SeriesPoint[] = [];
    const excluded: ExcludedResult[] = [];

    for (const linha of linhas) {
      const motivo = motivoDaExclusao(linha, unidade);
      if (motivo || linha.value === null || !linha.collectedAt) {
        excluded.push({
          id: linha.id,
          documentId: linha.documentId,
          collectedAt: linha.collectedAt,
          reason: motivo ?? 'sem-valor',
          result: linha,
        });
        continue;
      }

      points.push({
        id: linha.id,
        documentId: linha.documentId,
        collectedAt: linha.collectedAt,
        value: linha.value,
        referenceLow: linha.referenceLow,
        referenceHigh: linha.referenceHigh,
        rawValue: linha.rawValue,
        rawUnit: linha.rawUnit,
      });
    }

    // Desempate por id, NUNCA por valor: ordenar por valor produziria uma
    // serie artificialmente crescente, que a pessoa leria como evolucao.
    points.sort((a, b) => a.collectedAt.localeCompare(b.collectedAt) || a.id.localeCompare(b.id));

    const referencia = linhas[0];
    series.push({
      analyteCode: referencia.analyteCode,
      projectLabel: referencia.projectLabel,
      analyteLabel: referencia.analyteLabel,
      collectionMoment: chaveDoMomento(referencia.collectionMoment) || null,
      unit: unidade,
      points,
      excluded,
    });
  }

  return series.sort(
    (a, b) =>
      b.points.length - a.points.length ||
      a.projectLabel.localeCompare(b.projectLabel, 'pt-BR') ||
      (a.collectionMoment ?? '').localeCompare(b.collectionMoment ?? '', 'pt-BR'),
  );
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest analyteSeries`
Esperado: PASSA, onze testes.

- [ ] **Passo 5: Commitar**

```bash
git add src/services/analyteSeries.ts __tests__/analyteSeries.test.ts
git commit -m "feat(serie): montagem da serie por analito, com exclusao sempre declarada"
```

---

## Tarefa S2: A faixa de referência comum

**Arquivos:**
- Modificar: `src/services/analyteSeries.ts`
- Teste: `__tests__/analyteSeries.test.ts`

**Interfaces:**
- Produz: `sharedReferenceRange(points: SeriesPoint[]): { low: number | null; high: number | null } | null`

Separada da S1 de propósito: é a regra mais fácil de implementar errado, e implementá-la errado produz **uma banda desenhada por cima de pontos a que ela não se aplica** — a forma mais convincente de mentir num gráfico.

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { sharedReferenceRange } from '@/services/analyteSeries';

const ponto = (low: number | null, high: number | null, id = 'p') => ({
  id, documentId: 'd', collectedAt: '2026-03-12', value: 32,
  referenceLow: low, referenceHigh: high, rawValue: '32', rawUnit: 'ng/mL',
});

describe('sharedReferenceRange', () => {
  it('devolve a faixa quando todos os laboratorios concordam', () => {
    expect(sharedReferenceRange([ponto(30, 100, 'a'), ponto(30, 100, 'b')])).toEqual({ low: 30, high: 100 });
  });

  it('devolve nulo quando QUALQUER ponto diverge', () => {
    // Desenhar a faixa do laboratorio mais recente por cima dos pontos de
    // outro afirma um criterio que nao vale para eles.
    expect(sharedReferenceRange([ponto(30, 100, 'a'), ponto(20, 100, 'b')])).toBeNull();
  });

  it('faixa parcial conta como faixa e e comparada como tal', () => {
    expect(sharedReferenceRange([ponto(30, null, 'a'), ponto(30, null, 'b')])).toEqual({ low: 30, high: null });
    expect(sharedReferenceRange([ponto(30, null, 'a'), ponto(30, 100, 'b')])).toBeNull();
  });

  it('devolve nulo quando nenhum ponto tem faixa', () => {
    expect(sharedReferenceRange([ponto(null, null, 'a'), ponto(null, null, 'b')])).toBeNull();
  });

  it('um ponto so tem faixa comum -- a dele', () => {
    expect(sharedReferenceRange([ponto(30, 100)])).toEqual({ low: 30, high: 100 });
  });

  it('lista vazia devolve nulo, sem lancar', () => {
    expect(sharedReferenceRange([])).toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest analyteSeries`
Esperado: FALHA — `sharedReferenceRange is not a function`.

- [ ] **Passo 3: Implementar**

```typescript
// src/services/analyteSeries.ts -- acrescentar

/**
 * A faixa comum da serie, ou null quando os laboratorios discordam.
 *
 * TUDO OU NADA, de proposito. Um laboratorio usa 30 a 100 para vitamina D e
 * outro usa 20 a 100; desenhar uma banda unica por cima dos dois afirma um
 * criterio que nao vale para metade dos pontos. Quando ha divergencia, a faixa
 * vive na lista, ao lado do ponto a que pertence.
 *
 * Faixa parcial (so limite inferior) e uma faixa legitima: e comum em analito
 * em que so o piso importa. Ela e comparada como tal, e so casa com outra
 * igualmente parcial.
 */
export function sharedReferenceRange(
  points: SeriesPoint[],
): { low: number | null; high: number | null } | null {
  if (points.length === 0) return null;

  const primeiro = points[0];
  if (primeiro.referenceLow === null && primeiro.referenceHigh === null) return null;

  const todosIguais = points.every(
    (p) => p.referenceLow === primeiro.referenceLow && p.referenceHigh === primeiro.referenceHigh,
  );

  return todosIguais ? { low: primeiro.referenceLow, high: primeiro.referenceHigh } : null;
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest analyteSeries`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add src/services/analyteSeries.ts __tests__/analyteSeries.test.ts
git commit -m "feat(serie): faixa de referencia comum e tudo-ou-nada entre laboratorios"
```

---

## Tarefa S3: Consulta

**Arquivos:**
- Criar: `src/services/analyteSeriesService.ts`
- Teste: `__tests__/analyteSeriesService.test.ts`

**Interfaces:**
- Consome: `LabResult` pelo índice `analyteCode`/`collectedAt` (EPIC de extração, tarefa 7).
- Produz:
  - `listLabResultsByAnalyte(analyteCode: string): Promise<LabResultView[]>`
  - `listAnalytesWithResults(): Promise<AnalyteOption[]>`
  - `type AnalyteOption = { analyteCode: string; projectLabel: string; collectionCount: number }`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { listLabResultsByAnalyte, listAnalytesWithResults } from '@/services/analyteSeriesService';

const list = jest.fn();
const listByAnalyte = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      LabResult: {
        list: (...args: unknown[]) => list(...args),
        listLabResultByAnalyteCodeAndCollectedAt: (...args: unknown[]) => listByAnalyte(...args),
      },
    },
  }),
}));

describe('analyteSeriesService', () => {
  beforeEach(() => { list.mockReset(); listByAnalyte.mockReset(); });

  it('consulta pelo indice, nao por varredura com filtro', () => {
    listByAnalyte.mockResolvedValue({ data: [], errors: undefined, nextToken: null });
    return listLabResultsByAnalyte('62292-8').then(() => {
      expect(listByAnalyte).toHaveBeenCalledWith(expect.objectContaining({ analyteCode: '62292-8' }));
      expect(list).not.toHaveBeenCalled();
    });
  });

  it('segue a paginacao ate o fim', async () => {
    listByAnalyte
      .mockResolvedValueOnce({ data: [{ id: 'a' }], nextToken: 'n1' })
      .mockResolvedValueOnce({ data: [{ id: 'b' }], nextToken: null });
    const linhas = await listLabResultsByAnalyte('62292-8');
    expect(linhas.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('para a paginacao no teto, em vez de girar para sempre', async () => {
    listByAnalyte.mockResolvedValue({ data: [{ id: 'x' }], nextToken: 'sempre' });
    const linhas = await listLabResultsByAnalyte('62292-8');
    expect(linhas.length).toBeLessThanOrEqual(2000);
  });

  it('conta as coletas por analito para o seletor', async () => {
    list.mockResolvedValue({
      data: [
        { id: '1', analyteCode: '62292-8', projectLabel: 'Vitamina D (25-OH)' },
        { id: '2', analyteCode: '62292-8', projectLabel: 'Vitamina D (25-OH)' },
        { id: '3', analyteCode: '2345-7', projectLabel: 'Glicose' },
      ],
      nextToken: null,
    });
    const opcoes = await listAnalytesWithResults();
    expect(opcoes[0]).toMatchObject({ analyteCode: '62292-8', collectionCount: 2 });
  });

  it('erro do AppSync vira excecao com a mensagem, nao lista vazia silenciosa', async () => {
    listByAnalyte.mockResolvedValue({ data: null, errors: [{ message: 'sem permissao' }] });
    await expect(listLabResultsByAnalyte('62292-8')).rejects.toThrow('sem permissao');
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest analyteSeriesService`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar**

```typescript
// src/services/analyteSeriesService.ts

/**
 * Resumo do arquivo:
 * Leitura de LabResult para a serie. NAO grava nada e NAO converte nada.
 *
 * A consulta usa o indice analyteCode/collectedAt criado na EPIC de extracao
 * -- nunca list() com filtro, que seria varredura da tabela com descarte do
 * lado do servidor.
 */
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { LabResultView } from './extractionService';

const client = generateClient<Schema>();

/** Defesa contra paginacao que nao termina. O volume esperado e de dezenas a
 *  poucas centenas de linhas por usuario -- se este teto for atingido, e bug,
 *  nao crescimento. */
const MAX_PAGINAS = 20;
const MAX_LINHAS = 2000;

export type AnalyteOption = {
  analyteCode: string;
  projectLabel: string;
  collectionCount: number;
};

function lancarSeErro(errors?: { message: string }[]): void {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
}

export async function listLabResultsByAnalyte(analyteCode: string): Promise<LabResultView[]> {
  const linhas: LabResultView[] = [];
  let nextToken: string | null | undefined = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const resposta = await client.models.LabResult.listLabResultByAnalyteCodeAndCollectedAt({
      analyteCode,
      ...(nextToken ? { nextToken } : {}),
    });
    lancarSeErro(resposta.errors);
    linhas.push(...((resposta.data ?? []) as unknown as LabResultView[]));

    nextToken = resposta.nextToken;
    if (!nextToken || linhas.length >= MAX_LINHAS) break;
  }

  return linhas.slice(0, MAX_LINHAS);
}

/**
 * A lista do seletor. Usa list() de proposito: a pergunta e "quais analitos eu
 * tenho", que nao tem chave de particao. O volume por usuario torna isso
 * adequado, e a alternativa seria um contador mantido a mao -- um dado
 * derivado que pode divergir da verdade, que e o tipo de coisa que este
 * projeto evita.
 */
export async function listAnalytesWithResults(): Promise<AnalyteOption[]> {
  const porCodigo = new Map<string, AnalyteOption>();
  let nextToken: string | null | undefined = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const resposta = await client.models.LabResult.list({
      selectionSet: ['id', 'analyteCode', 'projectLabel'],
      ...(nextToken ? { nextToken } : {}),
    });
    lancarSeErro(resposta.errors);

    for (const linha of resposta.data ?? []) {
      const atual = porCodigo.get(linha.analyteCode);
      if (atual) atual.collectionCount += 1;
      else porCodigo.set(linha.analyteCode, {
        analyteCode: linha.analyteCode,
        projectLabel: linha.projectLabel ?? linha.analyteCode,
        collectionCount: 1,
      });
    }

    nextToken = resposta.nextToken;
    if (!nextToken) break;
  }

  // Mais coletas primeiro: o que tem mais historico e provavelmente o que a
  // pessoa veio ver.
  return [...porCodigo.values()].sort(
    (a, b) => b.collectionCount - a.collectionCount || a.projectLabel.localeCompare(b.projectLabel, 'pt-BR'),
  );
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest analyteSeriesService`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add src/services/analyteSeriesService.ts __tests__/analyteSeriesService.test.ts
git commit -m "feat(serie): consulta de LabResult pelo indice de analito, com paginacao limitada"
```

---

## Tarefa S4: A tela e seus estados

**Arquivos:**
- Criar: `src/hooks/useAnalyteSeries.ts`
- Criar: `src/screens/AnalyteSeriesScreen.tsx`
- Criar: `src/app/(app)/analyte-series.tsx`
- Teste: `__tests__/AnalyteSeriesScreen.test.tsx`

**Interfaces:**
- Consome: `buildAnalyteSeries`, `sharedReferenceRange` (S1, S2), `listLabResultsByAnalyte`, `listAnalytesWithResults` (S3).
- Produz: a tela com os quatro estados.

- [ ] **Passo 1: Escrever o teste dos estados**

```tsx
import { render, screen } from '@testing-library/react-native';
import { AnalyteSeriesScreen } from '@/screens/AnalyteSeriesScreen';

describe('AnalyteSeriesScreen', () => {
  it('sem nenhum exame, explica e leva para adicionar', () => {
    render(<AnalyteSeriesScreen {...props({ options: [], series: [] })} />);
    expect(screen.getByText(/adicionar um exame/i)).toBeTruthy();
    expect(screen.queryByText(/erro/i)).toBeNull();
  });

  it('uma coleta so NAO desenha grafico', () => {
    // Um grafico de um ponto nao e uma serie: e um ponto com eixos em volta.
    render(<AnalyteSeriesScreen {...props({ series: [serieCom(1)] })} />);
    expect(screen.getByText(/ainda não há com o que comparar/i)).toBeTruthy();
    expect(screen.queryByLabelText(/evolução de/i)).toBeNull();
  });

  it('duas coletas desenham o grafico com a unidade canonica', () => {
    render(<AnalyteSeriesScreen {...props({ series: [serieCom(2)] })} />);
    expect(screen.getByLabelText(/evolução de/i)).toBeTruthy();
    expect(screen.getAllByText(/ng\/mL/).length).toBeGreaterThan(0);
  });

  it('diz o que ficou de fora, com contagem e motivo', () => {
    render(<AnalyteSeriesScreen {...props({ series: [serieComPendente()] })} />);
    expect(screen.getByText(/1 resultado aguarda sua conferência/i)).toBeTruthy();
  });

  it('o seletor de momento so aparece quando ha mais de um momento', () => {
    render(<AnalyteSeriesScreen {...props({ series: [serieCom(2)] })} />);
    expect(screen.queryByText(/jejum/i)).toBeNull();

    render(<AnalyteSeriesScreen {...props({ series: seriesDaCurvaGlicemica() })} />);
    expect(screen.getAllByText(/jejum/i).length).toBeGreaterThan(0);
  });

  it('sempre encaminha a um profissional de saude', () => {
    render(<AnalyteSeriesScreen {...props({ series: [serieCom(2)] })} />);
    expect(screen.getByText(/profissional de saúde|seu médico/i)).toBeTruthy();
  });

  it('nenhuma copy interpreta o resultado', () => {
    const { toJSON } = render(<AnalyteSeriesScreen {...props({ series: [serieCom(2)] })} />);
    const texto = JSON.stringify(toJSON()).toLowerCase();
    expect(texto).not.toMatch(/melhor|pior|normal|alterado|preocupante|dentro da faixa|fora da faixa|tendência/);
  });

  it('nenhuma copy usa o termo vetado', () => {
    const { toJSON } = render(<AnalyteSeriesScreen {...props({ series: [serieCom(2)] })} />);
    expect(JSON.stringify(toJSON()).toLowerCase()).not.toMatch(/\bfinal\b|finaliz/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest AnalyteSeriesScreen`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar o hook**

```typescript
// src/hooks/useAnalyteSeries.ts

/**
 * Resumo do arquivo:
 * Estado da tela de serie. Carrega a lista de analitos uma vez, e as linhas do
 * analito escolhido a cada troca.
 *
 * NAO usa subscription: as linhas sao escritas DIRETO no DynamoDB pela Lambda,
 * bypassando o AppSync, e uma subscription nunca dispararia -- o mesmo motivo
 * que useHealthImportStatus documenta. Aqui nem polling e preciso: a serie e
 * historico, nao trabalho em andamento.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildAnalyteSeries, sharedReferenceRange, type AnalyteSeries } from '@/services/analyteSeries';
import { listAnalytesWithResults, listLabResultsByAnalyte, type AnalyteOption } from '@/services/analyteSeriesService';

export type UseAnalyteSeriesResult = {
  options: AnalyteOption[];
  selectedCode: string | null;
  selectCode: (code: string) => void;
  /** As series do analito escolhido -- mais de uma quando ha mais de um momento. */
  series: AnalyteSeries[];
  selectedMoment: string | null;
  selectMoment: (moment: string | null) => void;
  activeSeries: AnalyteSeries | null;
  referenceRange: { low: number | null; high: number | null } | null;
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => void;
};

export function useAnalyteSeries(initialCode?: string | null): UseAnalyteSeriesResult {
  const [options, setOptions] = useState<AnalyteOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(initialCode ?? null);
  const [series, setSeries] = useState<AnalyteSeries[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const lista = await listAnalytesWithResults();
      setOptions(lista);

      // Sem escolha explicita, abre no que tem mais historico -- que e o que a
      // pessoa provavelmente veio ver.
      const codigo = selectedCode ?? lista[0]?.analyteCode ?? null;
      setSelectedCode(codigo);

      if (!codigo) {
        setSeries([]);
        return;
      }

      const linhas = await listLabResultsByAnalyte(codigo);
      const montadas = buildAnalyteSeries(linhas);
      setSeries(montadas);
      // Reposiciona o momento: o que estava escolhido pode nao existir no
      // analito novo.
      setSelectedMoment((atual) =>
        montadas.some((s) => s.collectionMoment === atual) ? atual : (montadas[0]?.collectionMoment ?? null),
      );
    } catch (erro) {
      setErrorMessage(erro instanceof Error ? erro.message : 'Não foi possível carregar seus resultados.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCode]);

  useEffect(() => { void carregar(); }, [carregar]);

  const activeSeries = useMemo(
    () => series.find((s) => s.collectionMoment === selectedMoment) ?? series[0] ?? null,
    [series, selectedMoment],
  );

  const referenceRange = useMemo(
    () => (activeSeries ? sharedReferenceRange(activeSeries.points) : null),
    [activeSeries],
  );

  return {
    options,
    selectedCode,
    selectCode: (code) => { setSelectedCode(code); setSelectedMoment(null); },
    series,
    selectedMoment,
    selectMoment: setSelectedMoment,
    activeSeries,
    referenceRange,
    isLoading,
    errorMessage,
    refresh: () => void carregar(),
  };
}
```

- [ ] **Passo 4: Implementar a tela**

```tsx
// src/screens/AnalyteSeriesScreen.tsx

/**
 * Resumo do arquivo:
 * Tela de comparacao entre coletas do mesmo analito.
 *
 * REGRA DE COPY DESTA TELA: nada aqui diz se o numero e bom, ruim, normal ou
 * alterado, e nada calcula tendencia. Um grafico que sobe ja sugere um
 * julgamento -- acrescentar palavra ou cor a isso e interpretacao clinica, que
 * a regra 4 da constituicao proibe. A tela mostra numero, faixa e origem; quem
 * interpreta e o profissional de saude, e e para ele que o rodape encaminha.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { AnalyteCollectionRow } from '@/components/AnalyteCollectionRow';
import { AnalyteSeriesChart } from '@/components/AnalyteSeriesChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DetailHeader } from '@/components/DetailHeader';
import { InlineError } from '@/components/InlineError';
import { useAnalyteSeries } from '@/hooks/useAnalyteSeries';

const MOTIVOS: Record<string, string> = {
  'pendente-de-revisao': 'aguarda sua conferência',
  'sem-valor': 'não pôde ser lido',
  'limite-de-deteccao': 'foi informado como um limite, não como uma medida',
  'unidade-divergente': 'está em outra unidade',
};

export function AnalyteSeriesScreen({ initialCode }: { initialCode?: string | null }) {
  const s = useAnalyteSeries(initialCode);
  const serie = s.activeSeries;
  const momentos = s.series.map((x) => x.collectionMoment).filter((m): m is string => !!m);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <DetailHeader title="Evolução dos resultados" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-4 pb-10">
        {s.errorMessage ? <InlineError message={s.errorMessage} /> : null}

        {/* Estado: nenhum exame com valor extraido */}
        {!s.isLoading && s.options.length === 0 ? (
          <Card>
            <Text className="text-base font-medium text-foreground">Ainda não há resultados para acompanhar</Text>
            <Text className="mt-2 text-sm text-muted-foreground">
              Assim que você adicionar um exame com valores, eles aparecem aqui e passam a ser comparados entre uma coleta e outra.
            </Text>
            <Button className="mt-4" onPress={() => router.push('/add-exam')}>Adicionar um exame</Button>
          </Card>
        ) : null}

        {/* Seletor de analito */}
        {s.options.length > 0 ? (
          <Card>
            <Text className="text-sm font-medium text-muted-foreground">Resultado</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {s.options.map((opcao) => (
                <Button
                  key={opcao.analyteCode}
                  variant={opcao.analyteCode === s.selectedCode ? 'primary' : 'secondary'}
                  onPress={() => s.selectCode(opcao.analyteCode)}
                >
                  {`${opcao.projectLabel} (${opcao.collectionCount})`}
                </Button>
              ))}
            </View>
          </Card>
        ) : null}

        {/* Seletor de momento -- so quando ha mais de um (D22) */}
        {momentos.length > 1 ? (
          <Card className="mt-4">
            <Text className="text-sm font-medium text-muted-foreground">Momento da coleta</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Este exame foi colhido em momentos diferentes. Cada momento é acompanhado separadamente.
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {s.series.map((x) => (
                <Button
                  key={x.collectionMoment ?? 'sem-momento'}
                  variant={x.collectionMoment === serie?.collectionMoment ? 'primary' : 'secondary'}
                  onPress={() => s.selectMoment(x.collectionMoment)}
                >
                  {x.collectionMoment ?? 'Sem momento informado'}
                </Button>
              ))}
            </View>
          </Card>
        ) : null}

        {serie ? (
          <>
            {/* Grafico -- so com dois pontos ou mais */}
            {serie.points.length >= 2 ? (
              <Card className="mt-4">
                <AnalyteSeriesChart series={serie} referenceRange={s.referenceRange} />
              </Card>
            ) : null}

            {serie.points.length === 1 ? (
              <Card className="mt-4">
                <Text className="text-sm text-muted-foreground">
                  Você tem uma coleta deste resultado. Ainda não há com o que comparar — quando você adicionar outro exame com o mesmo resultado, a comparação aparece aqui.
                </Text>
              </Card>
            ) : null}

            {/* O que ficou de fora. Contado e explicado, nunca omitido. */}
            {serie.excluded.length > 0 ? (
              <Card className="mt-4 border-l-4 border-l-warning">
                <Text className="text-sm text-foreground">
                  {serie.excluded.length === 1
                    ? `1 resultado ${MOTIVOS[serie.excluded[0].reason]} e não entrou na comparação.`
                    : `${serie.excluded.length} resultados não entraram na comparação.`}
                </Text>
                {serie.excluded.map((item) => (
                  <Button
                    key={item.id}
                    variant="secondary"
                    className="mt-2"
                    onPress={() => router.push(`/document-detail?id=${item.documentId}`)}
                  >
                    {`Ver o documento de ${item.collectedAt ?? 'data não informada'}`}
                  </Button>
                ))}
              </Card>
            ) : null}

            {/* Lista das coletas, da mais recente para a mais antiga */}
            <Card className="mt-4">
              <Text className="text-sm font-medium text-muted-foreground">Coletas</Text>
              {[...serie.points].reverse().map((ponto) => (
                <AnalyteCollectionRow key={ponto.id} point={ponto} unit={serie.unit} />
              ))}
            </Card>

            <Text className="mt-4 text-xs text-muted-foreground">
              Estes números vieram dos seus documentos e servem para organizar seu histórico. Leve seus exames ao seu médico para avaliar o que eles significam.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
```

E a rota, que só lê o parâmetro:

```tsx
// src/app/(app)/analyte-series.tsx
import { useLocalSearchParams } from 'expo-router';
import { AnalyteSeriesScreen } from '@/screens/AnalyteSeriesScreen';

export default function AnalyteSeriesRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <AnalyteSeriesScreen initialCode={code ?? null} />;
}
```

- [ ] **Passo 5: Rodar e confirmar que passa**

Executar: `npx jest AnalyteSeriesScreen`
Esperado: PASSA.

- [ ] **Passo 6: Commitar**

```bash
git add src/hooks/useAnalyteSeries.ts src/screens/AnalyteSeriesScreen.tsx src/app/\(app\)/analyte-series.tsx __tests__/AnalyteSeriesScreen.test.tsx
git commit -m "feat(serie): tela de evolucao por analito, com quatro estados e nada interpretado"
```

---

## Tarefa S5: O gráfico

**Arquivos:**
- Criar: `src/components/AnalyteSeriesChart.tsx`
- Teste: `__tests__/AnalyteSeriesChart.test.tsx`

**Interfaces:**
- Consome: `LineChart`, `LineChartSeries`, `LineChartReferenceLine` de `src/components/charts/LineChart.tsx`; `AnalyteSeries` (S1).
- Produz: `AnalyteSeriesChart`.

- [ ] **Passo 1: Escrever o teste que falha**

```tsx
import { render, screen } from '@testing-library/react-native';
import { AnalyteSeriesChart } from '@/components/AnalyteSeriesChart';
import { buildLinePath } from '@/components/charts/chartScale';

describe('AnalyteSeriesChart', () => {
  it('desenha a linha de referencia quando os laboratorios concordam', () => {
    render(<AnalyteSeriesChart series={serieCom(2)} referenceRange={{ low: 30, high: 100 }} />);
    expect(screen.getByLabelText(/referência do laboratório/i)).toBeTruthy();
  });

  it('NAO desenha linha de referencia quando eles divergem', () => {
    render(<AnalyteSeriesChart series={serieCom(2)} referenceRange={null} />);
    expect(screen.queryByLabelText(/referência do laboratório/i)).toBeNull();
    expect(screen.getByText(/laboratórios usam faixas diferentes/i)).toBeTruthy();
  });

  it('um traco so, na cor primaria -- nenhuma cor comunica julgamento', () => {
    const { toJSON } = render(<AnalyteSeriesChart series={serieCom(3)} referenceRange={null} />);
    const cores = JSON.stringify(toJSON()).match(/#[0-9a-f]{6}/gi) ?? [];
    // Vermelho e verde de semaforo nao aparecem: "dentro" e "fora" da faixa e
    // interpretacao clinica pintada.
    expect(cores.map((c) => c.toLowerCase())).not.toContain('#d32f2f');
  });

  it('buraco quebra o traco -- nada e interpolado', () => {
    // Garantia herdada de chartScale, e esta EPIC depende dela.
    const path = buildLinePath([
      { dateKey: '2026-03-12', value: 32 },
      { dateKey: '2026-06-01', value: null },
      { dateKey: '2026-09-20', value: 41 },
    ], [0, 50], 100, 50, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(path.split('M').length - 1).toBeGreaterThan(1);
  });

  it('o resumo para leitor de tela diz os valores, nao um julgamento', () => {
    render(<AnalyteSeriesChart series={serieCom(2)} referenceRange={null} />);
    const rotulo = screen.getByLabelText(/evolução de/i).props.accessibilityLabel.toLowerCase();
    expect(rotulo).toMatch(/ng\/ml/);
    expect(rotulo).not.toMatch(/melhor|pior|normal|alterado/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest AnalyteSeriesChart`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar**

```tsx
// src/components/AnalyteSeriesChart.tsx

/**
 * Resumo do arquivo:
 * Casca fina sobre o LineChart que ja existe no repositorio. O que ela
 * acrescenta e uma regra so, e e a regra que impede o grafico de mentir: a
 * linha de referencia e TUDO OU NADA.
 *
 * O eixo X do LineChart posiciona por INDICE, nao por data -- correto para dado
 * diario de wearable, impreciso para exame, que e esparso. A mitigacao e
 * rotular todos os pontos, decidida na spec (secao 6) em vez de mexer em
 * chartScale, de que a feature de wearable depende.
 */
import React from 'react';
import { Text, View } from 'react-native';

import { LineChart, type LineChartReferenceLine } from '@/components/charts/LineChart';
import { useThemeColors } from '@/constants/theme';
import type { AnalyteSeries } from '@/services/analyteSeries';

export interface AnalyteSeriesChartProps {
  series: AnalyteSeries;
  referenceRange: { low: number | null; high: number | null } | null;
}

function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return mes && dia ? `${dia}/${mes}` : iso;
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function AnalyteSeriesChart({ series, referenceRange }: AnalyteSeriesChartProps) {
  const colors = useThemeColors();

  const pontos = series.points.map((p) => ({ dateKey: p.collectedAt, value: p.value }));

  // Tudo ou nada. Sem esta condicao, a faixa de um laboratorio seria desenhada
  // por cima de pontos de outro -- a forma mais convincente de mentir num
  // grafico, porque a banda parece autoridade.
  const linhasDeReferencia: LineChartReferenceLine[] = referenceRange
    ? [
        referenceRange.low !== null
          ? { value: referenceRange.low, label: `Referência do laboratório: ${numero(referenceRange.low)}`, color: colors.mutedForeground }
          : null,
        referenceRange.high !== null
          ? { value: referenceRange.high, label: `Referência do laboratório: ${numero(referenceRange.high)}`, color: colors.mutedForeground }
          : null,
      ].filter((l): l is LineChartReferenceLine => l !== null)
    : [];

  // O resumo para leitor de tela diz VALORES E DATAS, nunca um julgamento --
  // o SVG e invisivel para acessibilidade, e este texto e tudo que a pessoa
  // ouve. Uma palavra de interpretacao aqui seria a mais invisivel de todas.
  const resumo = `Evolução de ${series.projectLabel}${series.collectionMoment ? ` (${series.collectionMoment})` : ''}, em ${series.unit}: ${series.points
    .map((p) => `${dataCurta(p.collectedAt)}, ${numero(p.value)}`)
    .join('; ')}.`;

  return (
    <View>
      <Text className="text-base font-medium text-foreground">{series.projectLabel}</Text>
      <Text className="text-xs text-muted-foreground">
        {series.unit}
        {series.collectionMoment ? ` · ${series.collectionMoment}` : ''}
      </Text>

      <View className="mt-3">
        <LineChart
          height={180}
          yUnit={series.unit}
          emptyMessage="Não há coletas suficientes para desenhar a evolução."
          accessibilityLabel={resumo}
          referenceLines={linhasDeReferencia}
          series={[{
            id: series.analyteCode,
            label: series.projectLabel,
            // Uma cor so, a primaria. Verde para "dentro" e vermelho para
            // "fora" seria interpretacao clinica pintada.
            color: colors.primary,
            points: pontos,
            showDots: true,
          }]}
        />
      </View>

      {/* Mitigacao do eixo por indice: TODOS os pontos rotulados com a data. */}
      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {series.points.map((p) => (
          <Text key={p.id} className="text-xs text-muted-foreground">
            {dataCurta(p.collectedAt)} · {numero(p.value)}
          </Text>
        ))}
      </View>

      {!referenceRange && series.points.some((p) => p.referenceLow !== null || p.referenceHigh !== null) ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          Os laboratórios usam faixas diferentes para este resultado, então a faixa aparece ao lado de cada coleta, e não no gráfico.
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest AnalyteSeriesChart`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add src/components/AnalyteSeriesChart.tsx __tests__/AnalyteSeriesChart.test.tsx
git commit -m "feat(serie): grafico com faixa de referencia tudo-ou-nada e sem cor de julgamento"
```

---

## Tarefa S6: A lista das coletas

**Arquivos:**
- Criar: `src/components/AnalyteCollectionRow.tsx`
- Teste: `__tests__/AnalyteCollectionRow.test.tsx`

**Interfaces:**
- Consome: `SeriesPoint` (S1).
- Produz: `AnalyteCollectionRow`.

- [ ] **Passo 1: Escrever o teste que falha**

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AnalyteCollectionRow } from '@/components/AnalyteCollectionRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const ponto = {
  id: 'p1', documentId: 'doc-marco', collectedAt: '2026-03-12', value: 32.5,
  referenceLow: 30, referenceHigh: 100, rawValue: '79,87', rawUnit: 'nmol/L',
};

describe('AnalyteCollectionRow', () => {
  it('mostra data, valor e a faixa daquele laboratorio', () => {
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(screen.getByText(/12\/03\/2026/)).toBeTruthy();
    expect(screen.getByText(/32,5/)).toBeTruthy();
    expect(screen.getByText(/30.*100/)).toBeTruthy();
  });

  it('mostra o que estava no papel quando difere do valor exibido', () => {
    // E a rastreabilidade que a EPIC anterior gravou para isto: quando a
    // pessoa perguntar de onde saiu 32,5, a resposta e "79,87 nmol/L no
    // documento de marco", nao o resultado da conta.
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(screen.getByText(/79,87 nmol\/L/)).toBeTruthy();
  });

  it('NAO repete o papel quando ele e igual ao valor exibido', () => {
    render(<AnalyteCollectionRow point={{ ...ponto, rawValue: '32,5', rawUnit: 'ng/mL' }} unit="ng/mL" />);
    expect(screen.queryByText(/no documento/i)).toBeNull();
  });

  it('abre o documento de origem', () => {
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    fireEvent.press(screen.getByLabelText(/abrir o documento/i));
    expect(router.push).toHaveBeenCalledWith('/document-detail?id=doc-marco');
  });

  it('nenhuma copy compara o valor com a faixa', () => {
    const { toJSON } = render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(JSON.stringify(toJSON()).toLowerCase()).not.toMatch(/dentro|fora|acima|abaixo|normal|alterado/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest AnalyteCollectionRow`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar**

```tsx
// src/components/AnalyteCollectionRow.tsx

/**
 * Resumo do arquivo:
 * Uma coleta na lista da tela de serie.
 *
 * Mostra a faixa do laboratorio DAQUELA coleta e nao a compara com o valor.
 * "Dentro da faixa" e "acima do limite" sao leitura clinica, e a regra 4 as
 * proibe. A pessoa ve os dois numeros e leva a duvida a uma consulta.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';
import type { SeriesPoint } from '@/services/analyteSeries';

export interface AnalyteCollectionRowProps {
  point: SeriesPoint;
  unit: string;
}

function numero(valor: number | null): string {
  return valor === null ? '—' : valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function dataLonga(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

export function AnalyteCollectionRow({ point, unit }: AnalyteCollectionRowProps) {
  const colors = useThemeColors();
  const faixa = point.referenceLow !== null || point.referenceHigh !== null
    ? `${numero(point.referenceLow)} a ${numero(point.referenceHigh)} ${unit}`
    : null;

  // So mostra o papel quando ele DIFERE do valor exibido -- repetir o mesmo
  // numero duas vezes e ruido, e ruido faz a pessoa parar de ler a linha que
  // as vezes importa.
  const papelDifere = point.rawValue.replace(',', '.') !== String(point.value) || point.rawUnit !== unit;

  return (
    <View className="mt-3 border-t border-border pt-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm text-muted-foreground">{dataLonga(point.collectedAt)}</Text>
        <Text className="text-base font-semibold text-foreground">{numero(point.value)} {unit}</Text>
      </View>

      {faixa ? (
        <Text className="mt-1 text-xs text-muted-foreground">Referência deste laboratório: {faixa}</Text>
      ) : (
        <Text className="mt-1 text-xs text-muted-foreground">Este laboratório não informou faixa de referência.</Text>
      )}

      {papelDifere ? (
        <Text className="mt-1 text-xs text-muted-foreground">
          No documento está escrito {point.rawValue}{point.rawUnit ? ` ${point.rawUnit}` : ''}.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir o documento de ${dataLonga(point.collectedAt)}`}
        className="mt-2 flex-row items-center gap-1"
        onPress={() => router.push(`/document-detail?id=${point.documentId}`)}
      >
        <Ionicons name="document-text-outline" size={14} color={colors.primary} />
        <Text className="text-xs font-medium text-primary">Ver documento de origem</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npm run validate`
Esperado: passa.

- [ ] **Passo 5: Commitar**

```bash
git add src/components/AnalyteCollectionRow.tsx __tests__/AnalyteCollectionRow.test.tsx
git commit -m "feat(serie): lista de coletas com faixa por laboratorio e rastreio ao papel"
```

---

## Tarefa S7: As verificações que são a razão de existir desta EPIC

Um teste de copy sobre uma tela só protege aquela tela. Esta tarefa varre **todas** as telas que mostram número de exame, porque a regra é do projeto e não do componente.

**Arquivos:**
- Teste: `__tests__/copyDaSerie.test.ts`

- [ ] **Passo 1: Escrever o teste**

```typescript
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

// Arquivos que mostram numero de exame para uma pessoa.
const ARQUIVOS = [
  'src/screens/AnalyteSeriesScreen.tsx',
  'src/components/AnalyteSeriesChart.tsx',
  'src/components/AnalyteCollectionRow.tsx',
  'src/components/ExtractedResultRow.tsx',
  'src/components/CorrectResultPanel.tsx',
];

// Extrai so o texto que uma pessoa LE -- conteudo entre tags e literais de
// string. Comentario de codigo pode conter "normal" ao explicar a regra, e
// proibir isso empurraria o projeto a nao explicar a regra.
function copyVisivel(fonte: string): string {
  const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return semComentarios.toLowerCase();
}

describe('copy das telas que mostram numero de exame', () => {
  it.each(ARQUIVOS)('%s nao usa o termo vetado nem suas derivacoes', (caminho) => {
    expect(copyVisivel(readFileSync(caminho, 'utf8'))).not.toMatch(/\bfinal\b|finaliz|finalid/);
  });

  it.each(ARQUIVOS)('%s nao classifica o resultado', (caminho) => {
    const texto = copyVisivel(readFileSync(caminho, 'utf8'));
    for (const proibido of ['dentro da faixa', 'fora da faixa', 'acima do normal', 'abaixo do normal', 'está alterado', 'preocupante', 'melhorou', 'piorou']) {
      expect(texto).not.toContain(proibido);
    }
  });

  it.each(ARQUIVOS)('%s encaminha a um profissional de saude quando mostra valor', (caminho) => {
    const texto = copyVisivel(readFileSync(caminho, 'utf8'));
    // So as telas, nao os componentes de linha -- o encaminhamento e da tela.
    if (!caminho.includes('screens/')) return;
    expect(texto).toMatch(/profissional de saúde|seu médico/);
  });
});
```

- [ ] **Passo 2: Rodar**

Executar: `npx jest copyDaSerie`
Esperado: PASSA. Se falhar, **a correção é a copy, nunca o teste.**

- [ ] **Passo 3: Commitar**

```bash
git add __tests__/copyDaSerie.test.ts
git commit -m "test(serie): varredura de copy sobre todas as telas que mostram numero de exame"
```

---

## Tarefa S8: Conferência contra o caso que motivou o projeto

Nenhum teste unitário substitui isto.

- [ ] **Passo 1: Subir dois exames reais do mesmo analito, de laboratórios diferentes**

De preferência com unidades diferentes no papel — vitamina D em `ng/mL` num e `nmol/L` no outro é o caso clássico, e é o exemplo que o roadmap usa como marco.

- [ ] **Passo 2: Conferir, olhando a tela, uma coisa de cada vez**

| O que conferir | O que estaria errado |
|---|---|
| Os dois valores aparecem na mesma unidade | uma conversão não aplicada |
| A faixa mostrada em cada ponto é a **daquele** laudo | a faixa do mais recente aplicada aos dois |
| Não há banda no gráfico se as faixas diferem | a mentira mais convincente do gráfico |
| O número no papel é recuperável a partir da tela | rastreabilidade perdida |
| A data de cada ponto é a **da coleta**, não a do upload | D24 não aplicada |
| Nenhuma palavra da tela julga o resultado | regra 4 quebrada |

- [ ] **Passo 3: Subir um exame com curva glicêmica e conferir a separação dos momentos**

O seletor de momento precisa aparecer, e o jejum precisa comparar com jejum.

- [ ] **Passo 4: Registrar em `estudos-ia/04-implementacao/notas.md`**

- [ ] **Passo 5: Commitar**

```bash
git add estudos-ia/04-implementacao/notas.md
git commit -m "chore(serie): conferencia da comparacao entre coletas contra exames reais"
```

---

## Auto-revisão deste plano

**Cobertura da spec.** Os sete cenários da seção 2 têm tarefa: duas coletas de laboratórios diferentes (S1, S3, S8), uma coleta só (S4), linha pendente fora da série (S1, S4), valor censurado listado e fora do traço (S1), curva glicêmica separada (S1, S4, S8), faixas divergentes (S2, S5), e nada para mostrar (S4). A seção 3 está em S4, S5 e S6; a seção 5 em S1 e S3; a seção 6 está distribuída, com a varredura de copy concentrada em S7. Os quinze critérios de aceite têm teste correspondente, com uma exceção deliberada: "nenhuma dependência nova" é processo, verificado no encerramento do `tasks.md`.

**Marcadores.** Nenhum passo de implementação sem bloco de código. Os passos sem código são os de execução (`npx jest`, `npm run validate`) e os da S8, que é conferência manual por natureza.

**Tipos, conferidos entre tarefas.** `LabResultView` vem da tarefa 11 da EPIC de extração e é consumido em S1 e S3 com o mesmo nome e a mesma forma — incluindo `value: number | null` e `reviewStatus` em caixa alta, que foram exatamente os dois pontos que mudaram na revisão daquela EPIC. `SeriesPoint` é definido em S1 e usado em S2, S5 e S6. `AnalyteSeries` em S1, usado em S4 e S5. `sharedReferenceRange` devolve `{ low, high } | null` em S2 e é consumido com essa forma em S4 e S5. `AnalyteOption` em S3, usado em S4. `LineChartReferenceLine` e `LineChartSeries` vêm de `src/components/charts/LineChart.tsx`, que já existe, e os campos usados (`id`, `label`, `color`, `points`, `showDots`, `value`, `emptyMessage`, `accessibilityLabel`) foram conferidos contra o arquivo.

**Dependência que trava.** S1 e S2 são puras e podem ser escritas antes de qualquer coisa da EPIC de extração estar pronta — elas só precisam do **tipo** `LabResultView`. S3 em diante precisa da tarefa 7 daquela EPIC publicada, porque depende do índice `analyteCode`/`collectedAt` existir de verdade.

**Lacuna conhecida e assumida.** O eixo X é por índice e não proporcional à data, mitigado com rótulo em todos os pontos. A razão está na spec (§6) e no `plan.md` (§4), e a correção, se um dia for necessária, está escrita nos dois.
