import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { HtmlText } from '@/components/HtmlText';
import { useThemeColors } from '@/constants/theme';
import type { UspstfGrade } from '@/types/models';

type RecommendationCardProps = {
  grade: UspstfGrade;
  gradeText: string;
  title: string;
  text: string;
  citation: string;
  isReminderOn: boolean;
  onToggleReminder: () => void;
  reminderDisabled?: boolean;
};

const GRADE_BADGE_VARIANT: Record<UspstfGrade, 'success' | 'accent' | 'danger' | 'neutral'> = {
  A: 'success',
  B: 'success',
  C: 'accent',
  D: 'danger',
  I: 'neutral',
};

// Explicacao em portugues do que cada grau da USPSTF significa de forma geral.
// Texto proprio do app (nao e traducao do gradeText especifico retornado pela
// API) — descreve o sistema de classificacao publico da USPSTF com nossas
// palavras, sem reproduzir/adaptar o texto especifico com direitos autorais.
const GRADE_EXPLAINER_PT: Record<UspstfGrade, string> = {
  A: 'Grau A: forte indicação de que os benefícios superam claramente os riscos.',
  B: 'Grau B: indicação de que os benefícios superam os riscos.',
  C: 'Grau C: benefício considerado pequeno para a maioria das pessoas; vale conversar com seu médico.',
  D: 'Grau D: especialistas recomendam não realizar rotineiramente — os riscos superam os benefícios conhecidos.',
  I: 'Grau I: ainda não há evidências suficientes para avaliar os benefícios e riscos.',
};

// title/text sao verbatim da USPSTF (ingles, nao traduzir) por exigencia de
// direitos autorais da AHRQ. Apenas o texto ao redor (badge, rodape) e app-authored.
export function RecommendationCard({
  grade,
  gradeText,
  title,
  text,
  citation,
  isReminderOn,
  onToggleReminder,
  reminderDisabled,
}: RecommendationCardProps) {
  const colors = useThemeColors();

  return (
    <Card variant="surface" padding="regular" style={{ marginBottom: 12 }}>
      <View className="mb-2 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Badge label={`Grau ${grade}`} variant={GRADE_BADGE_VARIANT[grade]} />
          <Text className="mt-2 text-base font-bold text-app-text dark:text-app-dark-text">
            {title}
          </Text>
        </View>
        <Pressable onPress={onToggleReminder} disabled={reminderDisabled} hitSlop={8} className="mt-1">
          <Ionicons
            name={isReminderOn ? 'notifications' : 'notifications-outline'}
            size={24}
            color={isReminderOn ? colors.primary : colors.iconMuted}
          />
        </Pressable>
      </View>

      <Text className="mb-1 text-[13px] font-semibold text-app-text dark:text-app-dark-text">
        {GRADE_EXPLAINER_PT[grade]}
      </Text>

      <Text className="mb-2 text-[13px] italic text-app-textMuted dark:text-app-dark-textMuted">
        {gradeText}
      </Text>

      <HtmlText html={text} />

      <Text className="mt-3 text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
        Fonte: U.S. Preventive Services Task Force ({citation}) · texto oficial mantido em inglês,
        conforme exigido pelos termos de direitos autorais da AHRQ
      </Text>
    </Card>
  );
}
