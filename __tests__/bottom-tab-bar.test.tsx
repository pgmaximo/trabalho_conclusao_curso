import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { APP_TABS } from '@/constants/navigation';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

describe('BottomTabBar', () => {
  it('renders only the five navigation tabs', () => {
    const onTabPress = jest.fn();

    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <BottomTabBar
          activeTab="dashboard"
          items={APP_TABS.map(({ icon, id, label }) => ({ icon, id, label }))}
          onTabPress={onTabPress}
        />
      </SafeAreaProvider>,
    );

    expect(screen.queryByTestId('bottom-tab-brand-logo')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(5);

    fireEvent.press(screen.getByLabelText('Consultas'));
    expect(onTabPress).toHaveBeenCalledWith('agenda');
  });
});
