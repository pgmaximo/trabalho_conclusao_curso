/**
 * Resumo do arquivo:
 * O contrato da acao proposta pela IA (E11) depois de resolvida, os limites, e
 * a conferencia de FORMA, num modulo que NAO IMPORTA NADA.
 *
 * A ausencia de importacao e estrutural: a mesma conferencia roda em tres
 * lugares -- na saida da Lambda, na resposta que o app recebe e nos parametros
 * da rota do formulario, que tambem podem vir de um link de fora
 * (`SuaSaude://`). Tres copias divergiriam, e a divergencia apareceria como um
 * campo que o chat manda e o formulario recusa, ou o contrario. Precedente:
 * `chat-assistant/memoria/regras.ts`.
 *
 * O que este modulo NAO faz: conferir se o campo veio da fala da pessoa, nem
 * transformar "sexta" em data. Isso depende da conversa e do dia do turno, que
 * so a Lambda tem (`chat-assistant/acoes/`). Aqui so se garante que o que
 * chega ao formulario tem a forma que ele aceita.
 */

/** A lista fechada (D11.2 = A). Um tipo e uma finalidade: entra so por decisao. */
export const TIPOS_DE_ACAO = ['ABRIR_NOVO_AGENDAMENTO', 'ABRIR_NOVO_LEMBRETE'] as const;
export type TipoDeAcao = (typeof TIPOS_DE_ACAO)[number];

/** Os tipos do formulario de compromisso (`AppointmentType`). */
export const TIPOS_DE_COMPROMISSO = ['CONSULTA', 'EXAME', 'CIRURGIA'] as const;
export type TipoDeCompromisso = (typeof TIPOS_DE_COMPROMISSO)[number];

/** Tetos por campo. Acima deles nao e mais um nome dito numa conversa, e um
 *  campo longo num link de fora e o primeiro sinal de que ele nao veio do chat. */
export const MAX_NOME = 80;
export const MAX_PROFISSIONAL = 80;
export const MAX_ENDERECO = 120;
export const MAX_HORARIOS = 4;
/** Um caractere so ("a") nao e nome, e casaria por acaso em qualquer fala. */
export const MIN_CARACTERES_CAMPO = 2;

export type CamposDeAgendamento = {
  appointmentName?: string;
  professionalName?: string;
  address?: string;
  appointmentType?: TipoDeCompromisso;
  /** AAAA-MM-DD, o formato do `DateInput`. */
  scheduledDate?: string;
  /** hh:mm. */
  scheduledTime?: string;
};

/**
 * Sem dosagem, e a ausencia e o contrato (D11.3 = A): a IA nunca preenche a
 * dose, e um tipo sem o campo nao tem onde a carregar.
 */
export type CamposDeLembrete = { name?: string; times?: string[] };

export type AcaoProposta =
  | { tipo: 'ABRIR_NOVO_AGENDAMENTO'; campos: CamposDeAgendamento }
  | { tipo: 'ABRIR_NOVO_LEMBRETE'; campos: CamposDeLembrete };

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A data existe no calendario: "2026-02-30" tem o formato e nao existe. */
export function dataIsoValida(valor: string): boolean {
  const partes = DATA.exec(valor);
  if (!partes) return false;
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function horaValida(valor: string): boolean {
  return HORA.test(valor);
}

/** Palavras que sozinhas nao nomeiam nada. "de" passa no minimo de 2
 *  caracteres e casa em quase toda fala (revisao do E11). */
const PALAVRAS_VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'ao', 'aos', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'com', 'pra', 'pro', 'para', 'por', 'um', 'uma', 'me', 'eu', 'que', 'se',
]);

function soPalavraVazia(texto: string): boolean {
  return texto.split(' ').every((p) => PALAVRAS_VAZIAS.has(semAcentoLocal(p)));
}

function textoComTeto(valor: unknown, teto: number): string | undefined {
  if (typeof valor !== 'string') return undefined;
  const limpo = valor.trim().replace(/\s+/g, ' ');
  if (limpo.length < MIN_CARACTERES_CAMPO || limpo.length > teto) return undefined;
  return soPalavraVazia(limpo) ? undefined : limpo;
}

function umDe<T extends string>(lista: readonly T[], valor: unknown): T | undefined {
  return (lista as readonly unknown[]).includes(valor) ? (valor as T) : undefined;
}

/** Os horarios chegam como lista (da Lambda) ou como "08:00,20:00" (da rota). */
function horarios(valor: unknown): string[] | undefined {
  const lista = typeof valor === 'string' ? valor.split(',') : Array.isArray(valor) ? valor : [];
  const validos = lista
    .filter((h): h is string => typeof h === 'string')
    .map((h) => h.trim())
    .filter(horaValida);
  const unicos = [...new Set(validos)].slice(0, MAX_HORARIOS);
  return unicos.length > 0 ? unicos : undefined;
}

/** Tira as chaves vazias, para "sobrou algum campo?" ser so `Object.keys`. */
function semVazios<T extends Record<string, unknown>>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;
}

