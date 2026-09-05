/**
 * Resumo do arquivo:
 * De-para entre `codigo_vacina` (campo cru retornado por
 * apidadosabertos.saude.gov.br/vacinacao/doses-aplicadas-pni-*) e as vacinas do
 * nosso catálogo (src/data/calendarioNacionalVacinacao.ts).
 *
 * Por que este mapa é PARCIAL e deliberadamente conservador: a tabela de
 * códigos de imunobiológico usada pela RNDS/PNI atualmente (numérica, ex.
 * "104", "33") não é publicada em nenhum endpoint aberto verificado durante a
 * pesquisa desta feature — nem apidadosabertos.saude.gov.br, nem
 * rnds-fhir.saude.gov.br (que só expõe CodeSystems de laboratório/exame, não
 * de imunobiológico), nem o Simplifier.net do RNDS. O único sinal disponível
 * publicamente por registro é `descricao_vacina_fabricante` (o fabricante, não
 * a vacina) — insuficiente para identificar a vacina com confiança, já que um
 * mesmo fabricante produz várias vacinas do calendário (ex. Fundação Butantan
 * produz tanto Influenza quanto Hepatite B e Meningocócica C).
 *
 * Decisão (regra 2 da constituição — nunca apresentar dado inventado como
 * real): em vez de adivinhar o nome da vacina a partir do fabricante, este
 * mapa fica vazio até uma fonte oficial e citável do de-para ser localizada.
 * `campaignAggregator.ts` NÃO quebra por causa disso — ele agrega por
 * contagem total de doses no período/UF, sem depender de identificar a vacina
 * por nome (ver Fase 2 do plano). Quando/se uma fonte oficial for encontrada
 * (ex. publicação futura de um CodeSystem BRImunobiologicoPNI no
 * rnds-fhir.saude.gov.br, ou um dicionário de dados do SI-PNI atualizado),
 * preencha este mapa e cite a fonte no comentário de cada entrada.
 */

import type { VacinaCatalogo } from './calendarioNacionalVacinacao';

/** codigo_vacina do PNI -> id de src/data/calendarioNacionalVacinacao.ts */
export const PNI_CODIGO_VACINA_PARA_CATALOGO: Record<string, VacinaCatalogo['id']> = {
  // Vazio intencionalmente — ver comentário de cabeçalho. Não adivinhar.
};

/**
 * Resolve um `codigo_vacina` do PNI para o id do catálogo, ou `null` quando
 * não há de-para confiável — nesse caso o chamador deve agregar o registro
 * sob "outras vacinas" (id 'outras'), nunca inventar um nome.
 */
export function resolveCatalogoIdFromPniCode(codigoVacina: string): VacinaCatalogo['id'] | null {
  return PNI_CODIGO_VACINA_PARA_CATALOGO[codigoVacina] ?? null;
}
