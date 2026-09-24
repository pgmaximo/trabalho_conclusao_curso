/**
 * Resumo do arquivo:
 * Por que a leitura de um documento falhou, num conjunto FECHADO de motivos, e
 * a frase que a pessoa le para cada um.
 *
 * Existe por um defeito de duas metades (G4 do Bloco 10): a tela de falha nunca
 * lia `extractionError`, e o handler gravava `erro.message` cru nesse campo --
 * texto do SDK da AWS, ou caminho de campo do zod. Consertar so a tela
 * mostraria "ValidationException" a quem fotografou um laudo.
 *
 * Com a lista fechada, o campo e seguro de mostrar POR CONSTRUCAO: o handler so
 * grava copy daqui, e a tela so mostra o que e copy daqui. O detalhe tecnico
 * continua existindo -- no log, que e onde quem pode agir sobre ele o le.
 *
 * Modulo PURO.
 */

export const MOTIVOS_DE_FALHA = [
  'formato-nao-suportado',
  'grande-demais',
  'ilegivel',
  'bloqueado-pelo-filtro',
  'arquivo-sem-chave',
  'arquivo-sem-dono',
  'leitura-falhou',
] as const;

export type MotivoDeFalha = (typeof MOTIVOS_DE_FALHA)[number];

/**
 * Cada frase diz o que houve E o que fazer. "Nao conseguimos ler" sozinho deixa
 * a pessoa sem saber se tenta de novo, troca o arquivo ou desiste.
 */
export const COPY_DA_FALHA: Record<MotivoDeFalha, string> = {
  'formato-nao-suportado':
    'Este tipo de arquivo não pode ser lido. Envie o laudo em PDF ou uma foto (JPG ou PNG).',
  'grande-demais':
    'Este arquivo é grande demais para ser lido. Se for um PDF, tente enviar só as páginas dos resultados; se for uma foto, tire outra um pouco mais de longe.',
  ilegivel:
    'Não conseguimos ler o texto deste arquivo. Se ele for uma foto, uma imagem mais nítida, com boa luz e sem sombra, costuma resolver.',
  'bloqueado-pelo-filtro':
    'O conteúdo deste documento foi bloqueado pelo filtro de segurança e não foi lido. O arquivo continua guardado.',
  'arquivo-sem-chave':
    'Este documento foi guardado antes de o aplicativo registrar onde o arquivo ficou. Envie o arquivo de novo para que ele possa ser lido.',
  // D46: serve ao arquivo enviado antes de o metadado existir E ao arquivo de
  // outra pessoa. Quem ve esta frase e quase sempre o dono legitimo de um
  // arquivo antigo, e por isso ela nao acusa ninguem; o log distingue os dois.
  'arquivo-sem-dono':
    'Este arquivo foi enviado antes de o aplicativo registrar quem o enviou. Envie o arquivo de novo para que ele possa ser lido.',
  'leitura-falhou':
    'A leitura não terminou por um problema do nosso lado. O arquivo continua guardado — tente de novo em alguns minutos.',
};

export function copyDaFalha(motivo: MotivoDeFalha): string {
  return COPY_DA_FALHA[motivo];
}

const COPIES = new Set<string>(Object.values(COPY_DA_FALHA));

/** A tela pergunta isto antes de mostrar o campo. Documento que falhou antes do
 *  Bloco 10 pode ter texto tecnico gravado, e ele continua escondido. */
export function ehCopyDeFalha(texto: string | null | undefined): boolean {
  return !!texto && COPIES.has(texto);
}
