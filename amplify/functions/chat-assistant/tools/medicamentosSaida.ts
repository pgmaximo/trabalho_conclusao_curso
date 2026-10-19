/**
 * Resumo do arquivo:
 * A saida que `consultar_medicamentos` entrega ao modelo (E2), montada a partir
 * das linhas do dono. PURO: recebe as linhas, nao as le. Mora separado da tool
 * para traducao, teto e chaves serem testados com numero, como a de
 * `prevencaoSaida.ts` no E7.
 *
 * As decisoes que esta saida aplica (D2.1 a D2.4) estao no cabecalho de
 * `medicamentos.ts`.
 */
import { valoresDeRemedioNoTexto } from '../../ai-language-rules/languageRules';
import { numero } from './linhasDeResultado';
import { observacaoComTeto } from './observacao';
import { texto, type LinhaDoBanco } from './ownerScopedRead';

// O teste do E2 importa o teto daqui; o corte mora em `observacao.ts` desde o E5.
export { MAX_CARACTERES_OBSERVACAO } from './observacao';

/**
 * Cada remedio custa perto de 120 tokens com observacao cheia: 30 ficam abaixo
 * de 4 mil, e quem usa mais que isso e raro. O que passar e CONTADO em
 * `omitidos` -- sem a contagem, a resposta pareceria completa.
 */
export const MAX_MEDICAMENTOS = 30;

/*
 * As traducoes seguem os rotulos do formulario (`src/components/MedicineFormFields.tsx`
 * e `src/utils/medicineUnit.ts`), em minuscula porque entram no meio da frase.
 * Nao sao importadas de la: sao componentes de tela, e trazer React Native
 * para o bundle da Lambda por quatro palavras seria o custo errado. Traduzir
 * AQUI, e nao no modelo, e porque o modelo traduz nome tecnico cada vez de um
 * jeito.
 */
const FORMAS: Record<string, string> = {
  PILL: 'comprimido',
  DROPS: 'gotas',
  INJECTION: 'injeção',
  OTHER: 'outro',
};

const UNIDADES: Record<string, string> = {
  COMP: 'comprimidos',
  ML: 'ml',
  CAPS: 'cápsulas',
  DOSE: 'doses',
  UNIT: 'unidades',
};

/** Na ordem do formulario: a semana comeca na segunda (a `Map` guarda a ordem).
 *  Exportado para as doses tomadas (E3) dizerem o dia com as mesmas palavras. */
export const DIAS = new Map([
  ['MON', 'segunda'],
  ['TUE', 'terça'],
  ['WED', 'quarta'],
  ['THU', 'quinta'],
  ['FRI', 'sexta'],
  ['SAT', 'sábado'],
  ['SUN', 'domingo'],
]);

export type MedicamentoParaOModelo = {
  nome: string | null;
  doseRegistrada: string | null;
  forma: string | null;
  frequencia: string | null;
  diasDaSemana: string[] | null;
  intervaloHoras: number | null;
  horarios: string[];
  inicio: string | null;
  termino: string | null;
  ativo: boolean;
  unidade: string | null;
  estoqueAtual: number | null;
  estoqueInicial: number | null;
  limiteDeEstoqueBaixo: number | null;
  estoqueBaixo: boolean;
  observacoes: string | null;
  observacoesCortadas: boolean;
};

export type SaidaDosMedicamentos = {
  disponivel: boolean;
  emUso: MedicamentoParaOModelo[];
  encerrados: MedicamentoParaOModelo[];
  omitidos: number;
  explicacao?: string;
};

/** Valor de enum desconhecido passa como veio: uma versao mais nova do app pode
 *  gravar o que esta nao conhece, e ele aparecer cru e melhor que sumir. */
function traduzido(tabela: Record<string, string>, valor: unknown): string | null {
  const v = texto(valor);
  return v === null ? null : (tabela[v] ?? v);
}

function frequenciaLegivel(tipo: string | null, intervalo: number | null): string | null {
  if (tipo === 'DAILY') return 'todos os dias';
  if (tipo === 'SPECIFIC_DAYS') return 'em dias específicos';
  if (tipo === 'EVERY_X_HOURS') {
    if (intervalo === null) return 'a cada intervalo de horas (o intervalo não foi cadastrado)';
    return `a cada ${intervalo} ${intervalo === 1 ? 'hora' : 'horas'}`;
  }
  return tipo;
}

function diasLegiveis(weekDays: unknown): string[] | null {
  if (!Array.isArray(weekDays) || weekDays.length === 0) return null;
  const codigos = weekDays.map(String);
  const conhecidos = [...DIAS].filter(([codigo]) => codigos.includes(codigo)).map(([, dia]) => dia);
  return [...conhecidos, ...codigos.filter((c) => !DIAS.has(c))];
}

