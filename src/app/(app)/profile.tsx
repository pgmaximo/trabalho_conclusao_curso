import React from 'react';
import { router } from 'expo-router';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { useUserContext } from '@/contexts/UserContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useReminderPreferences } from '@/hooks/useReminderPreferences';
import { logoutUser } from '@/services/auth';

export default function ProfileRoute() {
  const { user, clearUser } = useUserContext();
  const { theme, setTheme } = useThemeContext();
  const { reminderLeadDays, setReminderLeadDays } = useReminderPreferences();

  async function handleLogout() {
    clearUser(); // limpa UserContext + AsyncStorage do perfil
    await logoutUser(); // limpa sessao Cognito + userSessionService
    router.replace('/');
  }

  return (
    <ProfileScreen
      user={user}
      theme={theme}
      onSetTheme={setTheme}
      reminderLeadDays={reminderLeadDays}
      onSetReminderLeadDays={setReminderLeadDays}
      onLogout={handleLogout}
      onEditProfile={() => router.push('/edit-profile')}
    />
  );
}
