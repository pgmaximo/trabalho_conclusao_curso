import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type QuickAccessButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
};

export function QuickAccessButton({ icon, label, onPress }: QuickAccessButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.small,
    paddingVertical: SIZES.base,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.small,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
