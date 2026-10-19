/**
 * Resumo do arquivo:
 * A saida que `consultar_doses_tomadas` entrega ao modelo (E3), montada a
 * partir das linhas do dono. PURO: recebe os remedios, as marcacoes e o
 * "agora", e nao le nada -- como `medicamentosSaida.ts`, para cada regra ser
 * testada com data e minuto fixos.
 *
 * O que ela calcula, e o modelo so descreve (regra 5 do prompt padrao): quais
 * horarios eram esperados em cada dia, qual a situacao de cada um, e as
 * contagens. As regras de horario, de atraso e do `takenToday` sao as MESMAS
 * funcoes da tela, no modulo compartilhado; aqui fica so a montagem.
 *
 * Decisoes (`specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E3-doses-tomadas.md`):
 * - D3.1: hoje, o horario conta como marcado tambem pelo `takenToday` do dia,
 *   como na tela; dias anteriores, so pelo historico (o campo antigo nao tem).
 * - D3.3: a saida fala em HORARIOS, nunca em "doses". "2 doses sem marcacao" e
 *   reprovado pela R3 como quantidade de remedio; "o horario das 8h de segunda"
 *   responde melhor, e passa.
 * - D3.5: "agora" e o relogio da UF da pessoa, que o aplicativo manda.
 * - Nada de juizo: nenhum campo diz se a pessoa esta "em dia", nem percentual.
 *   "Sem marcacao" nao e "nao tomou" -- ela pode ter tomado e nao marcado.
 */
import { normalizeDrugName } from '../../drug-interactions-shared/normalizeDrugName';
import {
  codigoDoDia,
  getMedicineDoseTimesForDate,
  horariosMarcadosNoCampoAntigo,
  passouDaTolerancia,
  somarDias,
  type RemedioComAgenda,
} from '../../medicine-schedule-shared/doseSchedule';
import { fusoDaUf, partesNoFuso, semAcento } from '../formatoPtBr';
import { DIAS, estaEmUso } from './medicamentosSaida';
import { texto, type LinhaDoBanco } from './ownerScopedRead';

export const DIAS_PADRAO = 7;
/** Trinta dias cobrem "este mes" e mantem a saida curta. */
export const DIAS_MAXIMO = 30;
/**
 * Cada remedio custa perto de 200 tokens no pior caso (14 horarios listados):
 * 15 ficam perto de 3 mil. O que passar e CONTADO em `omitidos` -- sem a
 * contagem, a resposta pareceria completa.
 */
export const MAX_REMEDIOS_NAS_DOSES = 15;
/** Duas semanas de um horario por dia. O resto vai CONTADO em `semMarcacaoOmitidos`. */
export const MAX_SEM_MARCACAO_POR_REMEDIO = 14;

/** O instante no relogio da pessoa: o dia e os minutos desde a meia-noite. */
export type Agora = { data: string; minutos: number };
export type Periodo = { de: string; ate: string; dias: number };
export type SituacaoDoHorario = 'marcado' | 'sem marcação' | 'pendente';
export type HorarioSemMarcacao = { data: string; diaDaSemana: string; horario: string };

export type DosesDoRemedio = {
  nome: string | null;
  termino: string | null;
  hoje: { horario: string; situacao: SituacaoDoHorario }[];
  contagem: { horariosEsperados: number; marcados: number; semMarcacao: number; pendentes: number };
  semMarcacao: HorarioSemMarcacao[];
  semMarcacaoOmitidos: number;
  marcacoesForaDoHorarioAtual: number;
};

export type SaidaDasDoses = {
  disponivel: boolean;
  periodo: Periodo;
  medicamentos: DosesDoRemedio[];
  omitidos: number;
  naoEncontrado?: true;
  nomesEmUso?: string[];
  /** Quantos nomes em uso passaram do teto de `nomesEmUso`: sem a contagem, a
   *  lista pareceria completa (revisao do E3). */
  nomesEmUsoOmitidos?: number;
  explicacao?: string;
};

export type EscolhaDeRemedios = {
  /** Em uso, do filtro, com o periodo de uso cruzando o pedido, ate o teto. */
  escolhidos: LinhaDoBanco[];
  omitidos: number;
  /** Ha algum remedio em uso? Separado de `nomesEmUso`, que e lista de exibicao. */
  haRemedioEmUso: boolean;
  nomesEmUso: string[];
  nomesEmUsoOmitidos: number;
  /** Houve filtro e nenhum remedio em uso casou com ele. */
  naoEncontrado: boolean;
};

const EXPLICACAO_SEM_REMEDIO = 'O usuário não tem remédio em uso cadastrado no aplicativo.';
const EXPLICACAO_NAO_ENCONTRADO = 'Nenhum remédio em uso tem esse nome.';
const EXPLICACAO_SEM_HORARIO = 'Nenhum remédio em uso tem horário previsto neste período.';
const EXPLICACAO_SEM_MARCACAO = 'Não há nenhum horário marcado como tomado no aplicativo neste período.';
const EXPLICACAO_HORARIOS_MUDARAM = 'Os dias anteriores são contados com os horários cadastrados hoje.';

