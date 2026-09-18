// =============================================================================
// Arquivo: useAgendaNavigation.ts
// Descricao: Estado de navegacao temporal da Agenda (escopo + ancora + override)
// =============================================================================
//
// Nao busca nada e nao conhece Amplify: e so navegacao. A busca vive em
// useAppointmentsData, e a aritmetica de data em services/agendaDateRange.ts.
//
// =============================================================================

import { useCallback, useMemo, useState } from 'react';

import {
  buildRange,
  formatPeriodLabel,
  isDateWithinRange,
  parseScheduledAt,
  shiftAnchor,
  startOfDay,
  type AgendaListOverride,
  type AgendaScope,
  type DateRange,
} from '@/services/agendaDateRange';

export type AgendaNavigation = {
  scope: AgendaScope;
  anchorDate: Date;
  today: Date;
  listOverride: AgendaListOverride | null;
  range: DateRange;
  periodLabel: string;
  canGoToToday: boolean;
  setScope: (scope: AgendaScope) => void;
  goPrevious: () => void;
  goNext: () => void;
  goToToday: () => void;
  selectDate: (isoDate: string) => void;
  drillDown: (isoDate: string) => void;
  setListOverride: (override: AgendaListOverride | null) => void;
};

const CHILD_SCOPE: Record<AgendaScope, AgendaScope> = {
  ano: 'mes',
  mes: 'dia',
  semana: 'dia',
  dia: 'dia',
};

export function useAgendaNavigation(): AgendaNavigation {
  // Capturado UMA vez na montagem, pelo mesmo motivo ja documentado na versao
  // anterior de useAppointmentsData: evita a tela "escorregar" perto da meia-noite
  // enquanto esta aberta.
  const [today] = useState(() => startOfDay(new Date()));
  const [scope, setScopeState] = useState<AgendaScope>('dia');
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [listOverride, setListOverrideState] = useState<AgendaListOverride | null>(null);

  const range = useMemo(() => buildRange(scope, anchorDate), [scope, anchorDate]);

  const periodLabel = useMemo(() => {
    if (listOverride === 'proximos') return 'Todos os compromissos futuros';
    if (listOverride === 'historico') return 'Histórico completo';
    return formatPeriodLabel(scope, anchorDate, today);
  }, [scope, anchorDate, today, listOverride]);

  const canGoToToday = useMemo(() => !isDateWithinRange(today, range), [today, range]);

  const setScope = useCallback((next: AgendaScope) => {
    setScopeState(next);
    setListOverrideState(null);
  }, []);

  const goPrevious = useCallback(() => {
    setAnchorDate((current) => shiftAnchor(scope, current, -1));
  }, [scope]);

  const goNext = useCallback(() => {
    setAnchorDate((current) => shiftAnchor(scope, current, 1));
  }, [scope]);

  const goToToday = useCallback(() => {
    setAnchorDate(today);
    setListOverrideState(null);
  }, [today]);

  const selectDate = useCallback((isoDate: string) => {
    const date = parseScheduledAt(isoDate);
    if (!date) return;
    setAnchorDate(startOfDay(date));
    setListOverrideState(null);
  }, []);

  const drillDown = useCallback((isoDate: string) => {
    const date = parseScheduledAt(isoDate);
    if (!date) return;
    setAnchorDate(startOfDay(date));
    setScopeState((current) => CHILD_SCOPE[current]);
    setListOverrideState(null);
  }, []);

  const setListOverride = useCallback((override: AgendaListOverride | null) => {
    setListOverrideState(override);
  }, []);

  return {
    scope,
    anchorDate,
    today,
    listOverride,
    range,
    periodLabel,
    canGoToToday,
    setScope,
    goPrevious,
    goNext,
    goToToday,
    selectDate,
    drillDown,
    setListOverride,
  };
}
