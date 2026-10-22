/**
 * Resumo do arquivo:
 * A saida que `consultar_vacinas` entrega ao modelo (E5), montada a partir das
 * linhas do dono. PURO: recebe as linhas, nao as le. Mora separado da tool para
 * o reforco e o teto serem testados com data, como `medicamentosSaida.ts` (E2).
 *
 * Duas listas, e a separacao importa: dose aplicada tem data de aplicacao; dose
 * recomendada nao tem, e e so uma previsao que o proprio aplicativo registrou.
 * Misturar as duas faria o modelo dizer que a pessoa tomou o que ela nao tomou.
 *
 * O reforco previsto segue a D5.1 = A
 * (`specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E5-agenda-e-vacinas.md`):
 * so com o intervalo GRAVADO no registro. Pelo catalogo do calendario nacional,
 * o chat diria uma data que a carteira nao mostra, o que soaria como indicacao.
 *
 * Nenhum campo diz se a carteira esta completa, em dia ou atrasada: isso e
 * decisao da unidade de saude, nao do aplicativo.
 */
import { valoresDeRemedioNoTexto } from '../../ai-language-rules/languageRules';
import { numero } from './linhasDeResultado';
import { observacaoComTeto } from './observacao';
import { texto, type LinhaDoBanco } from './ownerScopedRead';

/**
 * Teto de cada lista. Uma dose com todos os campos custa perto de 85 tokens, e
 * passa de 170 com observacao cheia: o pior caso (60 doses, todas com
 * observacao de 300 caracteres) chega perto de 10 mil, e o comum (sem
 * observacao nem lote) fica perto de 2 mil. As aplicadas guardam as mais
 * recentes e as pendentes, as mais proximas. O que sai e CONTADO em `omitidas`.
 */
export const MAX_DOSES_POR_LISTA = 30;

export type DoseParaOModelo = {
  nome: string | null;
  numeroDaDose: number | null;
  aplicadaEm: string | null;
  local: string | null;
  previstaPara: string | null;
  lote: string | null;
  fabricante: string | null;
  observacoes: string | null;
  observacoesCortadas: boolean;
  intervaloDeReforcoAnos: number | null;
  fazParteDeCampanha: boolean;
  totalDeDosesDaSerie: number | null;
};

export type ReforcoPrevisto = {
  vacina: string | null;
  ultimaDoseEm: string;
  intervaloAnos: number;
  previstoPara: string;
};

export type SaidaDasVacinas = {
  disponivel: boolean;
  aplicadas: DoseParaOModelo[];
  recomendadasNaoAplicadas: DoseParaOModelo[];
  reforcosPrevistos: ReforcoPrevisto[];
  omitidas: number;
  explicacao?: string;
};

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `dataIso` + `anos`, em UTC, como `addYearsToDate` do app
 * (`src/services/vaccineScheduleService.ts`): 29/02 + 1 ano vira 01/03. Copia,
 * e nao import, porque `amplify/` nao importa de `src/`. So getters UTC: com
 * os locais, a Lambda (em UTC) e o teste (em Sao Paulo) dariam dias diferentes.
 * Devolve `null` para o que nao e uma data AAAA-MM-DD real (ex.: 30/02, ou o
 * texto com hora de registros antigos).
 */
export function somarAnos(dataIso: string, anos: number): string | null {
  const data = comoDataUtc(dataIso);
  if (!data) return null;
  data.setUTCFullYear(data.getUTCFullYear() + anos);
  return data.toISOString().slice(0, 10);
}

function comoDataUtc(dataIso: string): Date | null {
  const partes = DATA_ISO.exec(dataIso);
  if (!partes) return null;
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : null;
}

/** A mesma chave de `groupByVaccine` (`src/hooks/useVaccinationData.ts`): o
 *  chat e a carteira falam da mesma "vacina". */
function chaveDaVacina(linha: LinhaDoBanco): string {
  return texto(linha.catalogId) ?? `legado:${texto(linha.name) ?? ''}`;
}

function aplicada(linha: LinhaDoBanco): boolean {
  return texto(linha.appliedDate) !== null;
}

/** Mais recente primeiro; no empate de data, o maior numero de dose -- a saida
 *  nao pode depender da ordem em que o banco devolve as linhas. */
function maisRecente(a: LinhaDoBanco, b: LinhaDoBanco): number {
  const porData = (texto(b.appliedDate) ?? '').localeCompare(texto(a.appliedDate) ?? '');
  return porData !== 0 ? porData : (numero(b.doseNumber) ?? 0) - (numero(a.doseNumber) ?? 0);
}

function intervaloValido(valor: unknown): number | null {
  const anos = numero(valor);
  return anos !== null && Number.isInteger(anos) && anos > 0 ? anos : null;
}

function dataValida(linha: LinhaDoBanco): boolean {
  const data = texto(linha.appliedDate);
  return data !== null && comoDataUtc(data) !== null;
}

/**
 * Um reforco por vacina, da ULTIMA dose aplicada: calcular por dose daria tres
 * datas para a dT, duas delas erradas. Se a vacina tem dose pendente
 * registrada, ela ja e a proxima data, e um segundo calculo daria duas
 * respostas sobre a mesma vacina. Se alguma data aplicada esta fora do formato
 * (registro antigo), nao da para saber qual e a ultima: sem reforco.
 */
