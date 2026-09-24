/**
 * Resumo do arquivo:
 * Qual chave do S3 guarda o arquivo deste documento.
 *
 * Parte PURA, separada do handler para poder ser testada: o `handler.ts` monta
 * clientes da AWS no topo do modulo, e nenhum teste deste repositorio importa
 * o SDK. Mesma separacao que `formatoDoArquivo.ts` pratica.
 *
 * A REGRA DESTE ARQUIVO, e ela nasceu de um defeito real (2026-09-18): a chave
 * e LIDA do que o upload gravou, nunca REMONTADA. A versao anterior fazia
 *
 *     const identityId = owner.split('::')[0];
 *
 * e a variavel se chamava `identityId` sem guardar um. O `owner` do Amplify
 * Data e `<sub do pool de USUARIOS>::<username>`; a pasta do S3 e nomeada pelo
 * `identityId` do pool de IDENTIDADES -- outro servico, outro identificador,
 * outra forma (o dele comeca com a regiao). Os dois sao UUID da mesma pessoa, e
 * e por isso que a linha passou por revisao: ela LE como se estivesse certa.
 *
 * O resultado era `NoSuchKey` em todo documento enviado pelo aplicativo, e a
 * tela dizendo "nao conseguimos ler o conteudo" sobre um arquivo que nunca
 * chegou a ser aberto. Nao apareceu antes porque a medicao de custo da Tarefa 1
 * invocou a funcao com a chave na mao, sem passar pela porta do aplicativo.
 *
 * Por que devolver NULO em vez de tentar: a Lambda nao tem como descobrir o
 * identityId a partir do `sub` -- nenhuma API do Cognito faz esse caminho sem o
 * token de quem entrou. Entao ou a chave veio gravada, ou nao da para saber; e
 * "nao da para saber" precisa virar uma falha com motivo, e nao um chute que
 * erra a pasta em silencio.
 */

/** A unica pasta que esta funcao pode abrir. */
const PREFIXO = 'medical-documents/';

export type LinhaComArquivo = {
  /**
   * `<sub do pool de usuarios>::<username>`, como o Amplify Data grava.
   * Continua aqui de proposito, e NAO e usado para montar chave: e o campo que
   * induziu o defeito, e o tipo registra que ele existe e nao serve para isso.
   */
  owner: string;
  s3FileName: string;
  /** A chave que o upload de fato gravou. Ausente nas linhas antigas. */
  s3Key?: string | null;
};

export function chaveDoDocumento(doc: LinhaComArquivo): string | null {
  const chave = (doc.s3Key ?? '').trim();
  if (chave === '') return null;

  // A chave vem do banco, e quem escreve o banco e o cliente. Conferencia de
  // FORMA, no mesmo espirito do `chaveDeAnexoValida` do chat: esta funcao le
  // documento, e nada mais. O fechamento de verdade e a politica do bucket.
  if (!chave.startsWith(PREFIXO)) return null;
  if (chave.includes('..')) return null;

  return chave;
}
