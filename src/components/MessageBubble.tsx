import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type MessageBubbleProps = {
  type: 'user' | 'ai';
  content: React.ReactNode;
};

export function MessageBubble({ type, content }: MessageBubbleProps) {
  const isUser = type === 'user';
  const backgroundColor = isUser ? COLORS.primary : '#E8E0F5';
  const textColor = isUser ? '#fff' : '#5B3B8F';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, { backgroundColor }]}>
        {typeof content === 'string' ? (
          <Text style={[styles.text, { color: textColor }]}>{content}</Text>
        ) : (
          <View style={styles.contentContainer}>{content}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.base,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.small,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  text: {
    ...FONTS.body,
    lineHeight: 22,
  },
  contentContainer: {
    gap: 0,
  },
});