export function reforcosPrevistos(linhas: LinhaDoBanco[]): ReforcoPrevisto[] {
  const grupos = new Map<string, LinhaDoBanco[]>();
  for (const linha of linhas) {
    const chave = chaveDaVacina(linha);
    const doGrupo = grupos.get(chave);
    if (doGrupo) doGrupo.push(linha);
    else grupos.set(chave, [linha]);
  }

  const reforcos: ReforcoPrevisto[] = [];
  for (const doGrupo of grupos.values()) {
    if (doGrupo.some((l) => !aplicada(l))) continue;
    if (!doGrupo.every(dataValida)) continue;
    const ultima = doGrupo.reduce((a, b) => (maisRecente(a, b) <= 0 ? a : b));
    const intervaloAnos = intervaloValido(ultima.recommendedIntervalYears);
    const ultimaDoseEm = texto(ultima.appliedDate);
    if (intervaloAnos === null || ultimaDoseEm === null) continue;
    const previstoPara = somarAnos(ultimaDoseEm, intervaloAnos);
    if (previstoPara === null) continue;
    reforcos.push({ vacina: texto(ultima.name), ultimaDoseEm, intervaloAnos, previstoPara });
  }
  return reforcos.sort((a, b) => a.previstoPara.localeCompare(b.previstoPara));
}

function paraOModelo(d: LinhaDoBanco): DoseParaOModelo {
  return {
    nome: texto(d.name),
    numeroDaDose: numero(d.doseNumber),
    aplicadaEm: texto(d.appliedDate),
    local: texto(d.location),
    previstaPara: texto(d.dueDate),
    lote: texto(d.lot),
    fabricante: texto(d.manufacturer),
    ...observacaoComTeto(d.notes),
    intervaloDeReforcoAnos: numero(d.recommendedIntervalYears),
    // So o booleano conta: um "true" em texto e dado torto, nao campanha.
    fazParteDeCampanha: d.isCampaign === true,
    totalDeDosesDaSerie: numero(d.seriesTotal),
  };
}

/** Sem data prevista vai para o fim: a pessoa pergunta pelas mais proximas. */
function pelaPrevisao(a: DoseParaOModelo, b: DoseParaOModelo): number {
  if (a.previstaPara === null) return b.previstaPara === null ? 0 : 1;
  if (b.previstaPara === null) return -1;
  return a.previstaPara.localeCompare(b.previstaPara);
}

/** As doses aplicadas, da mais recente para a mais antiga, com o desempate
 *  pelo numero da dose. Exportada para o panorama do E10 dizer a mesma "ultima
 *  vacina" que a carteira e `consultar_vacinas`. */
export function dosesAplicadasPorRecencia(linhas: LinhaDoBanco[]): LinhaDoBanco[] {
  return linhas.filter(aplicada).sort(maisRecente);
}

/** A saida inteira. O reforco e calculado sobre TODAS as linhas, antes do teto:
 *  a ultima dose de uma vacina antiga pode ter ficado fora da lista. */
export function montarSaida(linhas: LinhaDoBanco[]): SaidaDasVacinas {
  // A mesma ordem do reforco (com o desempate por numero de dose): quem fica
  // dentro do teto nao pode mudar de uma pergunta para a outra.
  const aplicadas = dosesAplicadasPorRecencia(linhas)
    .slice(0, MAX_DOSES_POR_LISTA)
    .map(paraOModelo);
  const recomendadasNaoAplicadas = linhas
    .filter((l) => !aplicada(l))
    .map(paraOModelo)
    .sort(pelaPrevisao)
    .slice(0, MAX_DOSES_POR_LISTA);

  return {
    disponivel: linhas.length > 0,
    aplicadas,
    recomendadasNaoAplicadas,
    reforcosPrevistos: reforcosPrevistos(linhas),
    omitidas: linhas.length - aplicadas.length - recomendadasNaoAplicadas.length,
    ...(linhas.length === 0
      ? { explicacao: 'O usuário não registrou nenhuma dose de vacina no aplicativo.' }
      : {}),
  };
}

/**
 * As contagens da carteira que a verificacao deve ler como REGISTRO, e nao como
 * quantidade de remedio (A9 da conferencia no sandbox, a mesma D2.4 dos
 * remedios): o total da serie, o numero da dose aplicada e quantas faltam.
 * "A serie da Hepatite B esta registrada com 3 doses" era reprovada pela R3.
 */
export function valoresCadastradosDasVacinas(output: unknown): string[] {
  const saida = output as Partial<SaidaDasVacinas> | null;
  const aplicadas = Array.isArray(saida?.aplicadas) ? saida.aplicadas : [];
  return aplicadas.flatMap((d) => {
    const contagens = [d?.totalDeDosesDaSerie, d?.numeroDaDose];
    if (typeof d?.totalDeDosesDaSerie === 'number' && typeof d?.numeroDaDose === 'number') {
      contagens.push(d.totalDeDosesDaSerie - d.numeroDaDose);
    }
    return contagens
      .filter((n): n is number => typeof n === 'number' && n > 0)
      .flatMap((n) => valoresDeRemedioNoTexto(`${n} ${n === 1 ? 'dose' : 'doses'}`));
  });
}
