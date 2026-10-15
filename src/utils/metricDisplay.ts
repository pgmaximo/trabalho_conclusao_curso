/**
 * Resumo do arquivo:
 * Número de uma métrica do smartwatch -> texto na tela, em pt-BR.
 *
 * Como em decimalDisplay.ts, NÃO usa toLocaleString: o suporte a locale do
 * Hermes varia por plataforma e versão. A regra é explícita e testada.
 *
 * O painel mostrava toda média com uma casa decimal e ponto ("8200.0 passos",
 * "402.0 min"). Contagens, durações e pontuações não têm fração que interesse
 * a ninguém; medidas contínuas (peso, distância, temperatura) continuam com uma
 * casa, com vírgula.
 */

// Unidades de medidas contínuas, em que a casa decimal é informação.
const UNIDADES_COM_DECIMAL = new Set(['kg', 'km', '°C', 'rpm']);

function comSeparadorDeMilhar(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatarValorDeMetrica(valor: number | null | undefined, unidade: string): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';

  if (!UNIDADES_COM_DECIMAL.has(unidade)) {
    return `${comSeparadorDeMilhar(String(Math.round(valor)))} ${unidade}`;
  }

  const [inteiro, decimal] = valor.toFixed(1).split('.');
  return `${comSeparadorDeMilhar(inteiro)},${decimal} ${unidade}`;
}

/**
 * Identificador do modelo no Bedrock -> nome que uma pessoa lê.
 * "us.anthropic.claude-sonnet-4-6" -> "Claude Sonnet 4.6".
 * Devolve nulo para um identificador que não reconhece: a tela então diz só
 * que a análise foi gerada por IA, em vez de mostrar o identificador cru.
 */
export function nomeDoModelo(modelId: string | null | undefined): string | null {
  if (!modelId) return null;

  const semProvedor = modelId.split('.').pop() ?? '';
  const semVersao = semProvedor.replace(/-v\d+(:\d+)?$/, '').replace(/-\d{8}$/, '');
  const partes = semVersao.split('-').filter(Boolean);

  if (partes[0] !== 'claude' || partes.length < 2) return null;

  const palavras: string[] = [];
  let numeros: string[] = [];

  const fecharNumeros = () => {
    if (numeros.length > 0) {
      palavras.push(numeros.join('.'));
      numeros = [];
    }
  };

  for (const parte of partes) {
    if (/^\d+$/.test(parte)) {
      numeros.push(parte);
    } else {
      fecharNumeros();
      palavras.push(parte.charAt(0).toUpperCase() + parte.slice(1));
    }
  }
  fecharNumeros();

  return palavras.join(' ');
}
