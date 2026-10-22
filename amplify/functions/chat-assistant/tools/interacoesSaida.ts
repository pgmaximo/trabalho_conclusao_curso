/**
 * Resumo do arquivo:
 * A saida que `consultar_interacoes` entrega ao modelo (E9), montada a partir
 * dos remedios do dono e dos nomes citados na conversa. PURO: recebe as linhas,
 * nao as le -- como `medicamentosSaida.ts` no E2, para o cruzamento ser testado
 * com numero e sem SDK.
 *
 * O cruzamento em si NAO mora aqui: e o `findInteractions` do modulo
 * compartilhado, o MESMO que a tela de Medicamentos usa (D9.1). Este arquivo so
 * decide o que entra no cruzamento e o que sai para o modelo.
 *
 * Decisoes (`specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E9-interacoes-medicamentosas.md`):
 * - D9.2: os nomes citados entram como candidatos, cruzados com os em uso e
 *   entre si.
 * - D9.3: nome que a lista nao conhece SAI, em `naoReconhecidos`. Na tela, o
 *   silencio convive com a lista de remedios; na conversa, "nenhum alerta" e
 *   tudo o que a pessoa le, e soaria como "pode tomar".
 * - D9.5: o `mechanismPt` nao sai. E jargao (CYP3A4, IECA), gasta token, e um
 *   deles e reprovado pela R3 se o modelo o repetir.
 */
import { findInteractions } from '../../drug-interactions-shared/findInteractions';
import { normalizeDrugName, removerDose, resolveCanonicalDrug } from '../../drug-interactions-shared/normalizeDrugName';
import { texto, type LinhaDoBanco } from './ownerScopedRead';

/** Tetos da entrada. Cinco nomes cobrem "posso tomar X com Y?" com folga; 60
 *  caracteres cobrem nome comercial com dose ("Losartana Potassica 50 mg"), e
 *  nao cabem uma instrucao plantada inteira. */
export const MAX_CANDIDATOS = 5;
export const MAX_CARACTERES_CANDIDATO = 60;

/** Quem usa muitos remedios tem muitos que a lista curta nao conhece. Dez nomes
 *  bastam para a resposta ser honesta; o resto e CONTADO. */
export const MAX_NAO_RECONHECIDOS = 10;

/**
 * Vai em toda saida com dado. E a frase que impede o pior erro do E9: a
 * ausencia de alerta lida como seguranca. Escrita para passar a R3 da D9.4 --
 * "nao garante que nao exista" nao e a garantia "nao ha interacao".
 */
export const AVISO_DA_BASE =
  'Esta checagem usa só a lista curta de combinações que o aplicativo conhece. Não encontrar alerta não garante que não exista interação.';

export type OrigemDoNome = 'cadastrado' | 'citado';

export type MedicamentoDoAlerta = { nome: string; origem: OrigemDoNome };

export type AlertaDeInteracao = {
  medicamentos: [MedicamentoDoAlerta, MedicamentoDoAlerta];
  /** "grave" e "moderada", e nao "leve": a gravidade menor da lista inclui
   *  "piorar a funcao renal", e "leve" diminuiria isso. */
  gravidade: 'grave' | 'moderada';
  risco: string;
};

export type SaidaDasInteracoes = {
  disponivel: boolean;
  alertas: AlertaDeInteracao[];
  verificados: string[];
  naoReconhecidos: string[];
  naoReconhecidosOmitidos: number;
  /**
   * Nomes diferentes do MESMO principio ativo ("Advil" cadastrado e
   * "ibuprofeno" citado). Sem isto, o segundo nome sumia em silencio -- e
   * "posso tomar ibuprofeno? ja tomo Advil" e o mesmo remedio duas vezes
   * (revisao do E9). So o fato, sem nada de dose.
   */
  mesmoPrincipioAtivo: { nomes: string[] }[];
  avisoDaBase?: string;
  explicacao?: string;
};

/**
 * Os nomes na ordem em que entram: cadastrados em uso primeiro, e e isso que da
 * a eles a preferencia quando o mesmo principio ativo aparece duas vezes.
 *
 * "Em uso" e `active !== false`, como em `consultar_medicamentos`, MENOS o que
 * tem termino ja passado (revisao do E9): um antibiotico de sete dias de 2020,
 * que ninguem desativou, gerava "alerta grave" com a sinvastatina de hoje. Nao
 * e o "previsto para hoje" da tela: o remedio de segunda e quarta tambem esta
 * no corpo na terca. `hoje` vem de fora para a funcao continuar pura.
 */
function nomesDeEntrada(linhas: LinhaDoBanco[], candidatos: readonly string[], hoje: string) {
  const cadastrados = linhas
    .filter((m) => m.active !== false && !((texto(m.endDate) ?? hoje) < hoje))
    .map((m) => texto(m.name))
    .filter((nome): nome is string => nome !== null)
    .map((nome) => ({ nome, origem: 'cadastrado' as const }));
  return [...cadastrados, ...candidatos.map((nome) => ({ nome, origem: 'citado' as const }))];
}

