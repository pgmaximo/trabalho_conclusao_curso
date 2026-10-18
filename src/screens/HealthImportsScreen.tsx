/**
 * Resumo do arquivo:
 * "Suas importações" — todas as importações de dados do smartwatch da pessoa,
 * cada uma com a própria análise. Daqui ela escolhe qual análise abrir no
 * painel (HealthDashboardScreen) e exclui uma importação específica.
 * Puramente apresentacional: a lista e a exclusão vivem em useHealthImports,
 * chamado pela rota (src/app/(app)/health-imports.tsx).
 *
 * Abre por cima do painel, por isso usa o DetailHeader.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { DetailHeader } from '@/components/DetailHeader';
import { EmptyState } from '@/components/EmptyState';
import { InlineError } from '@/components/InlineError';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import { canDeleteHealthImport } from '@/services/healthImportService';
import type { HealthImport, HealthImportSourceHint } from '@/types/healthInsights';
import { formatImportLabel, formatImportPeriod } from '@/utils/healthImportDisplay';

type HealthImportsScreenProps = {
  imports: HealthImport[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onBack: () => void;
  onImportPress: () => void;
  /** Abre a análise desta importação no painel. */
  onOpenImport: (importId: string) => void;
  /** Exclui a importação. Um erro lançado aqui aparece na linha dela, junto do botão. */
  onDeleteImport: (importId: string) => Promise<void>;
};

// Os nomes que a tela de importação já usa para os dois apps de origem.
const SOURCE_LABEL: Partial<Record<HealthImportSourceHint, string>> = {
  SAMSUNG_HEALTH: 'Samsung Health',
  APPLE_HEALTH: 'iPhone (Saúde)',
};

function filesLine(healthImport: HealthImport): string {
  const [first, ...rest] = healthImport.fileNames;
  const files = !first
    ? ''
    : rest.length === 0
      ? first
      : `${first} e mais ${rest.length} ${rest.length === 1 ? 'arquivo' : 'arquivos'}`;
  const source = healthImport.sourceHint ? SOURCE_LABEL[healthImport.sourceHint] : undefined;
  return [source, files].filter(Boolean).join(' · ');
}

type StatusView = {
  badge: string;
  variant: 'success' | 'info' | 'warning' | 'danger';
  detail: string;
};

function statusView(healthImport: HealthImport, deletable: boolean): StatusView {
  switch (healthImport.status) {
    case 'READY': {
      const period = formatImportPeriod(healthImport.periodStart, healthImport.periodEnd);
      const days = healthImport.dayCount ? ` · ${healthImport.dayCount} dias` : '';
      return { badge: 'Pronta', variant: 'success', detail: period ? `${period}${days}` : 'Análise pronta' };
    }
    case 'FAILED':
      return {
        badge: 'Falhou',
        variant: 'danger',
        detail: healthImport.errorMessage ?? 'Não foi possível concluir a análise.',
      };
    default:
      // Em andamento e já excluível = passou do prazo em que a análise
      // terminaria (canDeleteHealthImport). Dizer "em análise" aqui seria
      // prometer um resultado que não vem mais.
      return deletable
        ? {
            badge: 'Sem resposta',
            variant: 'warning',
            detail: 'A análise parou de responder. Exclua e importe os arquivos de novo.',
          }
        : { badge: 'Em análise', variant: 'info', detail: 'Lendo seus dados e analisando padrões…' };
  }
}

