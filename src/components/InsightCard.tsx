import React from 'react';
import { Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import type { InsightConfidence, InsightEffort, InsightSeverity } from '@/types/healthInsights';

type AttentionPointProps = {
  kind: 'attention';
  titulo: string;
  descricao: string;
  severidade: InsightSeverity;
};

type PatternProps = {
  kind: 'pattern';
  titulo: string;
  descricao: string;
  evidencia: string;
  confianca: InsightConfidence;
};

type SuggestionProps = {
  kind: 'suggestion';
  titulo: string;
  acao: string;
  porque: string;
  esforco: InsightEffort;
};

export type InsightCardProps = AttentionPointProps | PatternProps | SuggestionProps;

const SEVERITY_BADGE: Record<InsightSeverity, { label: string; variant: 'info' | 'warning' }> = {
  informativo: { label: 'Informativo', variant: 'info' },
  atencao: { label: 'Atenção', variant: 'warning' },
};

const CONFIDENCE_BADGE: Record<InsightConfidence, { label: string; variant: 'neutral' | 'info' | 'success' }> = {
  baixa: { label: 'Confiança baixa', variant: 'neutral' },
  media: { label: 'Confiança média', variant: 'info' },
  alta: { label: 'Confiança alta', variant: 'success' },
};

const EFFORT_BADGE: Record<InsightEffort, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  baixo: { label: 'Esforço baixo', variant: 'success' },
  medio: { label: 'Esforço médio', variant: 'warning' },
  alto: { label: 'Esforço alto', variant: 'danger' },
};

/** Card de ponto de atenção, padrão identificado, ou sugestão — mesmo layout, badge diferente por tipo. */
export function InsightCard(props: InsightCardProps) {
  const badge =
    props.kind === 'attention'
      ? SEVERITY_BADGE[props.severidade]
      : props.kind === 'pattern'
        ? CONFIDENCE_BADGE[props.confianca]
        : EFFORT_BADGE[props.esforco];

  return (
    <Card padding="regular" style={{ marginBottom: 12 }}>
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-[16px] font-semibold text-app-text dark:text-app-dark-text">{props.titulo}</Text>
        <Badge label={badge.label} variant={badge.variant} />
      </View>

      {props.kind === 'attention' ? (
        <Text className="text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {props.descricao}
        </Text>
      ) : null}

      {props.kind === 'pattern' ? (
        <>
          <Text className="mb-2 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {props.descricao}
          </Text>
          <Text className="text-[12px] text-app-textMuted dark:text-app-dark-textMuted">Evidência: {props.evidencia}</Text>
        </>
      ) : null}

      {props.kind === 'suggestion' ? (
        <>
          <Text className="mb-1 text-[14px] font-medium text-app-text dark:text-app-dark-text">{props.acao}</Text>
          <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">{props.porque}</Text>
        </>
      ) : null}
    </Card>
  );
}