/** A dose e o parentese saem do nome (`removerDose`, a regra do reconhecimento),
 *  com a grafia da pessoa. "Marevan 5mg" repetido pelo modelo seria reprovado
 *  pela R3 -- e sairia cru no modo degradado (revisao do E9). */
function semDose(nome: string): string {
  return removerDose(nome).replace(/\s+/g, ' ').trim() || nome;
}

/**
 * O nome que volta ao modelo. Quando a lista reconheceu so a PRIMEIRA palavra,
 * volta so ela: o nome citado e texto do modelo, e "warfarina, suspenda a
 * losartana" voltaria inteiro como nome de remedio -- e no modo degradado, que
 * nao passa pelas regras (revisao do E9). "Acido acetilsalicilico", que so e
 * reconhecido inteiro, sai inteiro.
 */
function nomeParaExibir(nome: string, ativo: string | null): string {
  const limpo = semDose(nome);
  if (ativo === null) return limpo;
  const primeira = limpo.split(/[\s,;:]+/)[0];
  return primeira !== limpo && resolveCanonicalDrug(primeira) === ativo ? primeira : limpo;
}

type Separacao = {
  sujeitos: { id: string; name: string }[];
  origens: Map<string, OrigemDoNome>;
  naoReconhecidos: string[];
  mesmoPrincipioAtivo: { nomes: string[] }[];
};

/** Separa reconhecidos de nao reconhecidos. O mesmo principio ativo de novo nao
 *  gera alerta repetido, mas e AVISADO em `mesmoPrincipioAtivo`; o mesmo nome
 *  com outra caixa ou acento aparece uma vez so. Os dois lados comparam pela
 *  mesma chave, `normalizeDrugName`. */
function separar(entradas: ReturnType<typeof nomesDeEntrada>): Separacao {
  const sujeitos: Separacao['sujeitos'] = [];
  const origens = new Map<string, OrigemDoNome>();
  const naoReconhecidos: string[] = [];
  const nomesPorAtivo = new Map<string, string[]>();
  const desconhecidosVistos = new Set<string>();

  entradas.forEach(({ nome, origem }, i) => {
    const ativo = resolveCanonicalDrug(nome);
    const exibido = nomeParaExibir(nome, ativo);
    const chave = normalizeDrugName(exibido);
    if (ativo === null) {
      if (!desconhecidosVistos.has(chave)) naoReconhecidos.push(exibido);
      desconhecidosVistos.add(chave);
      return;
    }
    const nomes = nomesPorAtivo.get(ativo);
    if (nomes) {
      // Dois registros de "Losartana" nao sao noticia; "Advil" e "ibuprofeno" sao.
      if (!nomes.some((n) => normalizeDrugName(n) === chave)) nomes.push(exibido);
      return;
    }
    nomesPorAtivo.set(ativo, [exibido]);
    const id = `${origem}:${i}`;
    origens.set(id, origem);
    sujeitos.push({ id, name: exibido });
  });

  const mesmoPrincipioAtivo = [...nomesPorAtivo.values()].filter((n) => n.length > 1).map((nomes) => ({ nomes }));
  return { sujeitos, origens, naoReconhecidos, mesmoPrincipioAtivo };
}

export function montarSaidaDasInteracoes(
  linhas: LinhaDoBanco[],
  candidatos: readonly string[],
  hoje: string,
): SaidaDasInteracoes {
  const entradas = nomesDeEntrada(linhas, candidatos, hoje);
  if (entradas.length === 0) {
    return {
      disponivel: false,
      alertas: [],
      verificados: [],
      naoReconhecidos: [],
      naoReconhecidosOmitidos: 0,
      mesmoPrincipioAtivo: [],
      explicacao: 'O usuário não tem medicamento em uso cadastrado no aplicativo e não citou nenhum nome.',
    };
  }

  const { sujeitos, origens, naoReconhecidos, mesmoPrincipioAtivo } = separar(entradas);
  const doAlerta = (m: { id: string; name: string }): MedicamentoDoAlerta => ({
    nome: m.name,
    origem: origens.get(m.id)!,
  });

  return {
    disponivel: true,
    alertas: findInteractions(sujeitos).map((match) => ({
      medicamentos: [doAlerta(match.medicineA), doAlerta(match.medicineB)],
      gravidade: match.severity === 'danger' ? 'grave' : 'moderada',
      risco: match.riskPt,
    })),
    verificados: sujeitos.map((s) => s.name),
    naoReconhecidos: naoReconhecidos.slice(0, MAX_NAO_RECONHECIDOS),
    naoReconhecidosOmitidos: Math.max(0, naoReconhecidos.length - MAX_NAO_RECONHECIDOS),
    mesmoPrincipioAtivo,
    avisoDaBase: AVISO_DA_BASE,
  };
}
