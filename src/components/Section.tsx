import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { COLORS, FONTS, SPACING } from '@/constants/theme';

type SectionProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, subtitle, action, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  copy: {
    flex: 1,
  },
  title: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  subtitle: {
    ...FONTS.caption,
    marginTop: SPACING.xs,
  },
});
