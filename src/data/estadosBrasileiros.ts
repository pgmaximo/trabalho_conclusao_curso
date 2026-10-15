/**
 * Resumo do arquivo:
 * Nome completo -> sigla de UF, usado para normalizar o resultado de
 * `Location.reverseGeocodeAsync` (que devolve o nome do estado, ex. "São
 * Paulo", não a sigla) antes de repassá-lo às APIs do Ministério da Saúde,
 * que esperam a sigla de 2 letras (ex. "SP"). Conteúdo estático — não muda.
 */
export const NOME_ESTADO_PARA_SIGLA: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (marcas diacríticas combinantes pós-NFD)
    .toLowerCase()
    .trim();
}

/** Converte o nome de um estado (com ou sem acento) para sua sigla, ou null se não reconhecido. */
export function resolveUfSigla(nomeEstado: string | null | undefined): string | null {
  if (!nomeEstado) return null;

  // Já é uma sigla de 2 letras (alguns geocoders retornam a sigla direto).
  if (/^[A-Za-z]{2}$/.test(nomeEstado.trim())) {
    return nomeEstado.trim().toUpperCase();
  }

  return NOME_ESTADO_PARA_SIGLA[normalize(nomeEstado)] ?? null;
}
