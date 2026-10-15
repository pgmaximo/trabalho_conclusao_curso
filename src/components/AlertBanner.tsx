// =============================================================================
// Arquivo: AlertBanner.tsx
// Descrição: Componente de banner para alertas informativos com múltiplos tipos
// Componente: AlertBanner
// =============================================================================
//
// Este componente implementa um banner de alerta para exibir mensagens importantes
// ao usuário com diferentes tipos visuais (warning, info, success, danger), ícone
// e cores temáticas. É usado para comunicar informações relevantes.
//
// Funcionalidades:
// - Ícone do tipo de alerta, na cor do alerta
// - Título e mensagem descritiva
// - Cores temáticas baseadas no tipo de alerta
// - Layout horizontal otimizado
// - Design acessível e legível
//
// Tipos de Alerta (cores via useThemeColors(), reativas a dark mode):
// - warning: Âmbar - Alertas de atenção
// - success: Verde - Sucesso e confirmação
// - info: Azul - Informações gerais
// - danger: Vermelho - Alertas críticos (ex.: interação medicamentosa grave)
//
// =============================================================================

// Importações necessárias
import React from 'react';                    // Biblioteca principal React
import { View, Text, StyleSheet } from 'react-native';  // Componentes UI
import Ionicons from '@expo/vector-icons/Ionicons';

// Importações de tema
import { FONTS, SIZES, useThemeColors } from '@/constants/theme';  // Configurações

export type AlertType = 'warning' | 'info' | 'success' | 'danger';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// O ícone de cada tipo. O desenho muda com o tipo, como nos selos de status
// (`Badge`): triângulo para perigo, exclamação para atenção. Assim a gravidade
// de um aviso não depende só da cor.
//
// Era um emoji passado por quem chamava. Emoji é desenhado por cada fabricante
// de celular do seu jeito e não segue o tema: o aviso de interação de Remédios
// tinha o mesmo triângulo amarelo no claro e no escuro, na interação grave e na
// leve (specs/00-fundacao/correcoes-menores/spec.md, D5).
export const ALERT_ICON: Record<AlertType, IoniconName> = {
  warning: 'alert-circle',
  danger: 'warning',
  success: 'checkmark-circle',
  info: 'information-circle',
};

// Props do componente AlertBanner
type AlertBannerProps = {
  title: string;                   // Título do alerta
  message: string;                 // Mensagem descritiva
  type?: AlertType;                // Tipo de alerta (padrão: info)
  icon?: IoniconName;              // Troca o ícone do tipo por outro (nome de um Ionicon)
};

// Componente AlertBanner principal
export function AlertBanner({
  title,                   // Título
  message,                 // Mensagem
  type = 'info',           // Tipo de alerta (padrão: info)
  icon,                    // Ícone (padrão: o do tipo)
}: AlertBannerProps) {
  const colors = useThemeColors();

  // Define cores baseadas no tipo de alerta — tokens reativos a dark mode
  // (mesmas famílias semânticas de Badge.tsx: success/warning/danger/info)
  const backgroundColor =
    type === 'warning' ? colors.warningSoft :
    type === 'success' ? colors.successSoft :
    type === 'danger' ? colors.dangerSoft :
    colors.infoSoft;

  const borderColor =
    type === 'warning' ? colors.warningBadgeBorder :
    type === 'success' ? colors.successBadgeBorder :
    type === 'danger' ? colors.dangerBadgeBorder :
    colors.infoBadgeBorder;

  const textColor =
    type === 'warning' ? colors.warning :
    type === 'success' ? colors.success :
    type === 'danger' ? colors.danger :
    colors.info;

  // Renderiza o banner de alerta
  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Ícone do alerta, na cor do texto do alerta */}
      <Ionicons color={textColor} name={icon ?? ALERT_ICON[type]} size={20} style={styles.icon} />

      {/* Área de conteúdo com título e mensagem */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      </View>
    </View>
  );
}

// Estilos do componente AlertBanner
const styles = StyleSheet.create({
  // Container principal do banner
  container: {
    borderWidth: 1,                 // Largura da borda
    borderRadius: SIZES.radius,      // Borda arredondada
    padding: SIZES.base,           // Padding interno
    marginBottom: SIZES.base,       // Margem inferior para espaçamento
    flexDirection: 'row',           // Layout horizontal
    alignItems: 'flex-start',       // Alinha no topo
  },

  // Estilo do ícone
  icon: {
    marginRight: SIZES.small,       // Margem à direita
    marginTop: 2,                   // Pequeno ajuste de alinhamento
  },

  // Área de conteúdo com título e mensagem
  content: {
    flex: 1,                        // Ocupa espaço disponível
  },

  // Estilo do título do alerta
  title: {
    ...FONTS.body,                  // Usa fonte body do tema
    fontWeight: '600',              // Peso semi-negrito
    marginBottom: 4,                // Pequeno espaço abaixo
  },

  // Estilo da mensagem do alerta
  message: {
    ...FONTS.caption,               // Usa fonte caption do tema
    lineHeight: 18,                 // Altura da linha para legibilidade
  },
});
