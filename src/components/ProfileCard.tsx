import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface ProfileCardProps {
  name: string;
  email: string;
  initials: string;
  completionPercentage: number;
}

export function ProfileCard({
  name,
  email,
  initials,
  completionPercentage,
}: ProfileCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      <View style={styles.completionContainer}>
        <Text style={styles.completionLabel}>
          Perfil {completionPercentage}% completo
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${completionPercentage}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C8E6E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.base,
  },
  avatarText: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  email: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  completionContainer: {
    marginTop: SIZES.base,
  },
  completionLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.small,
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