/** O instante no relogio da pessoa: o fuso da UF dela (D3.5), ou Brasilia. */
export function agoraNoFuso(instante: Date, uf?: string | null): Agora {
  const { ano, mes, dia, hora, minuto } = partesNoFuso(instante, fusoDaUf(uf));
  return { data: `${ano}-${mes}-${dia}`, minutos: Number(hora) * 60 + Number(minuto) };
}

export function periodoDe(agora: Agora, dias: number): Periodo {
  return { de: somarDias(agora.data, -(dias - 1)), ate: agora.data, dias };
}

/** Os dias do periodo, com o nome do dia, montados UMA vez por saida: sao os
 *  mesmos para todos os remedios. */
function diasDoPeriodo(periodo: Periodo): { data: string; diaDaSemana: string }[] {
  return Array.from({ length: periodo.dias }, (_, i) => {
    const data = somarDias(periodo.de, i);
    return { data, diaDaSemana: DIAS.get(codigoDoDia(data)) ?? '' };
  });
}

/** A linha crua do banco no formato que a regra de horarios le. */
function agenda(r: LinhaDoBanco): RemedioComAgenda {
  return {
    active: estaEmUso(r),
    startDate: texto(r.startDate) ?? '',
    endDate: texto(r.endDate),
    frequencyType: texto(r.frequencyType),
    weekDays: Array.isArray(r.weekDays) ? r.weekDays.map(String) : null,
    intervalHours: typeof r.intervalHours === 'number' ? r.intervalHours : null,
    times: Array.isArray(r.times) ? r.times.map(String) : [],
  };
}

/**
 * O nome casa com o filtro? Por dois caminhos. O normalizador do E9 tira a dose
 * ("Losartana 50mg" vira "losartana") e acha por parte do nome. Mas ele tambem
 * tira digitos: "b12" viraria "b" e acharia o Ibuprofeno, e "50mg" viraria
 * vazio e acharia tudo. Por isso ele so vale com duas letras ou mais; abaixo
 * disso, vale o comeco de palavra, com digitos ("b12", "50mg").
 */
function casaComOFiltro(nome: string, filtro: string): boolean {
  const normalizado = normalizeDrugName(filtro);
  if (normalizado.length >= 2 && normalizeDrugName(nome).includes(normalizado)) return true;
  return ` ${semAcento(nome)}`.includes(` ${semAcento(filtro)}`);
}

/**
 * Quais remedios entram, ANTES de ler o historico: so os em uso (a regra de
 * `medicamentosSaida.ts`), do filtro, e cujo periodo de uso cruza o pedido. Ler
 * o log de um remedio que so comeca depois seria uma consulta sem resposta.
 */
export function escolherRemedios(linhas: LinhaDoBanco[], periodo: Periodo, filtro?: string): EscolhaDeRemedios {
  const emUso = linhas.filter(estaEmUso);
  const doFiltro = filtro ? emUso.filter((r) => casaComOFiltro(texto(r.name) ?? '', filtro)) : emUso;
  const noPeriodo = doFiltro
    .filter((r) => {
      const inicio = texto(r.startDate);
      const termino = texto(r.endDate);
      return inicio !== null && inicio <= periodo.ate && (termino === null || termino >= periodo.de);
    })
    // Por nome, para o teto cortar sempre os mesmos.
    .sort((a, b) => (texto(a.name) ?? '').localeCompare(texto(b.name) ?? '', 'pt-BR'));

  const nomes = emUso.map((r) => texto(r.name)).filter((n): n is string => n !== null);
  return {
    escolhidos: noPeriodo.slice(0, MAX_REMEDIOS_NAS_DOSES),
    omitidos: Math.max(0, noPeriodo.length - MAX_REMEDIOS_NAS_DOSES),
    haRemedioEmUso: emUso.length > 0,
    nomesEmUso: nomes.slice(0, MAX_REMEDIOS_NAS_DOSES),
    nomesEmUsoOmitidos: Math.max(0, nomes.length - MAX_REMEDIOS_NAS_DOSES),
    naoEncontrado: Boolean(filtro) && doFiltro.length === 0,
  };
}

/**
 * A situacao de um horario. Num dia anterior, ou foi marcado, ou nao. Hoje, so
 * vira "sem marcação" depois da tolerancia da tela (uma hora): antes disso e
 * "pendente" -- dizer "sem marcação" das 8h as 8h05 faria a pessoa achar que
 * esqueceu.
 */
function situacao(horario: string, marcado: boolean, ehHoje: boolean, agora: Agora): SituacaoDoHorario {
  if (marcado) return 'marcado';
  if (!ehHoje || passouDaTolerancia(horario, agora.minutos)) return 'sem marcação';
  return 'pendente';
}

