/**
 * Resumo do arquivo:
 * Agrupa as linhas lidas de um documento por EXAME, do jeito que o laudo as
 * apresenta, e conta o que foi lido.
 *
 * Por que agrupar: o laudo real do Delboni rende 45 linhas. Uma lista corrida
 * de 45 linhas num celular nao se le. A tela de referencia
 * (estudos-ia/02-designs/leitura-da-tela-dasa.md) resolve isso mostrando um
 * cartao por exame, e o campo `panel` do catalogo gerado e o que nos permite
 * fazer o mesmo SEM inventar agrupamento nosso.
 *
 * Por que contar: o estudo de leitura mediu cobertura INSTAVEL -- 47, 47, 42,
 * 47 linhas em quatro execucoes identicas do mesmo documento. Uma contagem
 * visivel e o que transforma omissao silenciosa em omissao percebida.
 *
 * Este modulo NAO ordena por valor e NAO classifica nada. Ordenar por valor
 * seria inventar um criterio que o papel nao tem.
 */
import {
  findAnalyteByCode,
  type CanonicalAnalyte,
} from '../../amplify/functions/extract-document-data/analyteCatalog';
import { isLocalAnalyteCode } from '../../amplify/functions/extract-document-data/localAnalyteCode';
import type { LabResultView } from '@/services/extractionService';

/** Cabecalho de quem nao esta no catalogo: nao ha painel para consultar, e
 *  inventar um nome de exame seria dizer algo que o papel nao disse. */
const SEM_EXAME_CONHECIDO = 'Outros resultados do documento';

export type GrupoDeExame = {
  titulo: string;
  linhas: LabResultView[];
  /**
   * Falso quando o grupo tem analito de codigo local (D32). Nao e um defeito
   * e nao e um aviso de saude: e o limite honesto do que o aplicativo promete.
   * O valor esta guardado e aparece; o que ele nao faz e casar com o mesmo
   * exame feito em outro laboratorio que escreva o nome de outro jeito.
   */
  comparavel: boolean;
};

function painelDe(linha: LabResultView): { titulo: string; analito: CanonicalAnalyte | null } {
  const analito = findAnalyteByCode(linha.analyteCode);
  return { titulo: analito?.panel ?? SEM_EXAME_CONHECIDO, analito };
}

/**
 * Preserva a ordem de chegada -- dentro do grupo e entre os grupos. A ordem em
 * que o modelo transcreveu e a ordem do papel, e ela e a unica que a pessoa
 * consegue conferir com o documento aberto do lado.
 */
export function agruparPorExame(linhas: LabResultView[]): GrupoDeExame[] {
  const grupos = new Map<string, GrupoDeExame>();

  for (const linha of linhas) {
    const { titulo } = painelDe(linha);
    const grupo = grupos.get(titulo) ?? { titulo, linhas: [], comparavel: true };
    grupo.linhas.push(linha);
    if (isLocalAnalyteCode(linha.analyteCode) || linha.analyteCode === '') {
      grupo.comparavel = false;
    }
    grupos.set(titulo, grupo);
  }

  return [...grupos.values()];
}

export type ContagemDeLinhas = { total: number; pendentes: number };

export function contarLinhas(linhas: LabResultView[]): ContagemDeLinhas {
  return {
    total: linhas.length,
    pendentes: linhas.filter((l) => l.reviewStatus === 'PENDENTE_DE_REVISAO').length,
  };
}
