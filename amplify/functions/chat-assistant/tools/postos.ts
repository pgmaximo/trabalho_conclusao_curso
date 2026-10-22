/**
 * Resumo do arquivo:
 * As unidades basicas de saude da cidade do usuario, do mesmo cadastro (CNES)
 * que a tela de Vacinacao usa (E8). A cidade vem do CONTEXTO do turno -- o
 * codigo que o aplicativo mandou no pedido (D8.1 = A) --, nunca da entrada do
 * modelo, que inventaria um codigo.
 *
 * A leitura e so do cache que a tela preenche (D8.2 = A), pela porta publica
 * (D8.3 = A): nenhuma chamada ao CNES dentro da conversa. Cache ausente ou
 * vencido e AUSENCIA de dado, e a explicacao manda abrir a tela, que busca a
 * lista.
 *
 * O que ela NAO sabe, e a saida diz isso em todo caminho feliz: se a unidade
 * aplica certa vacina, o horario, se esta aberta. Sao UBS, e nem toda UBS tem
 * sala de vacina. Sem a coordenada do aparelho tambem nao ha "a mais perto":
 * a ordem e por bairro e nome, que pelo menos e explicavel, e a tela continua
 * sendo onde se ve as mais proximas.
 */
import { z } from 'zod';

import { VALIDADE_DO_CACHE_DE_POSTOS_S } from '../../get-vaccination-sites/validadeDoCache';
import type { ChatIdentity } from '../auth';
import { dataEmSaoPaulo } from '../formatoPtBr';
import type { ContextoDoTurno, DegradedBlock } from '../types';
import { lerPublicoPorChave, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

/**
 * Oito: cada unidade custa ~25 tokens, e oito ja e mais do que a pessoa le
 * numa resposta de chat. A saida conta o que ficou de fora, para a lista nao
 * parecer completa numa cidade com centenas de UBS.
 */
export const MAX_UNIDADES = 8;

const SEM_CIDADE =
  'O aplicativo ainda não sabe a cidade do usuário. Na tela de Vacinação, ele pode permitir a localização ou escolher a cidade.';
const NAO_CARREGADA =
  'A lista de unidades de saúde da cidade do usuário ainda não foi carregada no aplicativo. Ao abrir a tela de Vacinação, o aplicativo busca essa lista.';
const LISTA_VAZIA =
  'O cadastro nacional de estabelecimentos de saúde não trouxe nenhuma unidade básica de saúde para a cidade do usuário.';
const NADA_NO_BAIRRO = 'Nenhuma unidade da lista salva da cidade tem esse bairro no endereço.';
const FONTE = 'Cadastro Nacional de Estabelecimentos de Saúde (CNES), do Ministério da Saúde.';
const OBSERVACAO =
  'São unidades básicas de saúde do cadastro nacional. O aplicativo não sabe quais delas aplicam cada vacina nem o horário de funcionamento; isso deve ser confirmado com a unidade. A tela de Vacinação mostra as mais próximas.';

type UnidadeParaOModelo = { nome: string; bairro: string | null; endereco: string | null };

type SaidaPostos =
  | {
      disponivel: true;
      fonte: string;
      observacao: string;
      atualizadoEm: string;
      totalNaCidade: number;
      totalNoFiltro: number | null;
      omitidas: number;
      unidades: UnidadeParaOModelo[];
      explicacao?: string;
    }
  | { disponivel: false; explicacao: string };

function semDado(explicacao: string): SaidaPostos {
  return { disponivel: false, explicacao };
}

/** Comparacao de bairro como a pessoa escreve: sem acento, sem caixa e com um
 *  espaco so entre as palavras ("sao  jose" casa "SAO JOSE"). */
function semAcento(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Criado uma vez: numa capital, a ordenacao compara centenas de unidades, e
 *  `localeCompare` com locale explicito resolveria o locale a cada comparacao. */
const PT_BR = new Intl.Collator('pt-BR');

/**
 * Bairro, depois nome, em pt-BR. Unidade sem bairro vai para o fim -- nunca
 * some, mas tambem nao abre a lista.
 */
function porBairroENome(a: UnidadeParaOModelo, b: UnidadeParaOModelo): number {
  if (a.bairro === null && b.bairro !== null) return 1;
  if (b.bairro === null && a.bairro !== null) return -1;
  return PT_BR.compare(a.bairro ?? '', b.bairro ?? '') || PT_BR.compare(a.nome, b.nome);
}

/** So os tres campos que a pessoa usa. Coordenada, CNES e distancia ficam no
 *  cache: nao ajudam a resposta e custam token. */
function paraOModelo(bruta: unknown): UnidadeParaOModelo | null {
  if (typeof bruta !== 'object' || bruta === null || Array.isArray(bruta)) return null;
  const u = bruta as Record<string, unknown>;
  return {
    nome: texto(u.nome) ?? 'Unidade de saúde',
    bairro: texto(u.bairro),
    endereco: texto(u.logradouro),
  };
}

export const postosTool: ChatTool = {
  name: 'consultar_postos',
  description:
    'Lista unidades básicas de saúde da cidade do usuário (nome, bairro e endereço), do cadastro nacional que a tela de Vacinação usa; aceita um bairro para filtrar. NÃO diz se a unidade aplica certa vacina, NÃO informa horário nem se está aberta, NÃO calcula distância e NÃO busca outra cidade.',
  inputSchema: z.object({ bairro: z.string().trim().min(1).max(60).optional() }).strict(),
  readOnly: true,
  async run(input: unknown, _identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const codigo = contexto?.local?.codigoMunicipio ?? null;
    if (codigo === null) return semDado(SEM_CIDADE);

    const item = await lerPublicoPorChave('CACHE_DE_POSTOS', codigo);
    // Vencido conta como ausente, igual a Lambda da tela: mostrar a lista
    // vencida seria dizer "atualizada em" uma data que a tela ja recusa.
    // `isFinite`, e nao `typeof`: NaN e "number", e passaria por valido. E um
    // vencimento ALEM da validade (gravado por outra versao, ou lixo como 1e20)
    // tambem e ausente: a data de gravacao sairia no futuro, ou invalida.
    const expiresAt = item?.expiresAt;
    const agora = Math.floor(Date.now() / 1000);
    if (
      !item ||
      !Array.isArray(item.payload) ||
      typeof expiresAt !== 'number' ||
      !Number.isFinite(expiresAt) ||
      expiresAt < agora ||
      expiresAt > agora + VALIDADE_DO_CACHE_DE_POSTOS_S
    ) {
      return semDado(NAO_CARREGADA);
    }

    const todas = item.payload.map(paraOModelo).filter((u): u is UnidadeParaOModelo => u !== null);
    if (todas.length === 0) return semDado(LISTA_VAZIA);

    // Um bairro que vira "" depois de tirar o acento (um acento solto) e "sem
    // filtro": "" esta contido em todo texto, e o filtro casaria tudo dizendo
    // que filtrou. O filtro vem ANTES da ordenacao: com bairro, sobra pouco
    // para ordenar.
    const alvo = semAcento((input as { bairro?: string }).bairro ?? '');
    const escolhidas = (
      alvo ? todas.filter((u) => u.bairro !== null && semAcento(u.bairro).includes(alvo)) : todas
    ).sort(porBairroENome);

    return {
      disponivel: true,
      fonte: FONTE,
      observacao: OBSERVACAO,
      // A gravacao e `expiresAt - validade`, exata, porque a validade e a
      // mesma constante que a Lambda da tela usa ao gravar.
      atualizadoEm: dataEmSaoPaulo(new Date((expiresAt - VALIDADE_DO_CACHE_DE_POSTOS_S) * 1000)),
      totalNaCidade: todas.length,
      totalNoFiltro: alvo ? escolhidas.length : null,
      omitidas: Math.max(0, escolhidas.length - MAX_UNIDADES),
      unidades: escolhidas.slice(0, MAX_UNIDADES),
      ...(alvo && escolhidas.length === 0 ? { explicacao: NADA_NO_BAIRRO } : {}),
    } satisfies SaidaPostos;
  },
  /**
   * O modo degradado leva junto o que o app NAO sabe e quantas ficaram de
   * fora: e o aviso que o prompt exige em toda resposta normal, e sem ele a
   * lista pareceria completa e "de vacinacao" (revisao do E8).
   */
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<Extract<SaidaPostos, { disponivel: true }>> | null;
    if (!saida?.disponivel || !saida.unidades?.length) return null;
    return {
      titulo: 'Unidades básicas de saúde da sua cidade',
      linhas: [
        ...saida.unidades.map((u) =>
          [u.nome, u.bairro, u.endereco].filter((parte): parte is string => Boolean(parte)).join(' · '),
        ),
        ...(saida.omitidas ? [`E mais ${saida.omitidas} unidades na lista da cidade.`] : []),
        OBSERVACAO,
      ],
      citacoes: [],
    };
  },
};
