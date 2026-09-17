/**
 * Resumo do arquivo:
 * A parte PURA da leitura de documento: qual rota le este arquivo, e como a
 * resposta do Textract vira texto com numero de pagina.
 *
 * Separado de textractClient.ts de proposito, e a razao e o teste: nenhum
 * teste deste repositorio importa o SDK da AWS -- o pacote publica ESM em
 * `dist-es/*.native.js`, que o preset do jest-expo resolve e nao consegue
 * carregar. `import type` e apagado na compilacao e por isso e seguro aqui;
 * `import` de valor nao seria. Mesma separacao que analyze-health-import
 * pratica entre insightSchema.ts (testado) e bedrockClient.ts (nao testado).
 */
import type { Block } from '@aws-sdk/client-textract';

export type ExtractedText = { pages: { page: number; text: string }[]; fullText: string };

/** Qual rota le este arquivo. A escolha e por tipo de conteudo, nunca por
 *  extensao do nome: o nome vem do usuario e pode mentir. */
export type ReadingPath = 'modelo-direto' | 'textract-sincrono';

/**
 * A D19 mediu que o modelo le PDF nativo com qualidade -- 41 analitos de um
 * laudo real, com virgula decimal intacta. O Textract deixa de ser caminho
 * critico e fica para o que o bloco de documento do Converse nao aceita.
 */
export function chooseReadingPath(contentType: string): ReadingPath {
  // "application/pdf; charset=binary" tambem e PDF -- o parametro depois do
  // ponto e virgula nao muda o tipo.
  const tipo = (contentType ?? '').split(';')[0]?.trim().toLowerCase();
  if (tipo === 'application/pdf') return 'modelo-direto';
  // Tipo desconhecido vai para o Textract de proposito: uma recusa explicita
  // do servico vira erro de extracao, enquanto mandar bytes de tipo
  // desconhecido ao modelo viraria uma leitura plausivel de um arquivo errado.
  return 'textract-sincrono';
}

export function blocksToExtractedText(blocks: Block[]): ExtractedText {
  const porPagina = new Map<number, string[]>();
  for (const bloco of blocks) {
    if (bloco.BlockType !== 'LINE' || !bloco.Text) continue;
    // A resposta sincrona omite Page para documento de pagina unica. Sem esta
    // regra, sourcePage sairia vazio em toda foto de laudo e "de onde saiu
    // esse numero" ficaria sem resposta.
    const pagina = bloco.Page ?? 1;
    const lista = porPagina.get(pagina) ?? [];
    lista.push(bloco.Text);
    porPagina.set(pagina, lista);
  }
  const pages = [...porPagina.entries()]
    .sort(([a], [b]) => a - b)
    .map(([page, linhas]) => ({ page, text: linhas.join('\n') }));
  return { pages, fullText: pages.map((p) => `[pagina ${p.page}]\n${p.text}`).join('\n\n') };
}
