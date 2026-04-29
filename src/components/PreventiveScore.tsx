import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface PreventiveScoreProps {
  score: number;
  maxScore?: number;
  status: string;
}

export function PreventiveScore({
  score,
  maxScore = 100,
  status,
}: PreventiveScoreProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Pontuação preventiva</Text>
          <Text style={styles.score}>
            {score} / {maxScore} pontos — <Text style={styles.status}>{status}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              backgroundColor: COLORS.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0F7F4',
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SIZES.base,
    marginBottom: SIZES.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  score: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  status: {
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#C8E6E1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
