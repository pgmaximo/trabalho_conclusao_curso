/**
 * Resumo do arquivo:
 * A saida de `consultar_panorama` (E10, 10.1): o quadro geral do que a pessoa
 * registrou, em CONTAGENS E DATAS. Modulo puro -- quem le o banco e
 * `panorama.ts`.
 *
 * Por que so contagem e data: "como eu to?" convida a um veredito sobre a
 * saude, e um panorama com valores de exame, doses e metricas de wearable
 * seria a materia-prima desse veredito, alem de custar no contexto o mesmo que
 * chamar todas as ferramentas. Quem quer o detalhe pergunta, e a ferramenta do
 * assunto responde.
 *
 * Cada regra ("proxima consulta", "dose aplicada", "ultima importacao", "em
 * uso") e a da ferramenta do assunto, importada e nao reescrita: o panorama nao
 * pode dar outra resposta sobre o mesmo registro.
 */
import { formatarData, momentoEmSaoPaulo } from '../formatoPtBr';
import type { DegradedBlock } from '../types';
import { SEM_CONSULTAS, separarConsultas } from './consultas';
import { SEM_DOCUMENTOS } from './exames';
import { estaEmUso, SEM_MEDICAMENTOS } from './medicamentosSaida';
import { maisRecentePrimeiro, texto, type LinhaDoBanco } from './ownerScopedRead';
import { dosesAplicadasPorRecencia } from './vacinasSaida';
import { SEM_IMPORTACAO_PRONTA, ultimaImportacaoPronta } from './wearable';
import { dataDaImportacao } from './wearableSaida';

export type LinhasDoPanorama = {
  documentos: LinhaDoBanco[];
  resultados: LinhaDoBanco[];
  medicamentos: LinhaDoBanco[];
  consultas: LinhaDoBanco[];
  vacinas: LinhaDoBanco[];
  importacoes: LinhaDoBanco[];
};

type SecaoVazia = { disponivel: false; explicacao: string };

type Documentos = {
  disponivel: true;
  total: number;
  exames: number;
  receitas: number;
  /** Do laudo (LabResult), e nao do formulario: e quando o exame foi feito.
   *  Todas as linhas contam, como no `coletadoEntre` de `consultar_exames`:
   *  e a data do documento, nao um valor citado, e as exclusoes da serie sao
   *  sobre o numero. */
  coletaMaisRecente: string | null;
  /** A data do formulario, que a pessoa digitou. */
  registroMaisRecente: string | null;
};
type Medicamentos = { disponivel: true; emUso: number; encerrados: number };
type Consultas = {
  disponivel: true;
  futuras: number;
  passadas: number;
  proxima: { quando: string | null; tipo: string | null; nome: string | null } | null;
};
type Vacinas = {
  disponivel: true;
  registrosAplicados: number;
  maisRecente: { nome: string | null; aplicadaEm: string | null };
};
type Wearable = { disponivel: true; dadosAte: string | null; importadoEm: string | null };

type SaidaDoPanorama = {
  disponivel: boolean;
  documentos: Documentos | SecaoVazia;
  medicamentos: Medicamentos | SecaoVazia;
  consultas: Consultas | SecaoVazia;
  vacinas: Vacinas | SecaoVazia;
  wearable: Wearable | SecaoVazia;
  ondeVerDetalhes: string;
};

/** Dito uma vez, e nao por secao: repetir em cada uma so gastaria contexto. */
const ONDE_VER_DETALHES =
  'Para detalhes, chame só se a pessoa pedir: consultar_exames e consultar_resultados (documentos), consultar_receitas, consultar_medicamentos, consultar_consultas, consultar_vacinas, consultar_wearable.';

const vazia = (explicacao: string): SecaoVazia => ({ disponivel: false, explicacao });

/** A data mais recente do campo, pela ordem de `maisRecentePrimeiro`. So o dia sai. */
function maisRecente(linhas: LinhaDoBanco[], campo: string): string | null {
  return texto(maisRecentePrimeiro(linhas, campo)[0]?.[campo])?.slice(0, 10) ?? null;
}

function documentos(docs: LinhaDoBanco[], resultados: LinhaDoBanco[]): Documentos | SecaoVazia {
  if (docs.length === 0) return vazia(SEM_DOCUMENTOS);
  return {
    disponivel: true,
    total: docs.length,
    exames: docs.filter((d) => d.documentType === 'exam').length,
    receitas: docs.filter((d) => d.documentType === 'prescription').length,
    coletaMaisRecente: maisRecente(resultados, 'collectedAt'),
    registroMaisRecente: maisRecente(docs, 'documentDate'),
  };
}

