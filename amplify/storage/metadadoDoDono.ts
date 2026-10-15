/**
 * Resumo do arquivo:
 * O contrato entre quem ENVIA um arquivo ao bucket (o aplicativo) e quem o LE
 * (as funcoes de extracao e de conversa): o metadado de objeto com o `sub` de
 * quem enviou. D46, spec em `specs/09-seguranca/posse-do-arquivo/`.
 *
 * POR QUE EXISTE (achado de 2026-09-24): as funcoes tem leitura no prefixo
 * INTEIRO do bucket, e a chave que elas leem e escolhida pelo cliente -- o
 * `s3Key` da linha, que o dono escreve, e o `attachmentKey` do corpo do chat. A
 * politica por dono do bucket vale para a credencial DA PESSOA, e nao para o
 * papel da funcao. Entao A apontava a chave para o laudo de B, e a funcao lia.
 *
 * A funcao nao consegue conferir a pasta: ela e nomeada pelo identityId do pool
 * de IDENTIDADES, e a funcao so conhece o `sub` do pool de USUARIOS (ver o
 * cabecalho de `extract-document-data/documentKey.ts`). O que falta, entao,
 * viaja com o arquivo.
 *
 * POR QUE O METADADO E CONFIAVEL: so o dono escreve na propria pasta
 * (`allow.entity('identity')` em `resource.ts`). O metadado do objeto na pasta
 * de B foi escrito por B. B pode gravar ali o `sub` de A -- mas isso e B
 * entregando o proprio arquivo, e nao A tomando o de B.
 *
 * Modulo PURO, sem SDK: o aplicativo importa a constante daqui. NAO confundir
 * com `resource.ts`, que importa `@aws-amplify/backend` e nao pode ir para o
 * bundle do aplicativo.
 */

/**
 * O nome da chave de metadado (vai no cabecalho como `x-amz-meta-<isto>`).
 * Minusculo de proposito: o S3 grava a chave em minusculas, e um nome com
 * maiuscula seria salvo de um jeito e procurado de outro.
 */
export const METADADO_DO_DONO = 'sub-de-quem-enviou';

export type ConferenciaDoDono = 'confere' | 'sem-metadado' | 'outro-dono' | 'sem-dono-esperado';

/**
 * O objeto concorda em ser lido para este dono? Comparacao EXATA: o `sub` e UUID
 * minusculo dos dois lados, e normalizar aqui esconderia um erro de quem
 * escreveu o metadado.
 */
export function conferirDono(
  metadados: Record<string, string> | undefined,
  subEsperado: string | null,
): ConferenciaDoDono {
  // Ninguem esperado nao pode significar "qualquer um serve".
  if (!subEsperado) return 'sem-dono-esperado';

  const gravado = metadados?.[METADADO_DO_DONO];
  // Objeto enviado antes desta EPIC. Falha FECHADO (D46): aceitar deixaria a
  // porta aberta justamente para os arquivos que ja existem.
  if (!gravado) return 'sem-metadado';

  return gravado === subEsperado ? 'confere' : 'outro-dono';
}
