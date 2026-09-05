/**
 * Resumo do arquivo:
 * Cliente HTTP para o cadastro de estabelecimentos do CNES
 * (apidadosabertos.saude.gov.br — Ministério da Saúde, sem autenticação).
 * Diferente do endpoint de doses do PNI (ver pniClient.ts na feature de
 * campanhas), os filtros deste endpoint FUNCIONAM de fato — verificado ao
 * vivo: `codigo_municipio` + `codigo_tipo_unidade` + `status` retornam
 * resultados corretamente filtrados.
 */

const CNES_ESTABELECIMENTOS_URL = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos';

// Codigo do tipo de unidade "CENTRO DE SAUDE/UNIDADE BASICA" no CNES —
// confirmado via GET /cnes/tipounidades durante a pesquisa desta feature.
const TIPO_UNIDADE_UBS = '02';

export type CnesEstabelecimentoRaw = {
  codigo_cnes: number;
  nome_fantasia?: string | null;
  nome_razao_social?: string | null;
  bairro_estabelecimento?: string | null;
  endereco_estabelecimento?: string | null;
  numero_estabelecimento?: string | null;
  numero_telefone_estabelecimento?: string | null;
  latitude_estabelecimento_decimo_grau?: number | null;
  longitude_estabelecimento_decimo_grau?: number | null;
};

export async function fetchUbsPorMunicipio(codigoMunicipio: string): Promise<CnesEstabelecimentoRaw[]> {
  const url = `${CNES_ESTABELECIMENTOS_URL}?codigo_municipio=${encodeURIComponent(codigoMunicipio)}&codigo_tipo_unidade=${TIPO_UNIDADE_UBS}&status=1&limit=1000`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao consultar estabelecimentos do CNES (status ${response.status}).`);
  }

  const body = (await response.json()) as { estabelecimentos?: CnesEstabelecimentoRaw[] };
  return body.estabelecimentos ?? [];
}
