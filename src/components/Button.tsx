// =============================================================================
// Arquivo: Button.tsx
// Descrição: Componente de botão customizado com múltiplas variantes
// Componente: Button
// =============================================================================
//
// Este componente implementa um botão reutilizável com suporte para diferentes
// variantes visuais, estados (pressed, disabled) e feedback visual. É o
// componente principal para ações do usuário em todo o aplicativo.
//
// Funcionalidades:
// - Variantes: primary (preenchido) e secondary (borda)
// - Estados: pressed, disabled com feedback visual adequado
// - Ripple effect no Android
// - Totalmente customizável via props
// - Acessibilidade herdada do Pressable
//
// Variantes Visuais:
// - Primary: Fundo colorido com texto branco e sombra
// - Secondary: Borda colorida com fundo transparente
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import {
  Pressable,                               // Componente base para interação
  Text,                                    // Componente para texto
  StyleSheet,                              // Sistema de estilos
  PressableProps,                          // Props do Pressable
  StyleProp,                               // Tipo para estilos
  ViewStyle,                               // Tipo para estilos de View
} from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';  // Configurações de tema

// Definição de props do componente Button
type ButtonProps = Omit<PressableProps, 'style'> & {  // Herda props do Pressable menos style
  title: string;                           // Texto do botão
  variant?: 'primary' | 'secondary';       // Variante visual (padrão: primary)
  style?: StyleProp<ViewStyle>;           // Estilo customizado adicional
};

// Componente Button principal
export function Button({ title, variant = 'primary', style, ...rest }: ButtonProps) {
  // Determina se é variante primary
  const isPrimary = variant === 'primary';
  
  // Verifica se botão está desabilitado
  const isDisabled = Boolean(rest.disabled);

  // Renderiza o botão com todos os estados e variantes
  return (
    <Pressable
      // Aplica estilos condicionais baseados no estado
      style={({ pressed }) => [
        styles.button,                     // Estilo base do botão
        isPrimary ? styles.primary : styles.secondary,  // Variante específica
        pressed && !isDisabled && styles.pressed,       // Estado pressionado
        isDisabled && styles.disabledButton,           // Estado desabilitado
        style,                            // Estilo customizado adicional
      ]}
      // Configura ripple effect para Android
      android_ripple={{ color: isPrimary ? COLORS.primaryDark : COLORS.background }}
      // Passa todas as outras props para o Pressable
      {...rest}
    >
      {/* Texto do botão com estilos condicionais */}
      <Text
        style={[
          styles.title,                    // Estilo base do texto
          isPrimary ? styles.primaryText : styles.secondaryText,  // Cor baseada na variante
          isDisabled && styles.disabledText,                // Cor quando desabilitado
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// Estilos do componente Button
const styles = StyleSheet.create({
  // Estilo base do botão
  button: {
    width: '100%',                   // Largura total do container
    paddingVertical: SIZES.base,     // Padding vertical
    borderRadius: SIZES.radius,      // Borda arredondada
    alignItems: 'center',           // Centraliza horizontalmente
    justifyContent: 'center',       // Centraliza verticalmente
    marginTop: SIZES.small,         // Margem superior
  },
  
  // Variante primary (preenchido)
  primary: {
    backgroundColor: COLORS.primary, // Fundo colorido
    shadowColor: COLORS.shadow,     // Cor da sombra
    shadowOffset: { width: 0, height: 8 }, // Offset da sombra
    shadowOpacity: 0.12,            // Opacidade da sombra
    shadowRadius: 18,               // Raio da sombra
    elevation: 4,                   // Elevação para Android
  },
  
  // Variante secondary (borda)
  secondary: {
    borderWidth: 1,                 // Largura da borda
    borderColor: COLORS.primary,     // Cor da borda
    backgroundColor: 'transparent',  // Fundo transparente
  },
  
  // Estilo base do texto do botão
  title: {
    ...FONTS.button,                // Usa fonte button do tema
  },
  
  // Texto da variante primary
  primaryText: {
    color: '#ffffff',               // Texto branco
  },
  
  // Texto da variante secondary
  secondaryText: {
    color: COLORS.primary,          // Texto com cor primária
  },
  
  // Botão quando desabilitado
  disabledButton: {
    backgroundColor: COLORS.border,  // Fundo cinza
    borderColor: COLORS.border,      // Borda cinza
    shadowOpacity: 0,                // Remove sombra
    elevation: 0,                   // Remove elevação
  },
  
  // Texto quando desabilitado
  disabledText: {
    color: COLORS.textMuted,        // Texto acinzentado
  },
  
  // Botão quando pressionado
  pressed: {
    opacity: 0.88,                  // Reduz opacidade para feedback
  },
});
