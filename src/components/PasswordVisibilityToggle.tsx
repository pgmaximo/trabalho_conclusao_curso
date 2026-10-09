import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /**
   * O que o olho mostra, para o leitor de tela. Numa tela com dois campos de
   * senha, cada olho precisa dizer de qual campo é.
   */
  target?: string;
};

/**
 * O olho do campo de senha. Nasceu no Login; Cadastro e Recuperar senha tinham
 * campos de senha sem ele (specs/00-fundacao/consistencia-e-textos/spec.md, D6).
 *
 * Olho, e não a palavra "Mostrar": o texto não cabia na caixa em tela de
 * celular. O nome do botão fica no accessibilityLabel.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  disabled,
  target = 'senha',
}: PasswordVisibilityToggleProps) {
  const colors = useThemeColors();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      accessibilityLabel={`${visible ? 'Ocultar' : 'Mostrar'} ${target}`}
      accessibilityRole="button"
      className="size-11 items-center justify-center"
      disabled={disabled}
      hitSlop={4}
      onPress={onToggle}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      // `style` NÃO pode ser função aqui — sem `className`, o NativeWind
      // (jsxImportSource global) descarta o resultado da função e o Pressable
      // renderiza sem nenhum estilo.
      style={[isPressed && { opacity: 0.7 }]}
    >
      <MaterialIcons
        color={colors.secondary}
        name={visible ? 'visibility-off' : 'visibility'}
        size={22}
      />
    </Pressable>
  );
}
