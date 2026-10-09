/**
 * Resumo do arquivo:
 * Dashboard de insights de saúde (dados de wearables + análise por IA).
 * Puramente apresentacional — toda busca de dado e polling vive na rota
 * (src/app/(app)/health-data.tsx) e nos hooks useHealthImportStatus /
 * useHealthDashboardData. Cobre os 5 estados do plan.md §5.4: nunca
 * importou, PENDING/PROCESSING, travado (>6min), FAILED, READY.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AiDisclaimerBanner } from '@/components/AiDisclaimerBanner';
import { Badge } from '@/components/Badge';
import { BarChart, type BarChartPoint } from '@/components/charts/BarChart';
import { CorrelationRow } from '@/components/charts/CorrelationRow';
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { LineChart, type LineChartSeries } from '@/components/charts/LineChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { EmptyState } from '@/components/EmptyState';
import { InlineError } from '@/components/InlineError';
import { InsightCard } from '@/components/InsightCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type { HealthImport, MetricId, MetricSummary } from '@/types/healthInsights';
import { formatarValorDeMetrica, nomeDoModelo } from '@/utils/metricDisplay';

type HealthDashboardScreenProps = {
  healthImport: HealthImport | null;
  isLoading: boolean;
  errorMessage: string | null;
  isTimedOut: boolean;
  onRetry: () => void;
  onImportPress: () => void;
  /** Volta para a tela de onde esta foi aberta (o Início ou o hub Mais). */
  onBack?: () => void;
  /** Exclui a importação. Um erro lançado aqui aparece na tela, junto do botão. */
  onDeleteImport?: () => void | Promise<void>;
};

const PRIMARY_COLOR = '#10794E';
const SECONDARY_COLOR = '#1B63C4';

function formatMetricValue(metric: MetricSummary): string {
  return formatarValorDeMetrica(metric.mean ?? metric.median ?? metric.max, metric.unit);
}

function formatPeriod(periodStart: string | null, periodEnd: string | null): string {
  if (!periodStart || !periodEnd) return '';
  const format = (d: string) => {
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  };
  return `${format(periodStart)} a ${format(periodEnd)}`;
}

function processingStepLabel(status: HealthImport['status']): string {
  return status === 'PENDING' ? 'Preparando seus arquivos…' : 'Lendo seus dados e analisando padrões…';
}

