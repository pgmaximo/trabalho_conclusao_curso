/**
 * Resumo do arquivo:
 * Numero e data do banco -> texto em pt-BR, para o texto de modelo fixo do
 * modo degradado.
 *
 * ESTE ARQUIVO NAO IMPORTA NADA, e isso e estrutural: ele e usado pelo
 * montador do modo degradado E pelo renderizador de uma tool, e as tools sao
 * importadas pelo montador. Deixar os formatadores no montador fechava um
 * ciclo de importacao -- o registro de tools chegava a ser lido antes de
 * existir, e `CHAT_TOOLS` vinha com buracos.
 */

/** Acima disto, casas decimais viram ruido de leitura, nao informacao. */
const CASAS_MAXIMAS = 8;

/**
 * Numero do banco -> texto em pt-BR.
 *
 * A regra que importa: arredondamento NUNCA pode transformar uma medida em
 * zero. Um TSH de 0,004 exibido como "0" e um numero errado -- e num texto que
 * a pessoa pode levar a uma consulta.
 *
 * Duplica `src/utils/decimalDisplay.ts` de proposito: a Lambda nao importa de
 * `src/`, e um teste em cada lado e o que impede as duas de divergirem em
 * silencio. `toLocaleString` fica fora nos dois, por motivos diferentes -- la,
 * o suporte a locale do Hermes varia por plataforma; aqui, `maximumFractionDigits`
 * e exatamente o que arredondaria 0,004 para zero.
 */
export function formatarDecimal(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  if (valor === 0) return '0';

  const abs = Math.abs(valor);
  const casas =
    abs >= 10 ? 1 : abs >= 1 ? 2 : Math.min(CASAS_MAXIMAS, Math.ceil(-Math.log10(abs)) + 2);

  const texto = valor.toFixed(casas);
  // Corta zeros a direita SO depois da virgula -- cortar sem essa condicao
  // transformaria 100 em 1.
  const limpo = texto.includes('.') ? texto.replace(/0+$/, '').replace(/\.$/, '') : texto;
  return limpo.replace('.', ',');
}

/**
 * O fuso do aplicativo (E1, D1.2 = A), num lugar so: o dia das campanhas, o
 * corte das consultas e o bloco de data do turno precisam do MESMO fuso, ou o
 * modelo receberia um "hoje" que discorda das futuras e passadas da
 * ferramenta. A funcao roda em UTC, e entre 21h e meia-noite de Brasilia o UTC
 * ja e o dia seguinte. Se vier o fuso do aparelho (D1.2 = B), e aqui que entra.
 *
 * `en-US` com `weekday: 'short'` da o dia como codigo estavel ("Sun"...);
 * pedir `pt-BR` faria o texto depender do ICU do runtime da Lambda.
 */
export const FUSO_DO_APP = 'America/Sao_Paulo';

/**
 * As UFs com fuso proprio (E3, D3.5). So `consultar_doses_tomadas` as usa: ali,
 * o erro de fuso vira "sem marcação" para um horario que, para a pessoa, ainda
 * nao chegou. O resto do chat segue a D1.2. O oeste do Amazonas (UTC-5) fica
 * com o fuso de Manaus: a UF nao separa.
 */
const FUSO_DA_UF: Record<string, string> = {
  AC: 'America/Rio_Branco',
  AM: 'America/Manaus',
  RR: 'America/Boa_Vista',
  RO: 'America/Porto_Velho',
  MT: 'America/Cuiaba',
  MS: 'America/Campo_Grande',
};

/** O fuso da UF, ou o do aplicativo quando ela nao tem fuso proprio ou falta. */
export function fusoDaUf(uf: string | null | undefined): string {
  return uf && Object.hasOwn(FUSO_DA_UF, uf) ? FUSO_DA_UF[uf] : FUSO_DO_APP;
}

/** Um formatador por fuso, montado uma vez: montar `Intl.DateTimeFormat` custa,
 *  e a verificacao de data roda em todo turno. No maximo sete entradas. */
const FORMATADORES = new Map<string, Intl.DateTimeFormat>();

function formatadorDe(fuso: string): Intl.DateTimeFormat {
  let f = FORMATADORES.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    FORMATADORES.set(fuso, f);
  }
  return f;
}

/**
 * O instante quebrado em partes, sempre com dois digitos, num fuso (o do app,
 * se nenhum vier). Pelas partes, e nao pelo `format`, porque o separador entre
 * data e hora varia entre versoes do ICU. `hourCycle: 'h23'` garante
 * meia-noite como "00", e nunca "24". `diaDaSemana` vai de "Sun" a "Sat".
 */
export function partesNoFuso(instante: Date, fuso: string = FUSO_DO_APP) {
  const p = Object.fromEntries(formatadorDe(fuso).formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    diaDaSemana: p.weekday,
    ano: p.year,
    mes: p.month,
    dia: p.day,
    hora: p.hour,
    minuto: p.minute,
  };
}

/** As partes no fuso do aplicativo (E1, D1.2). */
export function partesEmSaoPaulo(instante: Date) {
  return partesNoFuso(instante, FUSO_DO_APP);
}

/**
 * Minuscula, sem acento, e pontuacao virando espaco: a forma de comparar texto
 * que a pessoa digitou com o que esta no banco. Mora aqui (este arquivo nao
 * importa nada) para os analitos e as doses tomadas usarem a MESMA.
 *
 * Pontuacao vira espaco (Bloco 10): o sinonimo oficial do LDL e
 * "Colesterol.LDL", e quem pergunta escreve "colesterol LDL". Sem isto, o
 * termo casava com "colesterol" -- o total -- e a pessoa ouvia sobre o exame
 * errado.
 */
export function semAcento(texto_: string): string {
  return texto_
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * O instante, em "AAAA-MM-DDTHH:mm" no fuso de Sao Paulo (E1). E o formato em
 * que a Agenda grava `scheduledAt` -- hora LOCAL, sem fuso -- e por isso o
 * unico com que esse texto pode ser comparado.
 */
export function momentoEmSaoPaulo(instante: Date): string {
  const { ano, mes, dia, hora, minuto } = partesEmSaoPaulo(instante);
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

/**
 * O dia, em AAAA-MM-DD, no fuso de Sao Paulo (E8): no ultimo dia de uma
 * campanha, o dia do UTC trocaria "ativa" por "encerrada".
 */
export function dataEmSaoPaulo(instante: Date): string {
  const { ano, mes, dia } = partesEmSaoPaulo(instante);
  return `${ano}-${mes}-${dia}`;
}

/** AAAA-MM-DD -> DD/MM/AAAA. Data que nao esta nesse formato volta como veio:
 *  inventar uma data seria pior do que mostrar a que o banco tem. */
export function formatarData(iso: string | null): string {
  if (!iso) return 'sem data';
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}
