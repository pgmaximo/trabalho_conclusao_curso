import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type ActionButtonRowProps = {
  actions: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }>;
};

export function ActionButtonRow({ actions }: ActionButtonRowProps) {
  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <Pressable
          key={index}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={action.onPress}
        >
          <Text style={styles.icon}>{action.icon}</Text>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SIZES.base,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.base,
    marginHorizontal: SIZES.small,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 24,
    marginBottom: SIZES.small,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
