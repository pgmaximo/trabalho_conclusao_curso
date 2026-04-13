import React, { useState } from 'react';
import { HomeScreen } from '@/screens/HomeScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'register' | 'profile' | 'dashboard'>('home');

  const navigateToRegister = () => setCurrentScreen('register');
  const navigateToHome = () => setCurrentScreen('home');
  const navigateToProfile = () => setCurrentScreen('profile');
  const navigateToDashboard = () => setCurrentScreen('dashboard');

  if (currentScreen === 'register') {
    return <RegisterScreen onNavigateToLogin={navigateToHome} onRegister={navigateToProfile} />;
  }

  if (currentScreen === 'profile') {
    return <ProfileSetupScreen onBack={navigateToHome} onComplete={navigateToDashboard} />;
  }

  if (currentScreen === 'dashboard') {
    return <DashboardScreen />;
  }

  return <HomeScreen onNavigateToRegister={navigateToRegister} onLogin={navigateToDashboard} />;
}
