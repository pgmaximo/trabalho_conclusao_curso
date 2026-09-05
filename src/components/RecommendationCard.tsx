import React, { useState } from 'react';
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
  gradeTextPt?: string | null;
  title: string;
  titlePt?: string | null;
  text: string;
  textPt?: string | null;
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

/**
 * Exibe uma recomendacao da USPSTF. Quando ha traducao disponivel (campos *Pt),
 * o portugues aparece primeiro, rotulado como adaptacao, e o texto oficial em
 * ingles continua acessivel na integra pelo botao "Ver texto original".
 * O aviso de direitos autorais da AHRQ permite adaptacoes desde que acompanhadas
 * de um disclaimer e sem sugerir endosso da AHRQ/USPSTF — dai o rodape.
 * Sem traducao (falha ou cota esgotada), caimos para o ingles verbatim.
 */
export function RecommendationCard({
  grade,
  gradeText,
  gradeTextPt,
  title,
  titlePt,
  text,
  textPt,
  citation,
  isReminderOn,
  onToggleReminder,
  reminderDisabled,
}: RecommendationCardProps) {
  const colors = useThemeColors();
  const [showOriginal, setShowOriginal] = useState(false);

  // So consideramos "traduzido" quando o texto principal mudou de fato — o
  // fallback do backend devolve o proprio ingles, e nesse caso nao faz sentido
  // rotular como adaptacao nem oferecer o toggle para o "original".
  const hasTranslation = Boolean(textPt && textPt !== text);

  const displayTitle = (hasTranslation && titlePt) || title;
  const displayGradeText = (hasTranslation && gradeTextPt) || gradeText;
  const displayText = (hasTranslation && textPt) || text;

  return (
    <Card variant="surface" padding="regular" style={{ marginBottom: 12 }}>
      <View className="mb-2 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={`Grau ${grade}`} variant={GRADE_BADGE_VARIANT[grade]} />
            {hasTranslation ? <Badge label="Tradução adaptada" variant="neutral" /> : null}
          </View>
          <Text className="mt-2 text-base font-bold text-app-text dark:text-app-dark-text">
            {displayTitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isReminderOn ? 'Desativar lembrete' : 'Ativar lembrete'}
          onPress={onToggleReminder}
          disabled={reminderDisabled}
          hitSlop={8}
          className="mt-1"
        >
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
        {displayGradeText}
      </Text>

      <HtmlText html={displayText} />

      {hasTranslation ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showOriginal }}
            accessibilityLabel={
              showOriginal ? 'Ocultar texto original em inglês' : 'Ver texto original em inglês'
            }
            onPress={() => setShowOriginal((current) => !current)}
            hitSlop={8}
            className="mt-3 flex-row items-center gap-1"
          >
            <Ionicons
              name={showOriginal ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
            <Text className="text-[13px] font-bold text-app-primary dark:text-app-dark-primary">
              {showOriginal ? 'Ocultar texto original' : 'Ver texto original em inglês'}
            </Text>
          </Pressable>

          {showOriginal ? (
            <View className="mt-2 rounded-app border border-app-border bg-app-surfaceMuted px-3 py-3 dark:border-app-dark-border dark:bg-app-dark-surfaceMuted">
              <Text className="mb-2 text-[12px] font-bold uppercase tracking-wide text-app-textMuted dark:text-app-dark-textMuted">
                Texto oficial (inglês)
              </Text>
              <Text className="mb-1 text-[15px] font-bold text-app-text dark:text-app-dark-text">
                {title}
              </Text>
              <Text className="mb-2 text-[13px] italic text-app-textMuted dark:text-app-dark-textMuted">
                {gradeText}
              </Text>
              <HtmlText html={text} />
            </View>
          ) : null}
        </>
      ) : null}

      <Text className="mt-3 text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
        {hasTranslation
          ? `Fonte: U.S. Preventive Services Task Force (${citation}). Tradução não-oficial, adaptada do inglês pelo SuaSaúde — a USPSTF e a AHRQ não revisaram nem endossam esta adaptação. Em caso de dúvida, consulte o texto original acima.`
          : `Fonte: U.S. Preventive Services Task Force (${citation}) · texto oficial mantido em inglês, conforme exigido pelos termos de direitos autorais da AHRQ`}
      </Text>
    </Card>
  );
}
