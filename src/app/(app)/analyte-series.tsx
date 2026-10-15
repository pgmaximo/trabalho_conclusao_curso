/**
 * Rota da tela de evolucao por analito. Le o parametro e e dona do hook -- a
 * tela continua apresentacional, como em health-data.tsx e no detalhe do
 * documento.
 */
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { useAnalyteSeries } from '@/hooks/useAnalyteSeries';
import { AnalyteSeriesScreen } from '@/screens/AnalyteSeriesScreen';

export default function AnalyteSeriesRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const state = useAnalyteSeries(code ?? null);

  return <AnalyteSeriesScreen state={state} />;
}