function dosesDoRemedio(
  r: LinhaDoBanco,
  marcacoes: LinhaDoBanco[],
  agora: Agora,
  dias: { data: string; diaDaSemana: string }[],
  periodo: Periodo,
): DosesDoRemedio {
  const regra = agenda(r);
  const marcadas = new Set(marcacoes.map((m) => `${texto(m.scheduledDate)} ${texto(m.scheduledTime)}`));
  const doCampoAntigo = horariosMarcadosNoCampoAntigo(r.takenToday, agora.data);

  const hoje: DosesDoRemedio['hoje'] = [];
  const semMarcacao: HorarioSemMarcacao[] = [];
  const esperadas = new Set<string>();
  let marcados = 0;

  for (const { data, diaDaSemana } of dias) {
    const ehHoje = data === agora.data;
    for (const horario of getMedicineDoseTimesForDate(regra, data)) {
      const chave = `${data} ${horario}`;
      esperadas.add(chave);
      const s = situacao(horario, marcadas.has(chave) || (ehHoje && doCampoAntigo.has(horario)), ehHoje, agora);

      if (ehHoje) hoje.push({ horario, situacao: s });
      if (s === 'marcado') marcados += 1;
      if (s === 'sem marcação') semMarcacao.push({ data, diaDaSemana, horario });
    }
  }

  // Do mais recente ao mais antigo: "esqueci alguma?" quer saber primeiro de ontem.
  semMarcacao.reverse();
  const pendentes = hoje.filter((h) => h.situacao === 'pendente').length;

  return {
    nome: texto(r.name),
    termino: regra.endDate && regra.endDate >= periodo.de && regra.endDate <= periodo.ate ? regra.endDate : null,
    hoje,
    contagem: { horariosEsperados: esperadas.size, marcados, semMarcacao: semMarcacao.length, pendentes },
    semMarcacao: semMarcacao.slice(0, MAX_SEM_MARCACAO_POR_REMEDIO),
    semMarcacaoOmitidos: Math.max(0, semMarcacao.length - MAX_SEM_MARCACAO_POR_REMEDIO),
    // Contada, e nao descartada: o cadastro nao guarda os horarios antigos, e
    // uma marcacao que sumisse em silencio faria a pessoa achar que nao marcou.
    // As do campo antigo de hoje contam tambem, sem dobrar a que o historico ja
    // tem (o conjunto junta as duas pela mesma chave).
    marcacoesForaDoHorarioAtual: [
      ...new Set([...marcadas, ...[...doCampoAntigo].map((horario) => `${agora.data} ${horario}`)]),
    ].filter((chave) => !esperadas.has(chave)).length,
  };
}

/**
 * A explicacao, quando ha o que explicar. Com marcacao num horario antigo, ha
 * marcacao: dizer "nenhum horario marcado" seria falso, e a explicacao dos
 * horarios que mudaram ja cobre. Por isso as duas nunca vao juntas.
 */
function explicacaoDe(medicamentos: DosesDoRemedio[]): string | undefined {
  if (medicamentos.some((m) => m.marcacoesForaDoHorarioAtual > 0)) return EXPLICACAO_HORARIOS_MUDARAM;
  if (medicamentos.every((m) => m.contagem.marcados === 0)) return EXPLICACAO_SEM_MARCACAO;
  return undefined;
}

/** A saida inteira. `marcacoes[i]` sao as linhas do log de `escolha.escolhidos[i]`. */
export function montarSaida({
  escolha,
  marcacoes,
  agora,
  periodo,
}: {
  escolha: EscolhaDeRemedios;
  marcacoes: LinhaDoBanco[][];
  agora: Agora;
  periodo: Periodo;
}): SaidaDasDoses {
  const base = { periodo, omitidos: escolha.omitidos };

  if (!escolha.haRemedioEmUso) {
    return { disponivel: false, ...base, medicamentos: [], explicacao: EXPLICACAO_SEM_REMEDIO };
  }
  if (escolha.naoEncontrado) {
    return {
      disponivel: true,
      ...base,
      medicamentos: [],
      naoEncontrado: true,
      nomesEmUso: escolha.nomesEmUso,
      nomesEmUsoOmitidos: escolha.nomesEmUsoOmitidos,
      explicacao: EXPLICACAO_NAO_ENCONTRADO,
    };
  }

  const dias = diasDoPeriodo(periodo);
  const medicamentos = escolha.escolhidos.map((r, i) => dosesDoRemedio(r, marcacoes[i] ?? [], agora, dias, periodo));
  if (medicamentos.length === 0) {
    return { disponivel: true, ...base, medicamentos, explicacao: EXPLICACAO_SEM_HORARIO };
  }

  const explicacao = explicacaoDe(medicamentos);
  return { disponivel: true, ...base, medicamentos, ...(explicacao ? { explicacao } : {}) };
}
