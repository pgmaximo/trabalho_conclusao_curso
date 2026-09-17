/**
 * Resumo do arquivo:
 * Casca fina sobre o LineChart que ja existe no repositorio. O que ela
 * acrescenta e uma regra so, e e a regra que impede o grafico de mentir: a
 * linha de referencia e TUDO OU NADA.
 *
 * O eixo X do LineChart posiciona por INDICE, nao por data -- correto para
 * dado diario de wearable, impreciso para exame, que e esparso: marco e
 * setembro ficam a mesma distancia que setembro e outubro. A mitigacao e
 * rotular TODOS os pontos, decidida na spec (secao 6) em vez de mexer no
 * chartScale, de que a feature de wearable depende (regra 5).
 */
import React from 'react';
import { Text, View } from 'react-native';

import { LineChart, type LineChartReferenceLine } from '@/components/charts/LineChart';
import { useThemeColors } from '@/constants/theme';
import type { AnalyteSeries } from '@/services/analyteSeries';
import { formatarDecimal } from '@/utils/decimalDisplay';

export interface AnalyteSeriesChartProps {
  series: AnalyteSeries;
  referenceRange: { low: number | null; high: number | null } | null;
}

function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return mes && dia ? `${dia}/${mes}` : iso;
}

export function AnalyteSeriesChart({ series, referenceRange }: AnalyteSeriesChartProps) {
  const colors = useThemeColors();

  const pontos = series.points.map((p) => ({ dateKey: p.collectedAt, value: p.value }));

  // Tudo ou nada. Sem esta condicao, a faixa de um laboratorio seria desenhada
  // por cima de pontos de outro -- a forma mais convincente de mentir num
  // grafico, porque a banda parece dado e nao opiniao.
  //
  // A cor e a de texto secundario, nao a de alerta: a linha de referencia
  // informa onde fica a faixa, e nao que algo esta errado.
  const linhasDeReferencia: LineChartReferenceLine[] = referenceRange
    ? [
        referenceRange.low !== null
          ? {
              value: referenceRange.low,
              label: `Referência: ${formatarDecimal(referenceRange.low)}`,
              color: colors.textMuted,
            }
          : null,
        referenceRange.high !== null
          ? {
              value: referenceRange.high,
              label: `Referência: ${formatarDecimal(referenceRange.high)}`,
              color: colors.textMuted,
            }
          : null,
      ].filter((l): l is LineChartReferenceLine => l !== null)
    : [];

  // O resumo para leitor de tela diz VALORES E DATAS, nunca um julgamento --
  // o SVG e invisivel para acessibilidade, e este texto e tudo que a pessoa
  // ouve. Uma palavra de interpretacao aqui seria a mais invisivel de todas.
  const resumo = `Evolução de ${series.projectLabel}${
    series.collectionMoment ? ` (${series.collectionMoment})` : ''
  }, em ${series.unit}: ${series.points
    .map((p) => `${dataCurta(p.collectedAt)}, ${formatarDecimal(p.value)}`)
    .join('; ')}.`;

  const algumLaboratorioInformouFaixa = series.points.some(
    (p) => p.referenceLow !== null || p.referenceHigh !== null,
  );

  return (
    <View>
      <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">
        {series.projectLabel}
      </Text>
      <Text className="text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {series.unit}
        {series.collectionMoment ? ` · ${series.collectionMoment}` : ''}
      </Text>

      <View className="mt-3">
        <LineChart
          accessibilityLabel={resumo}
          emptyMessage="Não há coletas suficientes para desenhar a evolução."
          height={180}
          referenceLines={linhasDeReferencia}
          series={[
            {
              id: series.analyteCode,
              label: series.projectLabel,
              // Uma cor so, a primaria. Verde para "dentro" e vermelho para
              // "fora" seria interpretacao clinica pintada.
              color: colors.primary,
              points: pontos,
              showDots: true,
            },
          ]}
          yUnit={series.unit}
        />
      </View>

      {/* Mitigacao do eixo por indice: TODOS os pontos rotulados com a data. */}
      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        {series.points.map((p) => (
          <Text
            className="text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary"
            key={p.id}
          >
            {dataCurta(p.collectedAt)} · {formatarDecimal(p.value)}
          </Text>
        ))}
      </View>

      {!referenceRange && algumLaboratorioInformouFaixa ? (
        <Text className="mt-2 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Os laboratórios usam faixas diferentes para este resultado, então a faixa aparece ao lado
          de cada coleta, e não no gráfico.
        </Text>
      ) : null}
    </View>
  );
}
