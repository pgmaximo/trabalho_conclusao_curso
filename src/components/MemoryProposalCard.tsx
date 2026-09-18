import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors } from '@/constants/theme';
import type { ResultadoDaGravacao } from '@/services/assistantMemoryService';
import type { PropostaConfirmada } from '@/services/assistantMemoryService';

/**
 * Resumo do arquivo:
 * O pedido de consentimento da memória (D34, M8).
 *
 * ELE FICA ABAIXO DA BOLHA, e nunca dentro dela. É um pedido do APLICATIVO, e
 * não texto do assistente; confundir os dois faria a pessoa achar que o modelo
 * está falando quando ele está pedindo, e o consentimento do art. 11, I precisa
 * ser destacado justamente para não se confundir com o resto.
 *
 * O TEXTO MOSTRADO É O TEXTO GRAVADO. Não há resumo, não há reescrita, não há
 * "algo parecido com". Mostrar uma coisa e guardar outra é a forma mais
 * silenciosa de esvaziar um consentimento.
 */

type Estado = 'perguntando' | 'guardado' | 'cheia';

/**
 * A pessoa atingiu um limite que NÓS escolhemos. A mensagem diz o que fazer, e
 * não que ela guardou coisa demais.
 */
export const MENSAGEM_CHEIA =
  'Sua memória está cheia. Você pode apagar algo que não usa mais e tentar de novo.';

type MemoryProposalCardProps = {
  proposta: PropostaConfirmada;
  /** Grava. Devolve o resultado para o cartão saber se deu certo. */
  onConfirmar: (proposta: PropostaConfirmada) => Promise<ResultadoDaGravacao | void>;
  onRecusar: () => void;
  onVerMemoria: () => void;
};

export function MemoryProposalCard({
  proposta,
  onConfirmar,
  onRecusar,
  onVerMemoria,
}: MemoryProposalCardProps) {
  const colors = useThemeColors();
  const [estado, setEstado] = useState<Estado>('perguntando');
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    setGuardando(true);
    try {
      const resultado = await onConfirmar(proposta);
      setEstado(resultado && resultado.ok === false && resultado.motivo === 'cheia' ? 'cheia' : 'guardado');
    } finally {
      setGuardando(false);
    }
  }

  if (estado !== 'perguntando') {
    return (
      <View className="ml-11 mt-2 flex-row items-center gap-2">
        <Ionicons
          name={estado === 'guardado' ? 'checkmark-circle-outline' : 'information-circle-outline'}
          size={16}
          color={colors.iconMuted}
        />
        <Text className="flex-1 text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {estado === 'guardado' ? 'Guardado.' : MENSAGEM_CHEIA}
        </Text>
        <Pressable
          accessibilityLabel="Ver o que eu lembro"
          accessibilityRole="button"
          onPress={onVerMemoria}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        >
          <Text className="text-[13px] font-semibold text-app-primary dark:text-app-dark-primary">
            Ver o que eu lembro
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="ml-11 mt-2 rounded-card border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface">
      <Text className="text-[13px] font-semibold text-app-text dark:text-app-dark-text">
        Quer que eu lembre disso?
      </Text>

      {/* O texto exato, entre aspas, para ficar claro que é uma citação do que
          a pessoa disse -- e não uma frase que o aplicativo escreveu sobre ela. */}
      <Text className="mt-1 text-[14px] leading-[20px] text-app-text dark:text-app-dark-text">
        “{proposta.texto}”
      </Text>

      {/* Os dois botões têm a MESMA altura e os dois ocupam a mesma fração da
          linha. Um botão grande ao lado de um link pequeno é consentimento
          induzido, e o art. 18, VIII fala do direito de não consentir. */}
      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityLabel="Lembrar disso"
          accessibilityRole="button"
          disabled={guardando}
          onPress={() => void confirmar()}
          className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Text className="text-[14px] font-semibold text-app-primary dark:text-app-dark-primary">
            Lembrar
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Agora não"
          accessibilityRole="button"
          disabled={guardando}
          onPress={onRecusar}
          className="h-11 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-border bg-app-background dark:border-app-dark-border dark:bg-app-dark-background"
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">
            Agora não
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
