// =============================================================================
// Arquivo: DeleteConfirmPanel.tsx
// Descrição: Painel de confirmação de exclusão inline (nunca `Alert.alert`/`confirm()`
// nativo) — padrão "Confirmation/delete dialogs" documentado em
// specs/design/DESIGN_TOKENS.md §4: fundo vermelho `#FDECEA`, borda `#F3C9C5`, ícone "!"
// circular, texto padrão, botões Cancelar (outline)/Excluir (sólido vermelho) 52px.
// Primeiro consumidor: detalhe-documento (3c) — ver
// specs/03-exames-receitas/detalhe-documento/plan.md §4. Reaproveitável por
// telas futuras com o mesmo padrão de exclusão (ex.: 2e, 3g), evitando duplicar estilo
// (regra 3 da constituição: só introduzir componente novo quando preenche lacuna real).
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';

type DeleteConfirmPanelProps = {
  /** Mensagem principal do painel — default bate com o texto padrão do Canvas. */
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Bloqueia os dois botões e troca o rótulo de "Excluir" durante a chamada real. */
  isDeleting?: boolean;
  confirmLabel?: string;
  confirmingLabel?: string;
};

export function DeleteConfirmPanel({
  message = 'Tem certeza? Essa ação não pode ser desfeita.',
  onCancel,
  onConfirm,
  isDeleting = false,
  confirmLabel = 'Excluir',
  confirmingLabel = 'Excluindo…',
}: DeleteConfirmPanelProps) {
  return (
    <View
      accessibilityRole="alert"
      className="rounded-2xl border border-app-dangerBadgeBorder bg-app-dangerSoft p-4 dark:border-app-dark-dangerBadgeBorder dark:bg-app-dark-dangerSoft"
    >
      <View className="flex-row items-start gap-3">
        <View
          className="items-center justify-center rounded-full bg-app-danger dark:bg-app-dark-danger"
          style={{ height: 26, width: 26 }}
        >
          <Text className="text-sm font-bold text-white">!</Text>
        </View>
        <Text className="flex-1 text-[17px] leading-[24px] text-app-text dark:text-app-dark-text">
          {message}
        </Text>
      </View>

      <View className="mt-4 flex-row gap-[10px]">
        <Pressable
          accessibilityLabel="Cancelar exclusão"
          accessibilityRole="button"
          disabled={isDeleting}
          onPress={onCancel}
          style={({ pressed }) => [pressed && !isDeleting ? { opacity: 0.8 } : null]}
          className="h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-app-border dark:border-app-dark-border"
        >
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            Cancelar
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Confirmar exclusão"
          accessibilityRole="button"
          disabled={isDeleting}
          onPress={onConfirm}
          style={({ pressed }) => [
            isDeleting ? { opacity: 0.7 } : pressed ? { opacity: 0.88 } : null,
          ]}
          className="h-[52px] flex-1 items-center justify-center rounded-xl bg-app-danger dark:bg-app-dark-danger"
        >
          <Text className="text-[17px] font-semibold text-white">
            {isDeleting ? confirmingLabel : confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
