import React from 'react';
import { View } from 'react-native';
import { router, Slot, usePathname } from 'expo-router';

import { APP_TABS, getActiveTabId } from '@/constants/navigation';
import { AvisoDeSucesso } from '@/components/AvisoDeSucesso';
import { BottomTabBar } from '@/components/BottomTabBar';

export function AppShell() {
  const pathname = usePathname();
  const activeTab = getActiveTabId(pathname);

  return (
    <View className="flex-1 bg-app-background dark:bg-app-dark-background">
      <View className="flex-1">
        <Slot />
        {/* Dentro da área das telas, e não por cima do app todo: assim o aviso
            de "salvo" fica acima da barra de abas, e não sobre ela. */}
        <AvisoDeSucesso />
      </View>

      <BottomTabBar
        items={APP_TABS.map(({ icon, label, id }) => ({ icon, label, id }))}
        activeTab={activeTab}
        onTabPress={(tabId) => {
          const nextTab = APP_TABS.find((item) => item.id === tabId);
          if (nextTab) {
            router.replace(nextTab.href);
          }
        }}
      />
    </View>
  );
}
