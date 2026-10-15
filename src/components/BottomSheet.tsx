import React, { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FONTS, RADII, SPACING, useThemeColors } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({
  visible,
  title,
  description,
  onClose,
  children,
}: BottomSheetProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          <Text style={[FONTS.secao, { color: colors.text, marginBottom: SPACING.xs }]}>{title}</Text>
          {description ? (
            <Text style={[FONTS.corpo, { color: colors.textSecondary, marginBottom: SPACING.md }]}>
              {description}
            </Text>
          ) : null}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADII.card,
    borderTopRightRadius: RADII.card,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: RADII.pill,
    marginBottom: SPACING.md,
  },
  content: {
    gap: SPACING.sm,
  },
});
