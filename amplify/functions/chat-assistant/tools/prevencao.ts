/**
 * Resumo do arquivo:
 * As recomendacoes GERAIS de prevencao da USPSTF que valem para o perfil da
 * pessoa -- as mesmas que a tela de Prevencao mostra (E7). A ferramenta le o
 * perfil do dono, obtem o dataset publico (com cache) e filtra com o MESMO
 * codigo da tela, que mora em `uspstf-shared/` (D7.1 = A).
 *
 * O que ela NAO e: indicacao individual. A USPSTF diz o que recomenda para um
 * GRUPO (idade, sexo, IMC); se a pessoa deve fazer um exame e decisao de quem
 * a examina. A descricao, o prompt e a verificacao de linguagem dizem isso
 * cada um na sua camada.
 *
 * Por que o perfil e lido ANTES do dataset, e nao em paralelo: o dataset so
 * vale a pena com perfil valido, e o caso mais comum de quem tem pouco dado --
 * perfil nao preenchido -- nao deve custar uma chamada externa.
 *
 * O que vai ao modelo nunca inclui idade, IMC ou peso calculados, so QUAIS
 * filtros foram aplicados. Mesma regra de `perfil.ts`: calcular indice sobre o
 * corpo da pessoa para o modelo ler e um passo em direcao a interpretacao.
 */
import { z } from 'zod';

import { computeBmiBucket, filterRecommendations, mapSex } from '../../uspstf-shared/uspstfFilter';
import type { UspstfDataset } from '../../uspstf-shared/uspstfClient';
import type { ChatIdentity } from '../auth';
import type { DegradedBlock, ContextoDoTurno } from '../types';
// `numero` de `linhasDeResultado`, e nao uma copia: a copia aceitava
// `Infinity`, e um peso infinito virava a faixa de IMC "obesidade".
import { numero } from './linhasDeResultado';
import { lerDoDono, texto } from './ownerScopedRead';
import { obterDataset } from './prevencaoDataset';
import { montarSaida, rotuloDaNota } from './prevencaoSaida';
import type { SaidaPrevencao } from './prevencaoSaida';
import type { ChatTool } from './tipos';

/**
 * Quatro ausencias, quatro explicacoes. Cada uma leva a pessoa a uma acao
 * diferente, e nenhuma nomeia servico, status ou erro tecnico -- o modelo
 * repete ao usuario o que recebe.
 */
const SEM_PERFIL =
  'O usuário ainda não preencheu o perfil de saúde no aplicativo. Sem a data de nascimento e o sexo, não dá para saber quais recomendações gerais de prevenção valem para ele.';
const SEM_NASCIMENTO =
  'A data de nascimento do perfil de saúde não está preenchida de um jeito que dê para usar. O usuário pode corrigi-la no perfil para ver as recomendações gerais de prevenção.';
const FONTE_INDISPONIVEL =
  'Não foi possível consultar as recomendações de prevenção agora. O usuário pode vê-las na tela de Prevenção do aplicativo.';
const NADA_CASA =
  'A fonte de recomendações de prevenção que o aplicativo usa não traz nenhuma recomendação geral para a idade e o sexo registrados no perfil.';

function semDado(explicacao: string) {
  return { disponivel: false as const, explicacao };
}

/** Nunca lanca: falha da fonte e AUSENCIA de dado (RT3), nao erro do turno. */
async function datasetOuNulo(): Promise<UspstfDataset | null> {
  const apiKey = process.env.USPSTF_API_KEY;
  if (!apiKey) {
    console.error('consultar_prevencao: USPSTF_API_KEY nao configurada.');
    return null;
  }
  try {
    return await obterDataset(apiKey);
  } catch (erro) {
    // So a mensagem: o cliente garante que ela nao carrega a chave.
    console.error('consultar_prevencao: falha ao obter o dataset:', (erro as Error)?.message);
    return null;
  }
}

export const prevencaoTool: ChatTool = {
  name: 'consultar_prevencao',
  description:
    'Lista as recomendações GERAIS de prevenção da USPSTF (rastreamentos e aconselhamentos) para a faixa de idade, sexo e IMC do perfil do usuário — as mesmas da tela de Prevenção —, com nota, ano e texto original em inglês. NÃO indica exame para a pessoa, NÃO diz se ela precisa fazer nem se está em dia, NÃO agenda e NÃO lê exames já feitos.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno) {
    const [perfil] = await lerDoDono(process.env.USER_PROFILE_TABLE_NAME, identity, contexto?.leituras);
    if (!perfil) return semDado(SEM_PERFIL);

    // `birthDate` e obrigatorio no schema, mas uma data invalida faria o
    // filtro calcular idade NaN -- e comparacao com NaN nao exclui ninguem: a
    // lista inteira sairia como se fosse a da pessoa.
    const birthDate = texto(perfil.birthDate);
    if (!birthDate || Number.isNaN(Date.parse(birthDate))) return semDado(SEM_NASCIMENTO);

    const dataset = await datasetOuNulo();
    if (!dataset) return semDado(FONTE_INDISPONIVEL);

    const sexo = texto(perfil.sex);
    const pesoKg = numero(perfil.weightKg);
    const alturaCm = numero(perfil.heightCm);

    const casam = filterRecommendations(dataset, {
      birthDate,
      sex: sexo,
      weightKg: pesoKg,
      heightCm: alturaCm,
    });
    if (casam.length === 0) return semDado(NADA_CASA);

    return montarSaida(dataset, casam, {
      idade: true,
      sexo: mapSex(sexo) !== undefined,
      imc: computeBmiBucket(pesoKg, alturaCm) !== undefined,
    });
  },
  /**
   * So nota, titulo e ano. O texto longo fica de fora porque o modo degradado
   * nao e gerado -- e montado --, e um texto em ingles colado na bolha seria
   * pior que nada; a tela de Prevencao continua sendo onde se le inteiro.
   */
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<SaidaPrevencao> | null;
    if (!saida?.disponivel || !saida.recomendacoes?.length) return null;
    return {
      titulo: 'Recomendações gerais de prevenção (USPSTF)',
      linhas: saida.recomendacoes.map((r) =>
        [rotuloDaNota(r.nota), r.titulo, r.ano].filter(Boolean).join(' · '),
      ),
      citacoes: [],
    };
  },
};
