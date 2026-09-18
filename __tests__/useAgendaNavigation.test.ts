import { act, renderHook } from '@testing-library/react-native';

import { useAgendaNavigation } from '@/hooks/useAgendaNavigation';
import { toIsoDate } from '@/services/agendaDateRange';

describe('useAgendaNavigation', () => {
  it('comeca no escopo Dia, ancorado em hoje, sem override', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    expect(result.current.scope).toBe('dia');
    expect(toIsoDate(result.current.anchorDate)).toBe(toIsoDate(new Date()));
    expect(result.current.listOverride).toBeNull();
    expect(result.current.canGoToToday).toBe(false);
  });

  it('trocar de escopo preserva a ancora', () => {
    const { result } = renderHook(() => useAgendaNavigation());
    const ancoraInicial = toIsoDate(result.current.anchorDate);

    act(() => result.current.setScope('mes'));

    expect(result.current.scope).toBe('mes');
    expect(toIsoDate(result.current.anchorDate)).toBe(ancoraInicial);
  });

  it('goNext desloca uma unidade do escopo corrente', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('mes'));
    const mesInicial = result.current.anchorDate.getMonth();

    act(() => result.current.goNext());

    expect(result.current.anchorDate.getMonth()).toBe((mesInicial + 1) % 12);
  });

  it('canGoToToday vira true depois de sair do periodo atual, e goToToday volta', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.goNext());
    expect(result.current.canGoToToday).toBe(true);

    act(() => result.current.goToToday());
    expect(result.current.canGoToToday).toBe(false);
    expect(toIsoDate(result.current.anchorDate)).toBe(toIsoDate(new Date()));
  });

  it('drillDown desce ano -> mes -> dia, movendo a ancora', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('ano'));
    act(() => result.current.drillDown('2027-03-01'));

    expect(result.current.scope).toBe('mes');
    expect(result.current.anchorDate.getMonth()).toBe(2);
    expect(result.current.anchorDate.getFullYear()).toBe(2027);

    act(() => result.current.drillDown('2027-03-15'));

    expect(result.current.scope).toBe('dia');
    expect(result.current.anchorDate.getDate()).toBe(15);
  });

  it('selectDate move a ancora sem mudar o escopo', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setScope('mes'));
    act(() => result.current.selectDate('2027-05-09'));

    expect(result.current.scope).toBe('mes');
    expect(toIsoDate(result.current.anchorDate)).toBe('2027-05-09');
  });

  it('setScope, selectDate e goToToday limpam um override ativo', () => {
    const { result } = renderHook(() => useAgendaNavigation());

    act(() => result.current.setListOverride('historico'));
    expect(result.current.listOverride).toBe('historico');
    expect(result.current.periodLabel).toBe('Histórico completo');

    act(() => result.current.setScope('semana'));
    expect(result.current.listOverride).toBeNull();
  });

  it('ignora isoDate malformado em vez de quebrar', () => {
    const { result } = renderHook(() => useAgendaNavigation());
    const antes = toIsoDate(result.current.anchorDate);

    act(() => result.current.selectDate('lixo'));

    expect(toIsoDate(result.current.anchorDate)).toBe(antes);
  });
});
