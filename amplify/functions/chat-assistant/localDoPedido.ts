/**
 * Resumo do arquivo:
 * Le o `local` do corpo do pedido (E8, D8.1 = A): a UF e o codigo IBGE do
 * municipio que o aplicativo ja guarda no aparelho para a tela de Vacinacao.
 *
 * O contrato e TOLERANTE de proposito. O campo e opcional e so serve de chave
 * de leitura de dado publico (o cache de postos); um valor que nao valida vira
 * ausente, e a pergunta segue. Recusar o turno com 400 faria uma pergunta sobre
 * exame falhar porque o aparelho guardou lixo.
 *
 * Os dois campos sao lidos POR NOME, como todo o corpo em `handler.ts`: um
 * espalhamento carregaria para dentro da funcao latitude, nome da cidade ou um
 * `owner` -- e a D8.1 manda so a cidade, nunca a coordenada.
 */
import type { LocalDoUsuario } from './types';

/**
 * As 27 siglas. Ficam aqui, e nao importadas de `src/data/estadosBrasileiros.ts`,
 * porque o backend nao importa de `src/`; e sao 27 valores que nao mudam.
 */
export const UFS: readonly string[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

/** O codigo que a API do Ministerio da Saude devolve tem 6 ou 7 digitos. */
const CODIGO_MUNICIPIO = /^\d{6,7}$/;

export function lerLocal(bruto: unknown): LocalDoUsuario | null {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return null;
  const objeto = bruto as Record<string, unknown>;

  const uf = typeof objeto.uf === 'string' && UFS.includes(objeto.uf) ? objeto.uf : null;
  const codigoMunicipio =
    typeof objeto.codigoMunicipio === 'string' && CODIGO_MUNICIPIO.test(objeto.codigoMunicipio)
      ? objeto.codigoMunicipio
      : null;

  return uf === null && codigoMunicipio === null ? null : { uf, codigoMunicipio };
}