function camposDeAgendamento(c: Record<string, unknown>): CamposDeAgendamento {
  return semVazios({
    appointmentName: textoComTeto(c.appointmentName, MAX_NOME),
    professionalName: textoComTeto(c.professionalName, MAX_PROFISSIONAL),
    address: textoComTeto(c.address, MAX_ENDERECO),
    appointmentType: umDe(TIPOS_DE_COMPROMISSO, c.appointmentType),
    scheduledDate: typeof c.scheduledDate === 'string' && dataIsoValida(c.scheduledDate) ? c.scheduledDate : undefined,
    scheduledTime: typeof c.scheduledTime === 'string' && horaValida(c.scheduledTime) ? c.scheduledTime : undefined,
  });
}

/** Palavras que comecam uma dose dita por extenso: numero, fracao, unidade e
 *  forma. Sem acento, para comparar com o texto ja sem acento. */
const PALAVRAS_DE_DOSE = new Set([
  'um', 'uma', 'dois', 'duas', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa',
  'cem', 'cento', 'duzentos', 'trezentos', 'quinhentos', 'mil', 'meio', 'meia',
  'mg', 'mcg', 'g', 'ml', 'ui', 'gota', 'gotas', 'comprimido', 'comprimidos', 'capsula', 'capsulas',
  'cp', 'cps', 'dose', 'doses',
]);

function semAcentoLocal(palavra: string): string {
  return palavra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * O nome do lembrete sem a dose (D11.3 = A; revisao do E11, achado 4). Corta
 * na primeira palavra que comeca com digito ("50mg", mas nao "b12") ou que e
 * palavra de dose ("cinquenta", "meio", "comprimido"). Mora AQUI, e nao so na
 * Lambda, porque o nome tambem chega pelo link (`?name=Losartana 50mg`), e
 * este e o unico ponto por onde os tres caminhos passam.
 */
function nomeSemDose(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const palavras = valor.trim().split(/\s+/);
  const corte = palavras.findIndex((p) => /^\d/.test(p) || PALAVRAS_DE_DOSE.has(semAcentoLocal(p)));
  return (corte === -1 ? palavras : palavras.slice(0, corte)).join(' ');
}

function camposDeLembrete(c: Record<string, unknown>): CamposDeLembrete {
  return semVazios({ name: textoComTeto(nomeSemDose(c.name), MAX_NOME), times: horarios(c.times) });
}

/**
 * Confere a forma, campo a campo: o campo que nao passa SOME, e os outros
 * ficam. Sem tipo valido ou sem nenhum campo, nao ha acao -- um cartao vazio
 * pediria a pessoa que abrisse um formulario em branco, que ela ja tem.
 *
 * So os campos conhecidos de cada tipo sao lidos, por nome: um `owner` ou um
 * `dosage` vindos de fora nao tem por onde entrar.
 */
export function lerAcaoProposta(bruto: unknown): AcaoProposta | undefined {
  if (typeof bruto !== 'object' || bruto === null) return undefined;
  const { tipo, campos } = bruto as { tipo?: unknown; campos?: unknown };
  const c = typeof campos === 'object' && campos !== null ? (campos as Record<string, unknown>) : {};

  if (tipo === 'ABRIR_NOVO_AGENDAMENTO') {
    const lidos = camposDeAgendamento(c);
    return Object.keys(lidos).length > 0 ? { tipo, campos: lidos } : undefined;
  }
  if (tipo === 'ABRIR_NOVO_LEMBRETE') {
    const lidos = camposDeLembrete(c);
    return Object.keys(lidos).length > 0 ? { tipo, campos: lidos } : undefined;
  }
  return undefined;
}

/** A acao como parametros de rota: tudo texto, horarios juntos por virgula. */
export function paramsDaAcao(acao: AcaoProposta): Record<string, string> {
  const params: Record<string, string> = { tipo: acao.tipo };
  for (const [chave, valor] of Object.entries(acao.campos)) {
    params[chave] = Array.isArray(valor) ? valor.join(',') : String(valor);
  }
  return params;
}

export function rotaDaAcao(tipo: TipoDeAcao): '/add-appointment' | '/add-medicine' {
  return tipo === 'ABRIR_NOVO_AGENDAMENTO' ? '/add-appointment' : '/add-medicine';
}

const DIAS_DA_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/**
 * "2026-10-30" -> "sexta-feira, 30/10/2026". O dia da semana e o que deixa a
 * pessoa conferir "sexta" no cartao antes de abrir o formulario (D11.4). Conta
 * em UTC: com `getDay()` local, o dia dependeria do fuso do aparelho.
 */
export function dataPorExtenso(iso: string): string {
  if (!dataIsoValida(iso)) return iso;
  const [ano, mes, dia] = iso.split('-');
  const semana = DIAS_DA_SEMANA[new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))).getUTCDay()];
  return `${semana}, ${dia}/${mes}/${ano}`;
}
