import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

type BottomTabBarItem = {
  icon: string;
  label: string;
  id: string;
};

type BottomTabBarProps = {
  items: BottomTabBarItem[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
};

export function BottomTabBar({ items, activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => onTabPress(item.id)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SIZES.large,
    paddingTop: SIZES.small,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.small,
  },
  tabPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
