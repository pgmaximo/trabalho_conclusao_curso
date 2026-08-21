/**
 * Resumo do arquivo:
 * Tela de chat conversacional com o assistente de IA (mock via aiAssistantService).
 * Banner de disclaimer fixo, drawer de historico, indicador de digitacao,
 * sugestoes rapidas e anexo de exame.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

import { HistoryDrawer } from '@/components/HistoryDrawer';
import { MessageBubble } from '@/components/MessageBubble';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useThemeColors } from '@/constants/theme';
import { useChatBot } from '@/hooks/useChatBot';
import type { ChatMessage } from '@/services/aiAssistantService';

const QUICK_PROMPTS = [
  'Analisar meu último exame',
  'O que significa colesterol alto?',
  'Lembrar de tomar remédio',
];

export function ChatBotScreen() {
  const colors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
    historyOpen,
    historyGroups,
    openHistory,
    closeHistory,
    newChat,
  } = useChatBot();

  const hasUserMessage = messages.some((message) => message.role === 'user');
  const canSend = inputText.trim().length > 0 && !isTyping;

  // ATTENTION: rola para a ultima mensagem sempre que o historico cresce ou a IA "digita"
  useEffect(() => {
    const timeout = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timeout);
  }, [messages.length, isTyping]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble type={item.role === 'user' ? 'user' : 'ai'} content={item.content} />
    ),
    [],
  );

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
            title="Assistente de IA"
            action={
              <Pressable
                accessibilityLabel="Histórico de conversas"
                accessibilityRole="button"
                className="size-12 items-center justify-center rounded-field border border-app-border dark:border-app-dark-border"
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                onPress={openHistory}
              >
                <Ionicons name="time-outline" size={22} color={colors.iconMuted} />
              </Pressable>
            }
          />
        </View>

        <View className="px-6">
          <View className="mb-4 flex-row items-start gap-3 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft">
            <View className="size-6 items-center justify-center rounded-full bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
              <Text className="text-[13px] font-bold text-white">i</Text>
            </View>
            <Text className="flex-1 text-[15px] leading-[20px] text-app-info dark:text-app-dark-info">
              Apoio informativo — não substitui avaliação médica.
            </Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          className="flex-1"
          contentContainerClassName="px-6 pb-4"
          data={messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isTyping ? <TypingIndicator /> : null}

              {!hasUserMessage ? (
                <View className="mt-2">
                  <Text className="text-[20px] font-semibold text-app-text dark:text-app-dark-text">
                    Como posso ajudar?
                  </Text>
                  <Text className="mb-4 mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Toque em uma sugestão ou digite sua pergunta.
                  </Text>
                  <View className="gap-3">
                    {QUICK_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt}
                        className="h-[52px] justify-center rounded-field border-[1.5px] border-app-border bg-app-surface px-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                        style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                        onPress={() => sendMessage(prompt)}
                      >
                        <Text className="text-[15px] text-app-text dark:text-app-dark-text">
                          {prompt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          }
        />

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
              placeholder="Digite sua pergunta..."
              placeholderTextColor={colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <Pressable
              accessibilityLabel="Enviar mensagem"
              accessibilityRole="button"
              className="size-10 items-center justify-center rounded-full bg-app-secondary dark:bg-app-dark-secondary"
              disabled={!canSend}
              style={canSend ? undefined : { opacity: 0.5 }}
              onPress={() => sendMessage()}
            >
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <HistoryDrawer
        groups={historyGroups}
        onClose={closeHistory}
        onNewChat={newChat}
        visible={historyOpen}
      />
    </SafeAreaView>
  );
}
