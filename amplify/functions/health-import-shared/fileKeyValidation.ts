// Modulo puro compartilhado por start-health-analysis e analyze-health-import
// -- unica excecao no repo a convencao de "cada pasta de funcao e
// autocontida" (get-vaccination-campaigns e get-vaccination-sites, por
// exemplo, duplicam logica parecida em vez de compartilhar). Compartilhar
// aqui evita que as duas Lambdas divirjam sobre o que conta como uma chave
// S3 valida para uma importacao -- ver o comentario de seguranca em
// start-health-analysis/handler.ts sobre por que o segmento de identityId
// nao e comparado contra um valor esperado.

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valida que `key` esta no formato health-imports/<qualquer>/<importId>/<arquivo>
 * -- nunca aponta para medical-documents/, avatars/, ou a pasta de OUTRA
 * importacao (mesmo que do mesmo dono).
 */
export function isFileKeyValid(key: string, importId: string): boolean {
  if (!importId) return false;
  const pattern = new RegExp(`^health-imports/[^/]+/${escapeRegExp(importId)}/[^/]+$`);
  return pattern.test(key);
}
