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
  // documento, e nada mais.
  //
  // FORMA NAO E POSSE. Esta linha dizia que "o fechamento de verdade e a
  // politica do bucket", e estava errada (achado de 2026-09-24, D46): a
  // politica por dono vale para a credencial DA PESSOA, e esta funcao le com o
  // proprio papel, que alcanca `medical-documents/*` inteiro. A chave do laudo
  // de outra pessoa tem a forma certa. Quem fecha a posse e
  // `lerArquivoDoDono`, que confere o metadado gravado no envio.
  if (!chave.startsWith(PREFIXO)) return null;
  if (chave.includes('..')) return null;

  return chave;
}

/**
 * O teto de folhas de um documento (Bloco 11, Decisao O1). O Converse aceita
 * 20 imagens por pedido; 10 folhas de cerca de 1 MB (a foto encolhida no
 * aparelho) ficam longe desse teto e do de tamanho.
 */
export const MAXIMO_DE_FOLHAS = 10;

/** A pasta de uma chave: tudo ate a ultima barra. */
const pastaDe = (chave: string) => chave.slice(0, chave.lastIndexOf('/'));

/**
 * Todas as folhas do documento, na ordem: a folha 1 (`s3Key`) e as extras.
 * Nulo quando qualquer uma nao passa -- um documento com uma folha suspeita nao
 * e lido pela metade.
 *
 * Cada folha extra passa a MESMA conferencia de forma da primeira, e tem de
 * estar na MESMA pasta dela. A chave vem do banco, e o banco e escrito pelo
 * cliente: uma folha apontando para outra pasta leria arquivo de outro lugar.
 */
export function chavesDasFolhas(
  doc: LinhaComArquivo & { extraPageKeys?: (string | null)[] | null },
): string[] | null {
  const primeira = chaveDoDocumento(doc);
  if (!primeira) return null;

  const extras = (doc.extraPageKeys ?? [])
    .map((chave) => (chave ?? '').trim())
    .filter((chave) => chave !== '');
  if (extras.length + 1 > MAXIMO_DE_FOLHAS) return null;

  const pasta = pastaDe(primeira);
  for (const extra of extras) {
    const valida = chaveDoDocumento({ ...doc, s3Key: extra });
    if (!valida || pastaDe(valida) !== pasta) return null;
  }
  return [primeira, ...extras];
}

/**
 * O `sub` do pool de USUARIOS, que e a metade do `owner` antes do `::`. E o dono
 * que a conferencia de posse compara com o metadado do objeto (D46).
 *
 * E a MESMA operacao da linha do defeito narrado no topo deste arquivo -- e ela
 * estava certa; errado era o nome da variavel, que prometia um identityId. Aqui
 * o nome diz o que ela guarda, e o teste trava que nunca e um identityId.
 *
 * `owner` sem `::`, ou com a metade vazia, devolve nulo: a conferencia recusa, em
 * vez de comparar contra um valor que nao e o de ninguem.
 */
export function subDoOwner(owner: string): string | null {
  const separador = owner.indexOf('::');
  if (separador <= 0) return null;
  return owner.slice(0, separador);
}
