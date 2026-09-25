/**
 * Resumo do arquivo:
 * Leitura de LabResult para a serie. NAO grava nada e NAO converte nada.
 *
 * A consulta usa o indice analyteCode/collectedAt criado na EPIC de extracao
 * -- nunca list() com filtro, que seria varredura da tabela com descarte do
 * lado do servidor. O indice existe no schema exatamente porque esta consulta
 * era conhecida de antemao.
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

/**
 * O tipo da resposta precisa ser NOMEADO. Sem isso o TypeScript entra em
 * inferencia circular (TS7022): o tipo de `resposta` sai da chamada, a chamada
 * recebe `nextToken`, e `nextToken` e preenchido a partir de `resposta`. O
 * codigo do plano tem o mesmo defeito e nao compila.
 */
type RespostaDoIndice = Awaited<
  ReturnType<typeof client.models.LabResult.listLabResultByAnalyteCodeAndCollectedAt>
>;
type RespostaDaLista = Awaited<ReturnType<typeof client.models.LabResult.list>>;

export type AnalyteOption = {
  analyteCode: string;
  projectLabel: string;
  /** Coletas que PODEM ser comparadas. E o que a pessoa le como "quanto
   *  historico eu tenho"; contar o que nao entra no grafico prometeria uma
   *  comparacao que a tela nao vai mostrar. */
  collectionCount: number;
  /** Leituras esperando conferencia. Elas nao somem da lista: sem isto a
   *  pessoa nao teria por onde descobrir que existem. */
  pendingCount: number;
};

function lancarSeErro(errors?: { message: string }[] | null): void {
  if (errors?.length) throw new Error(errors.map((e) => e.message).filter(Boolean).join('; '));
}

export async function listLabResultsByAnalyte(analyteCode: string): Promise<LabResultView[]> {
  const linhas: LabResultView[] = [];
  let nextToken: string | null | undefined = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const resposta: RespostaDoIndice =
      await client.models.LabResult.listLabResultByAnalyteCodeAndCollectedAt({
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
    // `tokenAtual` ANOTADO quebra a inferencia circular: sem ele o TypeScript
    // tenta deduzir o tipo da resposta a partir do argumento, o argumento a
    // partir do `nextToken` estreitado pelo fluxo, e o estreitamento vem da
    // atribuicao que so acontece depois da resposta (TS7022).
    // Sem `selectionSet`, como todo outro servico deste repositorio: com ele o
    // tipo da resposta deixa de bater com o tipo geral de list(), e nomear o
    // tipo estreitado custaria mais complexidade do que os campos economizados
    // -- o volume aqui e de dezenas a poucas centenas de linhas por pessoa.
    const tokenAtual: string | undefined = nextToken ?? undefined;
    const resposta: RespostaDaLista = await client.models.LabResult.list(
      tokenAtual ? { nextToken: tokenAtual } : {},
    );
    lancarSeErro(resposta.errors);

    for (const linha of resposta.data ?? []) {
      const pendente = linha.reviewStatus === 'PENDENTE_DE_REVISAO';
      const atual = porCodigo.get(linha.analyteCode);

      if (atual) {
        if (pendente) atual.pendingCount += 1;
        else atual.collectionCount += 1;
      } else {
        porCodigo.set(linha.analyteCode, {
          analyteCode: linha.analyteCode,
          projectLabel: linha.projectLabel ?? linha.analyteCode,
          collectionCount: pendente ? 0 : 1,
          pendingCount: pendente ? 1 : 0,
        });
      }
    }

    nextToken = resposta.nextToken;
    if (!nextToken) break;
  }

  // Mais coletas primeiro: o que tem mais historico e provavelmente o que a
  // pessoa veio ver.
  return [...porCodigo.values()].sort(
    (a, b) =>
      b.collectionCount - a.collectionCount ||
      a.projectLabel.localeCompare(b.projectLabel, 'pt-BR'),
  );
}
