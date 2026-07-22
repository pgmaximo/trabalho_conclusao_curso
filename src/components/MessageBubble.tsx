import React from 'react';
import { Text, View } from 'react-native';

type MessageBubbleProps = {
  type: 'user' | 'ai';
  content: React.ReactNode;
};

export function MessageBubble({ type, content }: MessageBubbleProps) {
  const isUser = type === 'user';

  return (
    <View className={isUser ? 'mb-3 flex-row justify-end' : 'mb-3 flex-row justify-start'}>
      <View
        className={
          isUser
            ? 'max-w-[85%] rounded-app bg-app-primary px-4 py-3 dark:bg-app-dark-primary'
            : 'max-w-[85%] rounded-app border border-app-border bg-app-surface px-4 py-3 dark:border-app-dark-border dark:bg-app-dark-surface'
        }
      >
        {typeof content === 'string' ? (
          <Text
            className={
              isUser
                ? 'text-[15px] leading-[22px] text-app-onPrimary dark:text-app-dark-onPrimary'
                : 'text-[15px] leading-[22px] text-app-text dark:text-app-dark-text'
            }
          >
            {content}
          </Text>
        ) : (
          content
        )}
      </View>
    </View>
  );
}