export function HealthDashboardScreen({
  healthImport,
  isLoading,
  errorMessage,
  isTimedOut,
  onRetry,
  onImportPress,
  onBack,
  onDeleteImport,
}: HealthDashboardScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [warningsExpanded, setWarningsExpanded] = useState(false);

  const status = healthImport?.status;

  // DECISION (specs/02-perfil-home-agenda/home-acesso-completo/spec.md, D4):
  // quem já tem uma análise pronta importa de novo por aqui. Antes, esta tela
  // só oferecia a importação vazia ou com falha, e o único outro caminho era
  // Perfil > Configurações. Nos demais estados a ação não aparece: vazio e
  // falha já têm o próprio botão, e não se importa por cima de uma análise em
  // andamento.
  const canImportAgain = !isLoading && !errorMessage && status === 'READY';

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background" edges={['top']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-32 pt-6" showsVerticalScrollIndicator={false}>
        <ScreenHeader
          onBack={onBack}
          title="Dados do smartwatch"
          subtitle="Insights sobre sono, passos e batimentos, gerados a partir dos seus próprios dados."
          action={
            canImportAgain ? (
              <Pressable
                accessibilityLabel="Importar novos dados do smartwatch"
                accessibilityRole="button"
                className="h-12 flex-row items-center gap-2 rounded-field border border-app-border px-3 dark:border-app-dark-border"
                onPress={onImportPress}
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
              >
                <Ionicons color={colors.iconMuted} name="cloud-upload-outline" size={18} />
                <Text className="text-[14px] text-app-text dark:text-app-dark-text">Importar</Text>
              </Pressable>
            ) : undefined
          }
        />

        <AiDisclaimerBanner />

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={errorMessage}
            icon="alert-circle-outline"
            onActionPress={onRetry}
            title="Não foi possível carregar seus dados"
            tone="error"
          />
        ) : !healthImport ? (
          <EmptyState
            actionLabel="Importar dados"
            description={
              'Exporte os dados do Samsung Health (ou de um app como Health Auto Export, no iPhone) e importe aqui para receber uma análise.'
            }
            icon="watch-outline"
            onActionPress={onImportPress}
            title="Nenhum dado importado ainda"
          />
        ) : status === 'PENDING' || status === 'PROCESSING' ? (
          isTimedOut ? (
            <EmptyState
              actionLabel="Tentar novamente"
              description="A análise demorou mais que o esperado. Tente novamente — se o problema persistir, tente com menos arquivos."
              icon="time-outline"
              onActionPress={onRetry}
              title="A análise está demorando"
              tone="error"
            />
          ) : (
            <>
              <ScreenSkeleton blocks={3} />
              <Text className="mt-4 text-center text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                {processingStepLabel(status)}
              </Text>
            </>
          )
        ) : status === 'FAILED' ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={healthImport.errorMessage ?? 'Não foi possível concluir a análise.'}
            icon="alert-circle-outline"
            onActionPress={onImportPress}
            title="Não foi possível analisar os dados"
            tone="error"
          />
        ) : (
          <ReadyDashboard colors={colors} healthImport={healthImport} onDeleteImport={onDeleteImport} warningsExpanded={warningsExpanded} setWarningsExpanded={setWarningsExpanded} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ReadyDashboardProps = {
  healthImport: HealthImport;
  colors: ReturnType<typeof useThemeColors>;
  warningsExpanded: boolean;
  setWarningsExpanded: (value: boolean) => void;
  onDeleteImport?: () => void | Promise<void>;
};

function ReadyDashboard({ healthImport, colors, warningsExpanded, setWarningsExpanded, onDeleteImport }: ReadyDashboardProps) {
  const summary = healthImport.summary;
  const insights = healthImport.insights;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteImport?.();
    } catch {
      // A análise continua na tela. Antes a falha só ia para o console, e a
      // pessoa ficava sem saber se a importação tinha sido apagada.
      setDeleteError('Não foi possível excluir a importação. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  }

  if (!summary || !insights) {
    return (
      <EmptyState
        description="A análise foi concluída, mas o resultado não pôde ser lido. Tente importar novamente."
        icon="alert-circle-outline"
        title="Resultado indisponível"
        tone="error"
      />
    );
  }

  // O nome de cada métrica, como a própria análise o escreve. As correlações
  // chegam com o identificador interno ("steps", "sleepMinutes"), que era
  // mostrado cru na tela.
  const metricLabel = (id: MetricId) => summary.metrics.find((m) => m.metric === id)?.label ?? null;
  const modelName = nomeDoModelo(healthImport.modelId);

  const stepsMetric = summary.metrics.find((m) => m.metric === 'steps');
  const stepsBarPoints: BarChartPoint[] = (stepsMetric?.monthly ?? []).map((point) => ({
    dateKey: `${point.month}-01`,
    segments: point.mean !== null ? [{ id: 'steps', value: point.mean, color: PRIMARY_COLOR }] : [],
  }));

  const sleepMetric = summary.metrics.find((m) => m.metric === 'sleepMinutes');
  const lineSeries: LineChartSeries[] = [];
  if (sleepMetric) {
    lineSeries.push({
      id: 'sleep',
      label: sleepMetric.label,
      color: SECONDARY_COLOR,
      points: sleepMetric.monthly.map((p) => ({ dateKey: `${p.month}-01`, value: p.mean })),
      showDots: true,
    });
  }

  return (
    <>
      <Section subtitle={`Cobertura média: ${averageCoverage(summary.metrics)}%`} title="Período analisado">
        {/* `flex-wrap`: em telas de 360dp os dois selos não cabem lado a lado, e
            o segundo saía cortado pela borda da tela. */}
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={formatPeriod(summary.periodStart, summary.periodEnd)} variant="secondary" />
          <Badge label={`${summary.dayCount} dias`} variant="neutral" />
        </View>
      </Section>

      <Section subtitle="Números = média diária do período · gráfico = tendência mensal" title="Métricas">
        <View className="flex-row flex-wrap gap-2">
          {summary.metrics.map((metric) => (
            <View className="min-w-[47%] flex-1" key={metric.metric}>
              <View className="rounded-app border border-app-border bg-app-surface p-3 dark:border-app-dark-border dark:bg-app-dark-surface">
                <Text className="text-[12px] uppercase tracking-wide text-app-textSecondary dark:text-app-dark-textSecondary">
                  {metric.label}
                </Text>
                <Text className="mb-1 mt-1 text-[18px] font-bold text-app-text dark:text-app-dark-text">
                  {formatMetricValue(metric)}
                </Text>
                <Text className="mb-1.5 text-[10px] text-app-textMuted dark:text-app-dark-textMuted">
                  média diária
                </Text>
                <Sparkline
                  accessibilityLabel={`Tendência mensal de ${metric.label}, de ${metric.firstSeen} a ${metric.lastSeen}`}
                  color={colors.primary}
                  height={28}
                  points={metric.monthly.map((p) => ({ dateKey: `${p.month}-01`, value: p.mean }))}
                  width={110}
                />
                <Text className="mt-1 text-[11px] text-app-textMuted dark:text-app-dark-textMuted">
                  cobertura de {metric.coveragePct}% dos dias
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Resumo">
        <Text className="text-[15px] leading-[22px] text-app-text dark:text-app-dark-text">{insights.resumo}</Text>
      </Section>

      {insights.destaques.length > 0 ? (
        <Section title="Destaques">
          {insights.destaques.map((destaque, index) => (
            <View className="mb-2 flex-row items-start gap-2" key={index}>
              <Ionicons
                color={destaque.tom === 'positivo' ? colors.success : destaque.tom === 'atencao' ? colors.warning : colors.iconMuted}
                name={destaque.tom === 'positivo' ? 'trending-up' : destaque.tom === 'atencao' ? 'alert-circle' : 'ellipse'}
                size={18}
              />
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-app-text dark:text-app-dark-text">
                  {destaque.metrica}: {destaque.valor}
                </Text>
                <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  {destaque.comparacao}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {stepsBarPoints.some((p) => p.segments.length > 0) ? (
        <Section subtitle="Média mensal" title="Passos">
          <BarChart
            accessibilityLabel={`Passos por mês, de ${summary.periodStart} a ${summary.periodEnd}`}
            emptyMessage="Sem dados suficientes de passos para exibir o gráfico."
            height={140}
            points={stepsBarPoints}
            yUnit="passos/dia (média mensal)"
          />
        </Section>
      ) : null}

      {lineSeries.length > 0 ? (
        <Section subtitle="Média mensal" title="Sono">
          <LineChart
            accessibilityLabel="Duração média mensal do sono, em minutos"
            emptyMessage="Sem dados suficientes de sono para exibir o gráfico."
            height={140}
            series={lineSeries}
            yUnit="minutos/noite (média mensal)"
          />
        </Section>
      ) : null}

      {insights.pontosDeAtencao.length > 0 ? (
        <Section title="Pontos de atenção">
          {insights.pontosDeAtencao.map((item, index) => (
            <InsightCard descricao={item.descricao} kind="attention" key={index} severidade={item.severidade} titulo={item.titulo} />
          ))}
        </Section>
      ) : null}

      {insights.padroes.length > 0 || summary.correlations.length > 0 ? (
        <Section subtitle="Narrados pela IA a partir de correlações já calculadas estatisticamente" title="Padrões encontrados">
          {insights.padroes.map((item, index) => (
            <InsightCard
              confianca={item.confianca}
              descricao={item.descricao}
              evidencia={item.evidencia}
              key={index}
              kind="pattern"
              titulo={item.titulo}
            />
          ))}

          {summary.correlations.length > 0 ? (
            <View className="mt-2">
              <Text className="mb-2 text-[13px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
                Evidência estatística
              </Text>
              {summary.correlations.map((correlation, index) => {
                const labelA = metricLabel(correlation.metricA);
                const labelB = metricLabel(correlation.metricB);

                // Sem o nome das duas métricas, o título é a própria descrição da
                // correlação — nunca o identificador interno.
                return labelA && labelB ? (
                  <CorrelationRow
                    interpretation={correlation.label}
                    key={index}
                    n={correlation.n}
                    r={correlation.r}
                    title={`${labelA} × ${labelB}`}
                  />
                ) : (
                  <CorrelationRow key={index} n={correlation.n} r={correlation.r} title={correlation.label} />
                );
              })}
            </View>
          ) : null}
        </Section>
      ) : null}

      {insights.sugestoes.length > 0 ? (
        <Section title="Sugestões">
          {insights.sugestoes.map((item, index) => (
            <InsightCard acao={item.acao} esforco={item.esforco} key={index} kind="suggestion" porque={item.porque} titulo={item.titulo} />
          ))}
        </Section>
      ) : null}

      {insights.perguntasParaOMedico.length > 0 ? (
        <Section subtitle="Leve estas perguntas para sua próxima consulta" title="Perguntas para o médico">
          {insights.perguntasParaOMedico.map((pergunta, index) => (
            <View className="mb-2 flex-row items-start gap-2" key={index}>
              <Ionicons color={colors.iconMuted} name="help-circle-outline" size={18} />
              <Text className="flex-1 text-[14px] text-app-text dark:text-app-dark-text">{pergunta}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      <Text className="mb-6 text-[13px] italic text-app-textMuted dark:text-app-dark-textMuted">
        {insights.limitacoes}
      </Text>

      {healthImport.warnings.length > 0 ? (
        <View className="mb-6">
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-app border border-app-border bg-app-surfaceMuted p-3 dark:border-app-dark-border dark:bg-app-dark-surfaceMuted"
            onPress={() => setWarningsExpanded(!warningsExpanded)}
          >
            <Text className="text-[14px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
              O que não conseguimos ler ({healthImport.warnings.length})
            </Text>
            <Ionicons color={colors.iconMuted} name={warningsExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </Pressable>
          {warningsExpanded ? (
            <View className="mt-2 gap-1.5">
              {healthImport.warnings.map((warning, index) => (
                <Text className="text-[13px] text-app-textMuted dark:text-app-dark-textMuted" key={index}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
          {modelName ? `Análise gerada por IA (${modelName})` : 'Análise gerada por IA'} em{' '}
          {formatDateTime(healthImport.analyzedAt)}
        </Text>
      </View>

      {/* DECISION (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D4): o
          toque excluía na hora. Ação destrutiva sempre passa pelo painel de
          confirmação do app (DESIGN_TOKENS.md §4). */}
      {onDeleteImport ? (
        <View className="mt-4">
          {deleteError ? <InlineError message={deleteError} /> : null}
          {isConfirmingDelete ? (
            <DeleteConfirmPanel
              isDeleting={isDeleting}
              message="Excluir esta importação? A análise e os arquivos enviados somem de vez."
              onCancel={() => setIsConfirmingDelete(false)}
              onConfirm={() => void confirmDelete()}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              className="min-h-12 items-center justify-center"
              onPress={() => {
                setDeleteError(null);
                setIsConfirmingDelete(true);
              }}
            >
              <Text className="text-[13px] font-semibold text-app-danger dark:text-app-dark-danger">
                Excluir esta importação
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </>
  );
}

function averageCoverage(metrics: MetricSummary[]): number {
  if (metrics.length === 0) return 0;
  const total = metrics.reduce((sum, m) => sum + m.coveragePct, 0);
  return Math.round(total / metrics.length);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
