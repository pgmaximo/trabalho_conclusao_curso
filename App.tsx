import React, { useState } from 'react';
import { HomeScreen } from '@/screens/HomeScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ExamsScreen } from '@/screens/ExamsScreen';
import { AIAnalysisScreen } from '@/screens/AIAnalysisScreen';
import { MedicinesScreen } from '@/screens/MedicinesScreen';
import { AppointmentsScreen } from '@/screens/AppointmentsScreen';
import { PreventionScreen } from '@/screens/PreventionScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'register' | 'profile' | 'dashboard' | 'exams' | 'ai' | 'medicines' | 'appointments' | 'prevention' | 'profile-screen'>(
    'home'
  );

  const navigateToRegister = () => setCurrentScreen('register');
  const navigateToHome = () => setCurrentScreen('home');
  const navigateToProfile = () => setCurrentScreen('profile');
  const navigateToDashboard = () => setCurrentScreen('dashboard');
  const navigateToExams = () => setCurrentScreen('exams');
  const navigateToAI = () => setCurrentScreen('ai');
  const navigateToMedicines = () => setCurrentScreen('medicines');
  const navigateToAppointments = () => setCurrentScreen('appointments');
  const navigateToPrevention = () => setCurrentScreen('prevention');
  const navigateToProfileScreen = () => setCurrentScreen('profile-screen');

  const navigateTo = (screenName: string) => {
    if (screenName === 'home') navigateToDashboard();
    if (screenName === 'exams') navigateToExams();
    if (screenName === 'ai') navigateToAI();
    if (screenName === 'profile') navigateToProfileScreen();
  };

  if (currentScreen === 'register') {
    return <RegisterScreen onNavigateToLogin={navigateToHome} onRegister={navigateToProfile} />;
  }

  if (currentScreen === 'profile') {
    return <ProfileSetupScreen onBack={navigateToHome} onComplete={navigateToDashboard} />;
  }

  if (currentScreen === 'medicines') {
    return <MedicinesScreen onTabPress={navigateTo} />;
  }

  if (currentScreen === 'appointments') {
    return <AppointmentsScreen onTabPress={navigateTo} />;
  }

  if (currentScreen === 'prevention') {
    return <PreventionScreen onTabPress={navigateTo} />;
  }

  if (currentScreen === 'profile-screen') {
    return (
      <ProfileScreen
        onTabPress={navigateTo}
        onLogout={navigateToHome}
      />
    );
  }

  if (currentScreen === 'exams') {
    return <ExamsScreen onTabPress={navigateTo} />;
  }

  if (currentScreen === 'ai') {
    return <AIAnalysisScreen onTabPress={navigateTo} />;
  }

  if (currentScreen === 'dashboard') {
    return (
      <DashboardScreen
        onTabPress={navigateTo}
        onNavigateToMedicines={navigateToMedicines}
        onNavigateToAppointments={navigateToAppointments}
        onNavigateToPrevention={navigateToPrevention}
      />
    );
  }

  return <HomeScreen onNavigateToRegister={navigateToRegister} onLogin={navigateToDashboard} />;
}
