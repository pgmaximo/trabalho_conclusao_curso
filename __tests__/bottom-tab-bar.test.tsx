import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { APP_TABS } from '@/constants/navigation';
import themeTokens from '@/constants/themeTokens.json';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderBar(activeTab = 'dashboard', onTabPress = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BottomTabBar
        activeTab={activeTab}
        items={APP_TABS.map(({ icon, id, label }) => ({ icon, id, label }))}
        onTabPress={onTabPress}
      />
    </SafeAreaProvider>,
  );
}

// Contraste WCAG 2.1 entre duas cores #RRGGBB.
function contraste(a: string, b: string): number {
  const luminancia = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

describe('BottomTabBar', () => {
  it('renders only the five navigation tabs', () => {
    const onTabPress = jest.fn();
    renderBar('dashboard', onTabPress);

    expect(screen.queryByTestId('bottom-tab-brand-logo')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(5);

    fireEvent.press(screen.getByLabelText('Assistente'));
    expect(onTabPress).toHaveBeenCalledWith('assistant');
  });

  it('se anuncia como lista de abas, com so a aba ativa selecionada', () => {
    renderBar('exams');

    // O contêiner nao e `accessible` (isso fundiria as abas num elemento so no
    // VoiceOver), entao o *ByRole nao o enxerga: o papel e conferido pela prop.
    expect(screen.getByTestId('barra-de-abas').props.accessibilityRole).toBe('tablist');
    expect(screen.getByRole('tab', { name: 'Exames', selected: true })).toBeTruthy();
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1);
  });

  it('desenha o icone inativo com a cor de texto secundario, e nao com o cinza claro', () => {
    renderBar('dashboard');

    const icones = screen.UNSAFE_root.findAll((no) => (no.type as unknown) === 'Ionicons');
    const inativos = icones.filter((icone) => String(icone.props.name).endsWith('-outline'));

    expect(inativos).toHaveLength(4);
    for (const icone of inativos) {
      expect(icone.props.color).toBe(themeTokens.light.textSecondary);
    }
  });

  it('usa para o inativo uma cor com contraste de pelo menos 4,5:1 sobre a barra, nos dois temas', () => {
    expect(contraste(themeTokens.light.textSecondary, themeTokens.light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(themeTokens.dark.textSecondary, themeTokens.dark.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('escreve os rotulos em 13px, acima do piso que o Canvas usou para descartar a barra de 7 abas', () => {
    renderBar('dashboard');

    for (const rotulo of ['Início', 'Exames', 'Assistente', 'Remédios', 'Mais']) {
      const estilo = StyleSheet.flatten(screen.getByText(rotulo).props.style);
      expect(estilo.fontSize).toBe(13);
    }
  });
});
