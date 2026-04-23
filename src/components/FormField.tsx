// =============================================================================
// Arquivo: FormField.tsx
// Descrição: Componente de campo de formulário com label, ícone e validação
// Componente: FormField
// =============================================================================
//
// Este componente implementa um campo de formulário completo com suporte para
// label, ícone, texto de ajuda e mensagens de erro. É o componente principal
// para entrada de dados em formulários do aplicativo.
//
// Funcionalidades:
// - Label descritivo acima do campo
// - Ícone opcional dentro do campo
// - Texto de ajuda ou mensagem de erro
// - Estados visuais (normal, erro, foco)
// - Totalmente acessível
// - Herda todas as props do TextInput
//
// Estados Visuais:
// - Normal: borda cinza, fundo claro
// - Erro: borda vermelha, fundo avermelhado
// - Foco: gerenciado pelo TextInput automaticamente
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import {
  StyleProp,                               // Tipo para estilos
  StyleSheet,                              // Sistema de estilos
  Text,                                    // Componente para texto
  TextInput,                               // Componente base para input
  TextInputProps,                          // Props do TextInput
  View,                                    // Componente container
  ViewStyle,                               // Tipo para estilos de View
} from 'react-native';

// Importações de tema
import { COLORS, FONTS, RADII, SPACING } from '@/constants/theme';  // Configurações

// Props do componente FormField
type FormFieldProps = TextInputProps & {  // Herda props do TextInput
  label: string;                           // Texto do label acima do campo
  icon?: string;                           // Ícone opcional dentro do campo
  helperText?: string;                     // Texto de ajuda opcional
  errorMessage?: string;                   // Mensagem de erro opcional
  containerStyle?: StyleProp<ViewStyle>;  // Estilo customizado do container
};

// Componente FormField principal
export function FormField({
  label,              // Label do campo
  icon,               // Ícone opcional
  helperText,         // Texto de ajuda
  errorMessage,       // Mensagem de erro
  containerStyle,     // Estilo do container
  style,              // Estilo do input
  ...rest             // Outras props do TextInput
}: FormFieldProps) {
  // Verifica se há erro para aplicar estilos condicionais
  const hasError = Boolean(errorMessage);

  // Renderiza o campo de formulário completo
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label descritivo acima do campo */}
      <Text style={styles.label}>{label}</Text>
      
      {/* Container do input com ícone e campo de texto */}
      <View
        style={[
          styles.inputWrapper,           // Estilo base do container
          // Aplica estilo de erro ou normal baseado na validação
          hasError ? styles.inputWrapperError : styles.inputWrapperDefault,
        ]}
      >
        {/* Ícone opcional dentro do campo */}
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        
        {/* Campo de texto principal */}
        <TextInput
          accessibilityLabel={label}      // Label para acessibilidade
          placeholderTextColor={COLORS.placeholder}  // Cor do placeholder
          style={[styles.input, style]}   // Estilo do input + customizado
          {...rest}                       // Passa outras props do TextInput
        />
      </View>
      
      {/* Mensagem de erro - exibida apenas se houver erro */}
      {hasError ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      
      {/* Texto de ajuda - exibido apenas se não houver erro */}
      {!hasError && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

// Estilos do componente FormField
const styles = StyleSheet.create({
  // Container principal do campo de formulário
  container: {
    marginTop: SPACING.md,           // Margem superior para espaçamento
  },
  
  // Estilo do label acima do campo
  label: {
    ...FONTS.body,                   // Usa fonte body do tema
    color: COLORS.text,              // Cor principal do texto
    marginBottom: SPACING.xs,        // Pequeno espaço abaixo do label
  },
  
  // Container do input (inclui ícone e campo de texto)
  inputWrapper: {
    flexDirection: 'row',            // Layout horizontal para ícone + input
    alignItems: 'center',            // Centraliza verticalmente
    borderRadius: RADII.md,          // Borda arredondada média
    borderWidth: 1,                  // Largura da borda
    paddingHorizontal: SPACING.md,   // Padding horizontal
    paddingVertical: 14,             // Padding vertical fixo
    backgroundColor: COLORS.inputBackground,  // Fundo do campo
  },
  
  // Estilo normal do container (sem erro)
  inputWrapperDefault: {
    borderColor: COLORS.border,       // Borda cinza normal
  },
  
  // Estilo de erro do container
  inputWrapperError: {
    borderColor: COLORS.danger,      // Borda vermelha para erro
    backgroundColor: COLORS.dangerSoft, // Fundo avermelhado suave
  },
  
  // Estilo do ícone dentro do campo
  icon: {
    marginRight: SPACING.sm,         // Espaço à direita do ícone
    fontSize: 16,                    // Tamanho do ícone
    color: COLORS.placeholder,        // Cor acinzentada para ícone
  },
  
  // Estilo do campo de texto principal
  input: {
    ...FONTS.body,                   // Usa fonte body do tema
    flex: 1,                         // Ocupa espaço disponível
    color: COLORS.text,              // Cor do texto digitado
    minHeight: 20,                    // Altura mínima para acessibilidade
  },
  
  // Estilo do texto de ajuda
  helperText: {
    ...FONTS.caption,                // Usa fonte caption do tema
    marginTop: SPACING.xs,           // Espaço acima do campo
  },
  
  // Estilo da mensagem de erro
  errorText: {
    ...FONTS.caption,                // Usa fonte caption do tema
    color: COLORS.danger,            // Cor vermelha para erro
    marginTop: SPACING.xs,           // Espaço acima do campo
  },
});