function medicamentos(linhas: LinhaDoBanco[]): Medicamentos | SecaoVazia {
  if (linhas.length === 0) return vazia(SEM_MEDICAMENTOS);
  const emUso = linhas.filter(estaEmUso).length;
  return { disponivel: true, emUso, encerrados: linhas.length - emUso };
}

function consultas(linhas: LinhaDoBanco[], agora: Date): Consultas | SecaoVazia {
  if (linhas.length === 0) return vazia(SEM_CONSULTAS);
  const { futuras, passadas } = separarConsultas(linhas, momentoEmSaoPaulo(agora));
  const proxima = futuras[0];
  return {
    disponivel: true,
    futuras: futuras.length,
    passadas: passadas.length,
    // Sem profissional nem endereco: o panorama diz QUANDO, e o resto e de
    // `consultar_consultas`.
    proxima: proxima ? { quando: proxima.quando, tipo: proxima.tipo, nome: proxima.nome } : null,
  };
}

function vacinas(linhas: LinhaDoBanco[]): Vacinas | SecaoVazia {
  const aplicadas = dosesAplicadasPorRecencia(linhas);
  if (aplicadas.length === 0) return vazia('O usuário não registrou nenhuma vacina aplicada no aplicativo.');
  return {
    disponivel: true,
    registrosAplicados: aplicadas.length,
    maisRecente: { nome: texto(aplicadas[0].name), aplicadaEm: texto(aplicadas[0].appliedDate) },
  };
}

function wearable(linhas: LinhaDoBanco[]): Wearable | SecaoVazia {
  const ultima = ultimaImportacaoPronta(linhas);
  if (!ultima) return vazia(SEM_IMPORTACAO_PRONTA);
  return {
    disponivel: true,
    dadosAte: texto(ultima.periodEnd),
    // o mesmo dia (Brasilia) que `consultar_wearable` diz: o panorama nao pode divergir da ferramenta do assunto
    importadoEm: dataDaImportacao(ultima.createdAt),
  };
}

export function montarPanorama(linhas: LinhasDoPanorama, agora: Date): SaidaDoPanorama {
  const secoes = {
    documentos: documentos(linhas.documentos, linhas.resultados),
    medicamentos: medicamentos(linhas.medicamentos),
    consultas: consultas(linhas.consultas, agora),
    vacinas: vacinas(linhas.vacinas),
    wearable: wearable(linhas.importacoes),
  };
  return {
    disponivel: Object.values(secoes).some((s) => s.disponivel),
    ...secoes,
    ondeVerDetalhes: ONDE_VER_DETALHES,
  };
}

/**
 * O modo degradado (D31): uma linha por secao disponivel. So contagem e data,
 * como a saida -- nada aqui que a verificacao reprovaria.
 */
export function renderizarPanorama(output: unknown): DegradedBlock | null {
  const s = output as Partial<SaidaDoPanorama> | null;
  const linhas: string[] = [];
  if (s?.documentos?.disponivel) {
    const d = s.documentos;
    linhas.push(
      `Documentos: ${d.total} (${d.exames} de exame, ${d.receitas} de receita)` +
        (d.coletaMaisRecente ? `, coleta mais recente em ${formatarData(d.coletaMaisRecente)}` : ''),
    );
  }
  if (s?.medicamentos?.disponivel) {
    linhas.push(`Remédios cadastrados: ${s.medicamentos.emUso} em uso, ${s.medicamentos.encerrados} encerrados`);
  }
  if (s?.consultas?.disponivel) {
    const p = s.consultas.proxima;
    linhas.push(
      p ? `Próximo agendamento: ${[p.nome, p.quando].filter(Boolean).join(' · ')}` : 'Nenhum agendamento futuro',
    );
  }
  if (s?.vacinas?.disponivel) {
    const v = s.vacinas.maisRecente;
    linhas.push(`Vacina mais recente: ${[v.nome, formatarData(v.aplicadaEm)].filter(Boolean).join(' · ')}`);
  }
  if (s?.wearable?.disponivel) {
    linhas.push(`Dados de wearable até ${formatarData(s.wearable.dadosAte)}`);
  }
  if (linhas.length === 0) return null;
  return { titulo: 'Resumo do que está registrado', linhas, citacoes: [] };
}
