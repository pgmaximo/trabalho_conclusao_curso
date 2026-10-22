/**
 * Resumo do arquivo:
 * Os medicamentos que a pessoa cadastrou. Ela devolve o que ESTA REGISTRADO,
 * literalmente: nome, dose como foi digitada, horarios, periodo e, desde o E2,
 * frequencia, forma, unidade, estoque e observacoes.
 *
 * O CUIDADO DESTA TOOL E DE SAIDA, NAO DE ENTRADA. Devolver posologia ao
 * modelo e legitimo -- e o dado da pessoa, e ela pode perguntar por ele. O que
 * nao pode e a RESPOSTA indicar quantidade, dose ou mudanca, e quem barra isso
 * e a verificacao de linguagem da C5, sobre o texto gerado. Esconder o dado
 * aqui nao protegeria nada e faria o aplicativo mentir sobre o que ele guarda.
 *
 * Decisoes do E2 (`specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E2-medicamentos-completos.md`):
 * - D2.1: o estoque e o REGISTRADO, e `estoqueBaixo` usa a regra do app. Nada
 *   de "dias restantes": a dose e texto livre, e o cadastro nao diz quantas
 *   unidades vao por tomada.
 * - D2.2: a observacao vai ao modelo, com teto, e o prompt a trata como dado.
 * - D2.3: "tomado hoje" NAO sai daqui. `takenToday` e o campo antigo, so do
 *   dia, e o historico de doses (E3) e a fonte unica disso.
 * - D2.4: o gancho `valoresCadastrados` diz a verificacao quais valores esta
 *   tool devolveu, para a R3 deixar passar o valor cadastrado.
 *
 * A montagem da saida mora em `medicamentosSaida.ts`, pura, como a de
 * `prevencaoSaida.ts`: aqui fica so o que fala com o banco e com o chat.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import type { DegradedBlock, ContextoDoTurno } from '../types';
import { montarSaida, valoresCadastradosDosMedicamentos, type SaidaDosMedicamentos } from './medicamentosSaida';
import { lerDoDono } from './ownerScopedRead';
import type { ChatTool } from './tipos';

export const medicamentosTool: ChatTool = {
  name: 'consultar_medicamentos',
  description:
    'Lista os medicamentos que o próprio usuário cadastrou no aplicativo, exatamente como ele os registrou: nome, dose digitada, horários, período, frequência, forma, estoque registrado e observações. NÃO prescreve, NÃO sugere dose, NÃO altera cadastro, NÃO diz se um medicamento é adequado e NÃO diz se a dose foi tomada.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity, contexto?: ContextoDoTurno): Promise<SaidaDosMedicamentos> {
    return montarSaida(await lerDoDono(process.env.MEDICINE_TABLE_NAME, identity, contexto?.leituras));
  },
  valoresCadastrados: valoresCadastradosDosMedicamentos,
  renderDegraded(output: unknown): DegradedBlock | null {
    const saida = output as Partial<SaidaDosMedicamentos> | null;
    if (!saida?.emUso?.length) return null;
    // O que passou do teto e CONTADO tambem aqui (H11): sem a linha, a lista
    // fixa pareceria completa. "medicamentos" nao e unidade da R3.
    const omitidos = typeof saida.omitidos === 'number' && saida.omitidos > 0 ? saida.omitidos : 0;
    const linhaDosOmitidos = omitidos
      ? [`E mais ${omitidos} ${omitidos === 1 ? 'medicamento' : 'medicamentos'} na tela de Medicamentos.`]
      : [];
    return {
      titulo: 'Medicamentos que você cadastrou',
      // A dose cadastrada fica de FORA do modo degradado, e isto e a
      // diferenca entre as duas superficies: a tool pode devolve-la ao
      // modelo, porque e o dado da pessoa, mas o texto de modelo fixo precisa
      // passar as regras POR CONSTRUCAO -- e "500 mg" numa linha de texto e
      // exatamente o que a R3 reprova, sem ter como saber que ali e um
      // cadastro e nao uma indicacao. Quem quer ver a dose abre a tela de
      // medicamentos, que e a tela dela. Pelo mesmo motivo o estoque entra
      // como "estoque baixo", sem o numero (E2).
      linhas: [
        ...saida.emUso
          .map((m) =>
            [m.nome, m.horarios.join(', '), m.estoqueBaixo ? 'estoque baixo' : null]
              .filter((p): p is string => Boolean(p))
              .join(' · '),
          )
          .filter((l) => l !== ''),
        ...linhaDosOmitidos,
      ],
      citacoes: [],
    };
  },
};
