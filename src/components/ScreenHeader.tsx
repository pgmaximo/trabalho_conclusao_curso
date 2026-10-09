import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/Badge';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeVariant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'neutral';
  action?: ReactNode;
  /**
   * Mostra o botão de voltar. Para as telas que NÃO são abas — as do hub Mais
   * (Agenda, Prevenção, Dados do smartwatch) e a memória do assistente —, que
   * são abertas por cima de outra tela e não tinham como voltar.
   */
  onBack?: () => void;
};

export function ScreenHeader({
  title,
  subtitle,
  badgeLabel,
  badgeVariant = 'primary',
  action,
  onBack,
}: ScreenHeaderProps) {
  // Com o voltar, o título divide a linha com dois controles. O subtítulo e o
  // selo descem para baixo da linha, com a largura toda, em vez de se
  // espremerem na coluna do título.
  if (onBack) {
    return (
      <View className="mb-6">
        <View className="flex-row items-center gap-3">
          <BackButton onPress={onBack} />
          <Text className="flex-1 text-2xl font-bold text-app-text dark:text-app-dark-text">{title}</Text>
          {action ? <View>{action}</View> : null}
        </View>
        {subtitle ? (
          <Text className="mt-3 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {subtitle}
          </Text>
        ) : null}
        {badgeLabel ? (
          <Badge label={badgeLabel} variant={badgeVariant} style={{ marginTop: 12 }} />
        ) : null}
      </View>
    );
  }

  // Só com o título, a ação fica centrada com ele (era assim o cabeçalho
  // escrito à mão de Remédios). Com subtítulo ou selo, ela acompanha o topo.
  const titleOnly = !subtitle && !badgeLabel;

  return (
    <View
      className={[
        'mb-6 flex-row justify-between gap-3',
        titleOnly ? 'items-center' : 'items-start',
      ].join(' ')}
    >
      <View className="flex-1">
        <Text className="text-2xl font-bold text-app-text dark:text-app-dark-text">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {subtitle}
          </Text>
        ) : null}
        {badgeLabel ? (
          <Badge label={badgeLabel} variant={badgeVariant} style={{ marginTop: 8 }} />
        ) : null}
      </View>
      {action ? <View className={titleOnly ? undefined : 'pt-1'}>{action}</View> : null}
    </View>
  );
}
