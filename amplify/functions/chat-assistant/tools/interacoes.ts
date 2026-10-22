/**
 * Resumo do arquivo:
 * `consultar_interacoes` (E9): responde "posso tomar esses remedios juntos?"
 * com os alertas da lista curada do aplicativo -- a mesma da tela de
 * Medicamentos (D9.1).
 *
 * E a unica ferramenta de dado pessoal com ENTRADA LIVRE (D9.2): a pergunta
 * real e sobre um remedio que a pessoa ainda nao cadastrou ("posso tomar
 * ibuprofeno?"). O risco e contido por tres coisas: o schema e `.strict()` e
 * tem teto de itens e de tamanho; o nome so vira chave de busca num modulo
 * local, sem I/O, sem gravacao e sem log; e o dono continua vindo so do token.
 *
 * O cuidado maior e de SAIDA: ausencia de alerta nao e seguranca. Quem cuida
 * disso e o `AVISO_DA_BASE` (em `interacoesSaida.ts`), a lista de nao
 * reconhecidos (D9.3), o padrao da R3 contra "pode tomar junto" (D9.4) e o
 * encaminhamento costurado (`TOOLS_CLINICAS`, em `verificacao.ts`).
 */
import { z } from 'zod';

import { DRUG_ALIASES } from '../../drug-interactions-shared/aliases';
import { resolveCanonicalDrug } from '../../drug-interactions-shared/normalizeDrugName';

import type { ChatIdentity } from '../auth';
import { dataEmSaoPaulo } from '../formatoPtBr';
import type { DegradedBlock, ContextoDoTurno } from '../types';
import {
  AVISO_DA_BASE,
  MAX_CANDIDATOS,
  MAX_CARACTERES_CANDIDATO,
  montarSaidaDasInteracoes,
  type SaidaDasInteracoes,
} from './interacoesSaida';
import { lerDoDono } from './ownerScopedRead';
import type { ChatTool } from './tipos';

/**
 * O que a lista nao reconheceu entra no modo degradado CONTADO, e nao por nome
 * (revisao do E9). Contado, porque sumir faria "dorflex" parecer verificado
 * (D9.3); sem o nome, porque ele pode ser texto livre do modelo, e este texto
 * nao passa pelas regras de linguagem.
 */
function linhaDosNaoVerificados(saida: Partial<SaidaDasInteracoes> | null): string[] {
  const n = (saida?.naoReconhecidos?.length ?? 0) + (saida?.naoReconhecidosOmitidos ?? 0);
  if (n === 0) return [];
  return [
    n === 1
      ? 'Não consegui verificar 1 nome, porque ele não está na lista do aplicativo.'
      : `Não consegui verificar ${n} nomes, porque eles não estão na lista do aplicativo.`,
  ];
}

/** Sem acento e em minusculas, para achar o nome na fala como ele foi dito. */
const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Os nomes da lista do aplicativo (os canonicos e os apelidos) que aparecem na
 * fala da pessoa, como palavra inteira (A7, DS8): "a medica passou
 * claritromicina, tem problema com a sinvastatina?" -- o modelo mandou so o
 * primeiro, e o par nao foi conferido. Lista fechada: nome fora dela nao entra
 * por aqui, e "aasmatica" nao e AAS.
 */
export function nomesDaListaNaFala(fala: string | undefined): string[] {
  if (!fala) return [];
  const alvo = semAcento(fala);
  return Object.entries(DRUG_ALIASES)
    .filter(([canonico, apelidos]) =>
      [canonico, ...apelidos].some((nome) =>
        new RegExp(`(?<![a-z0-9])${semAcento(nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`).test(alvo),
      ),
    )
    .map(([canonico]) => canonico);
}

/** Os do modelo primeiro; os da fala so quando ainda nao estao (pelo canonico). */
function juntarCandidatos(doModelo: string[], daFala: string[]): string[] {
  const jaTem = new Set(doModelo.map((n) => resolveCanonicalDrug(n) ?? semAcento(n)));
  return [...doModelo, ...daFala.filter((n) => !jaTem.has(n))];
}

const ENTRADA = z
  .object({
    candidatos: z.array(z.string().trim().min(1).max(MAX_CARACTERES_CANDIDATO)).max(MAX_CANDIDATOS).optional(),
  })
  .strict();

export const interacoesTool: ChatTool = {
  name: 'consultar_interacoes',
  description:
    'Confere se os medicamentos em uso que o usuário cadastrou, e os nomes que ele citar nesta conversa (em candidatos, até 5 nomes, só o nome, sem dose), aparecem juntos na lista curta de interações conhecidas do aplicativo. Devolve só os alertas dessa lista e os nomes que ela não reconhece. NÃO diz se pode tomar junto, NÃO garante que uma combinação é segura, NÃO sugere parar, trocar nem ajustar remédio, e NÃO conhece remédio fora da lista do aplicativo.',
  inputSchema: ENTRADA,
  readOnly: true,
  async run(input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno): Promise<SaidaDasInteracoes> {
    const { candidatos = [] } = input as z.infer<typeof ENTRADA>;
    const linhas = await lerDoDono(process.env.MEDICINE_TABLE_NAME, identity, contexto?.leituras);
    return montarSaidaDasInteracoes(
      linhas,
      juntarCandidatos(candidatos, nomesDaListaNaFala(contexto?.falaDaPessoa)),
      dataEmSaoPaulo(new Date()),
    );
  },
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<SaidaDasInteracoes> | null;
    const alertas = saida?.alertas ?? [];
    const mesmos = saida?.mesmoPrincipioAtivo ?? [];
    // Sem alerta e sem remedio repetido, NADA: um "nenhum alerta" em texto
    // fixo, sem o modelo para dizer que a lista e curta, e exatamente a leitura
    // de seguranca que este epico existe para evitar.
    if (alertas.length === 0 && mesmos.length === 0) return null;
    return {
      titulo: 'Alertas da lista de interações do aplicativo',
      linhas: [
        ...alertas.map((a) => `${a.medicamentos[0].nome} + ${a.medicamentos[1].nome}: alerta ${a.gravidade}. ${a.risco}`),
        ...mesmos.map(({ nomes }) => `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} são o mesmo remédio na lista do aplicativo.`),
        ...linhaDosNaoVerificados(saida),
        AVISO_DA_BASE,
      ],
      citacoes: [],
    };
  },
};
