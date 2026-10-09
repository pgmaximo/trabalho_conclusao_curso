import React from 'react';
import { router } from 'expo-router';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { useUserContext } from '@/contexts/UserContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { lembrarConversaAberta } from '@/hooks/conversaAberta';
import { useReminderPreferences } from '@/hooks/useReminderPreferences';
import { logoutUser } from '@/services/auth';
import { goBackOr } from '@/utils/goBack';

export default function ProfileRoute() {
  const { user, clearUser } = useUserContext();
  const { theme, setTheme } = useThemeContext();
  const { reminderIntervals, setReminderIntervalForGrade } = useReminderPreferences();

  async function handleLogout() {
    clearUser(); // limpa UserContext + AsyncStorage do perfil
    lembrarConversaAberta(null); // a conversa aberta não atravessa de uma conta para outra
    await logoutUser(); // limpa sessao Cognito + userSessionService
    router.replace('/');
  }

  return (
    <ProfileScreen
      user={user}
      theme={theme}
      onSetTheme={setTheme}
      reminderIntervals={reminderIntervals}
      onSetReminderInterval={setReminderIntervalForGrade}
      onLogout={handleLogout}
      onEditProfile={() => router.push('/edit-profile')}
      onBack={() => goBackOr('/more')}
    />
  );
}
