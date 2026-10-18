/**
 * Resumo do arquivo:
 * Por quanto tempo a lista de unidades de saude de um municipio vale no cache
 * (`VaccinationSiteCache`). UBS mudam pouco -- daí 7 dias, mais que as 12 h do
 * cache de campanhas.
 *
 * Mora num arquivo proprio porque DUAS pontas dependem do mesmo numero: esta
 * Lambda grava `expiresAt = agora + validade`, e o chat (E8, `consultar_postos`)
 * calcula a data de gravacao como `expiresAt - validade`. Com duas copias, a
 * data mostrada a pessoa divergiria em silencio.
 */
export const VALIDADE_DO_CACHE_DE_POSTOS_S = 7 * 24 * 60 * 60;
