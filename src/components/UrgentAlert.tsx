import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface UrgentAlertProps {
  title: string;
  description: string;
  actionLabel: string;
  onActionPress?: () => void;
}

export function UrgentAlert({
  title,
  description,
  actionLabel,
  onActionPress,
}: UrgentAlertProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onActionPress}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#A93D3D',
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  icon: {
    fontSize: 18,
    marginRight: SIZES.small,
  },
  title: {
    ...FONTS.body,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  description: {
    ...FONTS.caption,
    color: '#fff',
    marginBottom: SIZES.base,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#8B2E2E',
    borderRadius: 6,
    paddingVertical: SIZES.small,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...FONTS.body,
    color: '#fff',
    fontWeight: '600',
  },
});
