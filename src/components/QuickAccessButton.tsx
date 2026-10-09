// =============================================================================
// Arquivo: QuickAccessButton.tsx
// Descrição: Atalho do "Acesso rápido" do Início (grade 2×3).
// =============================================================================
//
// Cada atalho é um card inteiro tocável (bem acima dos 48dp dos tokens), com
// ícone em tile colorido + rótulo visível + uma linha de apoio. A cor do tile
// acompanha o tipo do destino, mas nunca é o único sinal: ícone e rótulo
// sempre dizem para onde o atalho leva.
//
// Os seis atalhos têm a MESMA anatomia e, por isso, a mesma altura: a linha de
// apoio é obrigatória. Quem chama passa um dado real que o Início já carregou
// (ex.: "Amanhã, 08:00") ou, sem ele, uma descrição neutra do destino (ex.:
// "Sua agenda"). Antes a linha era opcional, e a grade ficava com atalhos de
// alturas e alinhamentos diferentes.
//
// A linha foi escrita para caber em UMA linha: medido em 360dp, sobram 121dp
// para o texto (IBM Plex Sans 16px), uns 14 caracteres. `numberOfLines={2}`
// fica só como rede de segurança para quem usa fonte ampliada no sistema —
// ali o texto quebra em vez de ser cortado.
//
// Ver specs/00-fundacao/barra-de-navegacao/spec.md, D6, e
// specs/02-perfil-home-agenda/home-acesso-completo/spec.md, D1 e D8.
//
// =============================================================================

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useThemeColors, type ThemeColors } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type QuickAccessTone = 'primary' | 'secondary' | 'warning';

type QuickAccessButtonProps = {
  icon: IoniconName;
  label: string;
  /** Linha de apoio: dado real ou, sem ele, uma descrição neutra do destino. */
  detail: string;
  tone?: QuickAccessTone;
  onPress?: () => void;
};

// Mesmos pares do Canvas 2b: Agenda azul, Remédios verde, Prevenção âmbar.
const TILE_CLASS: Record<QuickAccessTone, string> = {
  primary: 'bg-app-primarySoft dark:bg-app-dark-primarySoft',
  secondary: 'bg-app-secondarySoft dark:bg-app-dark-secondarySoft',
  warning: 'bg-app-warningSoft dark:bg-app-dark-warningSoft',
};

function iconColor(tone: QuickAccessTone, colors: ThemeColors): string {
  if (tone === 'secondary') return colors.secondary;
  if (tone === 'warning') return colors.warning;
  return colors.primaryDark;
}

export function QuickAccessButton({ icon, label, detail, tone = 'primary', onPress }: QuickAccessButtonProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      // A linha de apoio entra no nome lido pelo leitor de tela, e não só na tela.
      accessibilityLabel={`${label}. ${detail}`}
      className="min-h-[96px] flex-1 rounded-field border border-app-border bg-app-surface p-3.5 dark:border-app-dark-border dark:bg-app-dark-surface"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className={`h-11 w-11 items-center justify-center rounded-xl ${TILE_CLASS[tone]}`}>
          <Ionicons color={iconColor(tone, colors)} name={icon} size={24} />
        </View>
        {/* Mesma seta das listas do app (exames, hub Mais): diz que o card abre algo. */}
        <Ionicons color={colors.iconMuted} name="chevron-forward" size={18} />
      </View>
      <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className="mt-0.5 text-[16px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary"
        numberOfLines={2}
      >
        {detail}
      </Text>
    </Pressable>
  );
}