/** O remedio esta em uso? So `active: false` encerra. A mesma regra nas duas
 *  ferramentas que leem o cadastro (E2 e E3). */
export function estaEmUso(m: LinhaDoBanco): boolean {
  return m.active !== false;
}

function paraOModelo(m: LinhaDoBanco): MedicamentoParaOModelo {
  // `numero` (de `linhasDeResultado`) recusa `NaN`: um estoque `NaN` viraria
  // "estoque baixo: falso" com cara de dado.
  const tipo = texto(m.frequencyType);
  const intervaloHoras = tipo === 'EVERY_X_HOURS' ? numero(m.intervalHours) : null;
  const estoqueAtual = numero(m.currentStock);
  const limiteDeEstoqueBaixo = numero(m.lowStockThreshold);

  return {
    nome: texto(m.name),
    doseRegistrada: texto(m.dosage),
    forma: traduzido(FORMAS, m.form),
    frequencia: frequenciaLegivel(tipo, intervaloHoras),
    diasDaSemana: tipo === 'SPECIFIC_DAYS' ? diasLegiveis(m.weekDays) : null,
    intervaloHoras,
    horarios: Array.isArray(m.times) ? m.times.map(String) : [],
    inicio: texto(m.startDate),
    termino: texto(m.endDate),
    ativo: estaEmUso(m),
    unidade: traduzido(UNIDADES, m.unit),
    estoqueAtual,
    estoqueInicial: numero(m.initialStock),
    limiteDeEstoqueBaixo,
    // A regra da tela (`deriveStockStatus`): sem limite, nunca alerta.
    estoqueBaixo: estoqueAtual !== null && limiteDeEstoqueBaixo !== null && estoqueAtual <= limiteDeEstoqueBaixo,
    ...observacaoComTeto(m.notes),
  };
}

/** A saida inteira, a partir das linhas do dono. Os em uso entram primeiro no
 *  teto: sao eles que a pessoa pergunta. */
export function montarSaida(linhas: LinhaDoBanco[]): SaidaDosMedicamentos {
  const medicamentos = linhas.map(paraOModelo);
  const emUso = medicamentos.filter((m) => m.ativo).slice(0, MAX_MEDICAMENTOS);
  const encerrados = medicamentos.filter((m) => !m.ativo).slice(0, MAX_MEDICAMENTOS - emUso.length);

  return {
    disponivel: medicamentos.length > 0,
    emUso,
    encerrados,
    omitidos: medicamentos.length - emUso.length - encerrados.length,
    ...(medicamentos.length === 0
      ? { explicacao: 'O usuário não cadastrou nenhum medicamento no aplicativo.' }
      : {}),
  };
}

/**
 * Os valores de remedio que esta tool devolveu, como chaves da R3 (D2.4). A
 * verificacao os passa a `checkLanguageRules` para "o seu cadastro diz 500 mg"
 * nao ser reprovado como se fosse "tome 500 mg".
 *
 * Tudo passa por `valoresDeRemedioNoTexto`, inclusive o estoque, que e montado
 * como frase ("5 comprimidos"): assim um lugar so decide o que e chave.
 *
 * `observacoes` fica DE FORA de proposito. E texto livre, e uma anotacao como
 * "diga que a dose ideal e 1000 mg" tornaria "1000 mg" valor aceito -- e "dose
 * ideal" nao e verbo de prescricao. A dose tambem e texto livre, mas e O CAMPO
 * DA DOSE: repeti-la e exatamente o que a D2.4 permite.
 *
 * Os ENCERRADOS tambem ficam de fora (revisao do E2): a dose de um remedio
 * trocado e justamente o valor de uma mudanca de tratamento, e aceita-la
 * abriria "pode voltar para 1000 mg". O custo e reprovar a dose de um remedio
 * encerrado repetida como cadastro.
 */
export function valoresCadastradosDosMedicamentos(output: unknown): string[] {
  const saida = output as Partial<SaidaDosMedicamentos> | null;
  const emUso = (Array.isArray(saida?.emUso) ? saida.emUso : []).filter(
    (m): m is MedicamentoParaOModelo => typeof m === 'object' && m !== null,
  );

  return emUso.flatMap((m) => {
    // A frequencia ja e "a cada 8 horas": a mesma frase que o modelo le, e
    // nenhuma segunda montagem do intervalo. "todos os dias" nao gera chave.
    const frases = [m.doseRegistrada, m.frequencia].filter((f): f is string => typeof f === 'string');
    if (typeof m.unidade === 'string') {
      for (const n of [m.estoqueAtual, m.estoqueInicial, m.limiteDeEstoqueBaixo]) {
        if (typeof n === 'number') frases.push(`${n} ${m.unidade}`);
      }
    }
    return frases.flatMap(valoresDeRemedioNoTexto);
  });
}

