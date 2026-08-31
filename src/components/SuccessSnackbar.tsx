// =============================================================================
// Arquivo: SuccessSnackbar.tsx
// Descricao: Snackbar/toast de sucesso reutilizavel — padrao "Sucesso" do
// "Standard 4-state pattern" documentado em specs/design/DESIGN_TOKENS.md §4:
// fundo verde-escuro #0C6341, circulo branco com "check", texto branco,
// ancorado no rodape, auto-dismiss em ~4s. Usado em Login (Bloco 1) e
// reaproveitado por Cadastro/Confirmacao/Recuperar senha.
// =============================================================================

import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

type SuccessSnackbarProps = {
  /** Mensagem exibida ao lado do "check". */
  message: string;
  /** Controla a visibilidade do snackbar. */
  visible: boolean;
  /** Chamado quando o tempo de exibicao (`durationMs`) se esgota. */
  onHide?: () => void;
  /** Duracao antes do auto-dismiss, em ms. Default: 4000 (4s, conforme design). */
  durationMs?: number;
};

// Cor fixa do token de sucesso (DESIGN_TOKENS.md §1/§4) — igual em claro e
// escuro no Canvas (1b e 1f), por isso não vem de `useThemeColors()`.
const SUCCESS_BG = '#0C6341';

export function SuccessSnackbar({
  message,
  visible,
  onHide,
  durationMs = 4000,
}: SuccessSnackbarProps) {
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onHideRef.current?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, durationMs]);

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      className="absolute inset-x-4 bottom-6 z-50 flex-row items-center gap-3 rounded-field p-4"
      pointerEvents="none"
      style={{ backgroundColor: SUCCESS_BG }}
      testID="success-snackbar"
    >
      <View
        className="items-center justify-center rounded-full bg-white"
        style={{ height: 28, width: 28 }}
      >
        <Text className="text-[17px] font-semibold" style={{ color: SUCCESS_BG }}>
          ✓
        </Text>
      </View>
      <Text className="flex-1 text-[17px] font-semibold leading-[23px] text-white">
        {message}
      </Text>
    </View>
  );
}
