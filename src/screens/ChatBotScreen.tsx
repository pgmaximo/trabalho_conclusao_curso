/**
 * Resumo do arquivo:
 * Tela de chat conversacional com o assistente de saude (mock via chatService).
 * Historico rolavel, indicador de digitacao, prompts rapidos e anexo de exame.
 */
import React, { useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'nativewind';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';

import { MessageBubble } from '@/components/MessageBubble';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useThemeColors } from '@/constants/theme';
import { useChatBot } from '@/hooks/useChatBot';

const QUICK_PROMPTS = [
  'O que significa este exame?',
  'Qual médico devo procurar?',
  'Meus resultados estão normais?',
  'Como interpretar hemograma?',
];

export function ChatBotScreen() {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const scrollRef = useRef<ScrollView>(null);
  const { messages, inputText, setInputText, isTyping, sendMessage, clearHistory } = useChatBot();

  const hasUserMessage = messages.some((message) => message.role === 'user');
  const canSend = inputText.trim().length > 0 && !isTyping;

  // ATTENTION: rola para a ultima mensagem sempre que o historico cresce ou a IA "digita"
  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timeout);
  }, [messages.length, isTyping]);

  async function handleAttach() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        router.push({
          pathname: '/add-exam',
          params: {
            fileName: asset.name,
            filePath: asset.uri,
            fileSize: asset.size || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Erro ao selecionar o documento. Tente novamente.');
    }
  }

  return (
    <SafeAreaView
      className="flex-1 bg-app-background dark:bg-app-dark-background"
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-6 pt-6">
          <ScreenHeader
            title="Assistente de Saúde"
            subtitle="Tire dúvidas sobre seus exames e cuidados de prevenção."
            action={
              hasUserMessage ? (
                <Pressable
                  accessibilityLabel="Limpar conversa"
                  accessibilityRole="button"
                  className="h-10 w-10 items-center justify-center rounded-full bg-app-surface dark:bg-app-dark-surface"
                  style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                  onPress={clearHistory}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.iconMuted} />
                </Pressable>
              ) : null
            }
          />
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-6 pb-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              type={message.role === 'user' ? 'user' : 'ai'}
              content={message.content}
            />
          ))}

          {isTyping ? (
            <View className="mb-3 flex-row justify-start">
              <View className="rounded-app border border-app-border bg-app-surface px-4 py-3 dark:border-app-dark-border dark:bg-app-dark-surface">
                <Text className="text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  Digitando...
                </Text>
              </View>
            </View>
          ) : null}

          {!hasUserMessage ? (
            <View className="mt-2">
              <Text className="mb-2 text-[13px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
                Sugestões para começar
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt}
                    className="rounded-app border border-app-border bg-app-surface px-3 py-2 dark:border-app-dark-border dark:bg-app-dark-surface"
                    style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                    onPress={() => sendMessage(prompt)}
                  >
                    <Text className="text-[14px] text-app-text dark:text-app-dark-text">{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-app-border bg-app-surface px-4 py-3 dark:border-app-dark-border dark:bg-app-dark-surface">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityLabel="Anexar exame"
              accessibilityRole="button"
              onPress={handleAttach}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="attach-outline" size={24} color={colors.iconMuted} />
            </Pressable>
            <TextInput
              className="max-h-24 flex-1 rounded-app bg-app-inputBackground px-4 py-3 text-[15px] text-app-text dark:bg-app-dark-inputBackground dark:text-app-dark-text"
              placeholder="Pergunte sobre seus exames..."
              placeholderTextColor={colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <Pressable
              accessibilityLabel="Enviar mensagem"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full bg-app-secondary dark:bg-app-dark-secondary"
              disabled={!canSend}
              style={canSend ? undefined : { opacity: 0.5 }}
              onPress={() => sendMessage()}
            >
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
