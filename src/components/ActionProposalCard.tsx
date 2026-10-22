import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  dataPorExtenso,
  type AcaoProposta,
  type CamposDeAgendamento,
} from '../../amplify/functions/acoes-propostas-shared/camposDaAcao';

/**
 * Resumo do arquivo:
 * O cartao da acao proposta pelo assistente (E11, D11.1 = A).
 *
 * ELE NAO SALVA NADA. O botao abre o formulario de sempre ja preenchido, e a
 * gravacao continua sendo o toque em Salvar la. Por isso o cartao diz "Nada
 * foi salvo ainda.": sem isso, um resumo com nome, data e hora parece um
 * compromisso marcado.
 *
 * O Canvas nao tem este cartao (ambiguidade registrada na spec do E11, secao
 * 5). Ele segue o `MemoryProposalCard`: abaixo da bolha, porque e pedido do
 * APLICATIVO e nao fala do assistente, e com os dois botoes do mesmo tamanho,
 * porque um botao grande ao lado de um link pequeno e escolha induzida.
 */

type ActionProposalCardProps = {
  acao: AcaoProposta;
  onAbrir: (acao: AcaoProposta) => void;
  onRecusar: () => void;
};

const NOME_DO_TIPO: Record<string, string> = { EXAME: 'Exame', CIRURGIA: 'Cirurgia' };

type Linha = { rotulo: string; valor: string };

function linhasDoCompromisso(c: CamposDeAgendamento): Linha[] {
  const linhas: (Linha | null)[] = [
    c.appointmentName ? { rotulo: 'Nome', valor: c.appointmentName } : null,
    c.appointmentType ? { rotulo: 'Tipo', valor: NOME_DO_TIPO[c.appointmentType] ?? c.appointmentType } : null,
    c.professionalName ? { rotulo: 'Profissional', valor: c.professionalName } : null,
    c.address ? { rotulo: 'Endereço', valor: c.address } : null,
    c.scheduledDate ? { rotulo: 'Data', valor: dataPorExtenso(c.scheduledDate) } : null,
    c.scheduledTime ? { rotulo: 'Hora', valor: c.scheduledTime } : null,
  ];
  return linhas.filter((l): l is Linha => l !== null);
}

/** O que falta, dito como o que a pessoa faz em seguida. */
function faltaNoCompromisso(c: CamposDeAgendamento): string | null {
  if (!c.scheduledDate && !c.scheduledTime) return 'Data e hora você escolhe no formulário.';
  if (!c.scheduledDate) return 'Data você escolhe no formulário.';
  if (!c.scheduledTime) return 'Hora você escolhe no formulário.';
  return null;
}

function conteudo(acao: AcaoProposta): { titulo: string; linhas: Linha[]; falta: string | null } {
  if (acao.tipo === 'ABRIR_NOVO_AGENDAMENTO') {
    return { titulo: 'Novo compromisso', linhas: linhasDoCompromisso(acao.campos), falta: faltaNoCompromisso(acao.campos) };
  }
  const { name, times } = acao.campos;
  const linhas: (Linha | null)[] = [
    name ? { rotulo: 'Nome', valor: name } : null,
    times?.length ? { rotulo: times.length > 1 ? 'Horários' : 'Horário', valor: times.join(', ') } : null,
  ];
  // A dose nunca vem do assistente (D11.3 = A), e o cartao diz isso como o
  // que a pessoa faz, sem explicar a regra.
  return {
    titulo: 'Novo lembrete de remédio',
    linhas: linhas.filter((l): l is Linha => l !== null),
    falta: 'Dose, frequência e estoque você completa no formulário.',
  };
}

export function ActionProposalCard({ acao, onAbrir, onRecusar }: ActionProposalCardProps) {
  const { titulo, linhas, falta } = conteudo(acao);
  // Trava de toque duplo (revisao do E11): dois toques antes de a tela
  // redesenhar abriam o formulario duas vezes. Ref, e nao estado, porque o
  // segundo toque chega antes do novo render.
  const jaAbriu = useRef(false);

  function abrir() {
    if (jaAbriu.current) return;
    jaAbriu.current = true;
    onAbrir(acao);
  }

  return (
    <View className="ml-11 mt-2 rounded-card border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface">
      <Text className="text-[13px] font-semibold text-app-text dark:text-app-dark-text">{titulo}</Text>

      <View className="mt-2 gap-1">
        {linhas.map((linha) => (
          <View key={linha.rotulo} className="flex-row gap-2">
            <Text className="w-[92px] text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {linha.rotulo}
            </Text>
            <Text className="flex-1 text-[14px] leading-[20px] text-app-text dark:text-app-dark-text">{linha.valor}</Text>
          </View>
        ))}
      </View>

      {falta ? (
        <Text className="mt-2 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {falta}
        </Text>
      ) : null}

      <Text className="mt-1 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
        Nada foi salvo ainda.
      </Text>

      {/* Mesma altura e mesma fracao da linha para os dois, como no cartao da
          memoria: recusar tem de ser tao facil quanto aceitar. */}
      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityLabel="Abrir formulário"
          accessibilityRole="button"
          onPress={abrir}
          className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Text className="text-[14px] font-semibold text-app-primary dark:text-app-dark-primary">Abrir formulário</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Agora não"
          accessibilityRole="button"
          onPress={onRecusar}
          className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-border bg-app-background dark:border-app-dark-border dark:bg-app-dark-background"
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">Agora não</Text>
        </Pressable>
      </View>
    </View>
  );
}
