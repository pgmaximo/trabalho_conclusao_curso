import React, { ReactNode } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';

type CardVariant = 'surface' | 'soft' | 'outlined' | 'accent';
type CardPadding = 'compact' | 'regular' | 'spacious';

type CardProps = ViewProps & {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
};

// Padding alinhado ao Canvas 1a (DESIGN_TOKENS.md §4 "Cards"): 14px item de
// lista, 18px card de formulário, 22px bloco de referência.
const PADDING_CLASS: Record<CardPadding, string> = {
  compact: 'p-[14px]',
  regular: 'p-[18px]',
  spacious: 'p-[22px]',
};

const VARIANT_CLASS: Record<CardVariant, string> = {
  surface:
    'bg-app-surface border-app-border dark:bg-app-dark-surface dark:border-app-dark-border',
  soft: 'bg-app-primarySoft border-app-primarySoft dark:bg-app-dark-primarySoft dark:border-app-dark-primarySoft',
  outlined:
    'bg-app-surface border-app-borderStrong dark:bg-app-dark-surface dark:border-app-dark-borderStrong',
  accent:
    'bg-app-accentSoft border-app-accentSoft dark:bg-app-dark-accentSoft dark:border-app-dark-accentSoft',
};

export function Card({
  children,
  variant = 'surface',
  padding = 'regular',
  style,
  ...rest
}: CardProps) {
  return (
    <View
      className={`rounded-card border ${VARIANT_CLASS[variant]} ${PADDING_CLASS[padding]}`}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );
}
