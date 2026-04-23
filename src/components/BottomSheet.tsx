import React, { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, FONTS, RADII, SPACING } from '@/constants/theme';

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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
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
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.borderStrong,
    marginBottom: SPACING.md,
  },
  title: {
    ...FONTS.heading,
    marginBottom: SPACING.xs,
  },
  description: {
    ...FONTS.body,
    marginBottom: SPACING.md,
  },
  content: {
    gap: SPACING.sm,
  },
});
