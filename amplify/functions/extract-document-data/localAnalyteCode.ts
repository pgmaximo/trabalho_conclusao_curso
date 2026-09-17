/**
 * Resumo do arquivo:
 * Codigo local para analito que nao esta no catalogo de 79 codigos LOINC.
 * Existe por causa da D32: o laudo real trouxe VPM, SHBG, Testosterona
 * Biodisponivel e Zinco, e a decisao anterior -- descartar essas linhas --
 * resolvia uma colisao de chave jogando dado do usuario fora.
 *
 * O prefixo X NAO e enfeite: a clausula 3 da licenca do LOINC exige que
 * registro acrescentado por nos o carregue, para nunca ser confundido com
 * codigo oficial. Ele tambem serve a tela, que precisa distinguir o que e
 * comparavel entre laboratorios do que e apenas registrado.
 *
 * O que este codigo NAO da: conversao de unidade. Sem catalogo nao ha unidade
 * canonica nem massa molar, entao o valor fica na unidade do papel. A EPIC de
 * serie trata unidade divergente excluindo o ponto com motivo registrado.
 */

/** Marca de registro acrescentado por nos (clausula 3 da licenca do LOINC). */
const PREFIXO_LOCAL = 'X-';

/**
 * Deriva um codigo estavel do rotulo. A estabilidade e a propriedade inteira:
 * se a coleta do mes que vem gerar um codigo diferente para a mesma
 * substancia, a serie nunca se forma e a cobertura de 100% vira ilusao.
 *
 * Devolve `null` quando nao sobra nada do rotulo. Um "X-" pelado seria a
 * colisao da D32 de volta: varias linhas distintas com o mesmo codigo, uma
 * sobrescrevendo as outras sem levantar erro.
 */
export function localAnalyteCode(label: string | null | undefined): string | null {
  if (!label) return null;

  const raiz = label
    .normalize('NFD')
    // Tira o acento SEPARADO pelo NFD. Comparar texto em portugues sem isto e
    // o defeito que ja apareceu neste projeto: "Biodisponível" e
    // "Biodisponivel" seriam dois analitos.
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    // Tudo que nao e letra sem acento ou digito vira separador: espaco,
    // hifen, parentese, barra e ponto. E o que faz "25-OH-Vitamina D" e
    // "25 OH vitamina d" caírem no mesmo codigo.
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return raiz === '' ? null : `${PREFIXO_LOCAL}${raiz}`;
}

/** Um codigo nosso, nao do LOINC. A tela usa isto para nao prometer sobre a
 *  linha a mesma comparabilidade que promete sobre um codigo do catalogo. */
export function isLocalAnalyteCode(code: string): boolean {
  return code.startsWith(PREFIXO_LOCAL);
}