export function HealthImportsScreen({
  imports,
  isLoading,
  errorMessage,
  onRetry,
  onBack,
  onImportPress,
  onOpenImport,
  onDeleteImport,
}: HealthImportsScreenProps) {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background" edges={['top']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-32 pt-6" showsVerticalScrollIndicator={false}>
        <DetailHeader onBack={onBack} title="Suas importações" />

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={errorMessage}
            icon="alert-circle-outline"
            onActionPress={onRetry}
            title="Não foi possível carregar suas importações"
            tone="error"
          />
        ) : imports.length === 0 ? (
          <EmptyState
            actionLabel="Importar dados"
            description={
              'Exporte os dados do Samsung Health (ou de um app como Health Auto Export, no iPhone) e importe aqui para receber uma análise.'
            }
            icon="watch-outline"
            onActionPress={onImportPress}
            title="Nenhum dado importado ainda"
          />
        ) : (
          <>
            <Text className="mb-4 text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Cada envio tem a própria análise. Toque em uma importação para ver a análise dela.
            </Text>

            <View className="mb-5">
              <Button onPress={onImportPress} title="Importar novos dados" variant="secondary" />
            </View>

            {imports.map((healthImport) => (
              <ImportRow
                healthImport={healthImport}
                key={healthImport.id}
                onDelete={() => onDeleteImport(healthImport.id)}
                onOpen={() => onOpenImport(healthImport.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ImportRowProps = {
  healthImport: HealthImport;
  onOpen: () => void;
  onDelete: () => Promise<void>;
};

function ImportRow({ healthImport, onOpen, onDelete }: ImportRowProps) {
  const colors = useThemeColors();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const label = formatImportLabel(healthImport.createdAt);
  const deletable = canDeleteHealthImport(healthImport);
  const status = statusView(healthImport, deletable);
  const files = filesLine(healthImport);

  async function confirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // Deu certo: a linha sai da lista (useHealthImports), e este componente
      // desmonta junto. Não há estado para limpar.
      await onDelete();
    } catch {
      setDeleteError('Não foi possível excluir a importação. Tente novamente.');
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  }

  return (
    <View className="mb-3 rounded-card border border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface">
      {/* Abrir e excluir são dois botões irmãos, e não um dentro do outro: um
          Pressable dentro de outro vira um elemento só para o leitor de tela,
          e o de excluir ficava inalcançável. A lixeira fica no canto de baixo,
          por cima do card, para o título ter a largura inteira — numa coluna
          ao lado, ele quebrava em duas linhas já em 390dp. */}
      <View>
        <Pressable
          accessibilityHint="Abre a análise desta importação"
          accessibilityLabel={`${label}, ${status.badge}`}
          accessibilityRole="button"
          className="p-4"
          onPress={onOpen}
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">{label}</Text>
          <Badge label={status.badge} style={{ alignSelf: 'flex-start', marginTop: 8 }} variant={status.variant} />
          <Text
            className={`mt-2 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary ${deletable ? 'pr-10' : ''}`}
            numberOfLines={3}
          >
            {status.detail}
          </Text>
          {files ? (
            <Text
              className={`mt-1 text-[12px] text-app-textMuted dark:text-app-dark-textMuted ${deletable ? 'pr-10' : ''}`}
              numberOfLines={1}
            >
              {files}
            </Text>
          ) : null}
        </Pressable>

        {deletable ? (
          <Pressable
            accessibilityLabel={`Excluir a ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
            accessibilityRole="button"
            className="absolute bottom-2 right-2 size-11 items-center justify-center rounded-xl"
            disabled={isDeleting}
            onPress={() => {
              setDeleteError(null);
              setIsConfirmingDelete(true);
            }}
          >
            <Ionicons color={colors.iconMuted} name="trash-outline" size={18} />
          </Pressable>
        ) : null}
      </View>

      {deleteError ? (
        <View className="px-4 pb-2">
          <InlineError message={deleteError} />
        </View>
      ) : null}

      {/* DECISION (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D4):
          ação destrutiva sempre passa pelo painel de confirmação do app. */}
      {isConfirmingDelete ? (
        <View className="px-4 pb-4">
          <DeleteConfirmPanel
            isDeleting={isDeleting}
            message="Excluir esta importação? A análise e os arquivos enviados somem de vez."
            onCancel={() => setIsConfirmingDelete(false)}
            onConfirm={() => void confirmDelete()}
          />
        </View>
      ) : null}
    </View>
  );
}
