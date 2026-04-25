import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import React, { useState } from 'react';
import { HomeScreen } from '@/screens/HomeScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ConfirmScreen } from '@/screens/ConfirmScreen'; // Importação adicionada
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ExamsScreen } from '@/screens/ExamsScreen';
import { AIAnalysisScreen } from '@/screens/AIAnalysisScreen';
import { MedicinesScreen } from '@/screens/MedicinesScreen';
import { AppointmentsScreen } from '@/screens/AppointmentsScreen';
import { PreventionScreen } from '@/screens/PreventionScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { Amplify } from 'aws-amplify';
import { authConfig } from './src/services/aws-auth-config';

cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
Amplify.configure(authConfig);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'register' | 'confirm' | 'forgot-password' | 'profile' | 'dashboard' | 'exams' | 'ai' | 'medicines' | 'appointments' | 'prevention' | 'profile-screen'
  >('home');

  // Estado para armazenar o e-mail transitório do cadastro
  const [userEmail, setUserEmail] = useState('');

  const navigateToRegister = () => setCurrentScreen('register');
  const navigateToHome = () => setCurrentScreen('home');
  const navigateToForgotPassword = () => setCurrentScreen('forgot-password');
  const navigateToProfile = () => setCurrentScreen('profile');
  const navigateToDashboard = () => setCurrentScreen('dashboard');
  const navigateToExams = () => setCurrentScreen('exams');
  const navigateToAI = () => setCurrentScreen('ai');
  const navigateToMedicines = () => setCurrentScreen('medicines');
  const navigateToAppointments = () => setCurrentScreen('appointments');
  const navigateToPrevention = () => setCurrentScreen('prevention');
  const navigateToProfileScreen = () => setCurrentScreen('profile-screen');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('Erro ao sair:', error);
    } finally {
      setUserEmail('');
      setCurrentScreen('home');
    }
  };

  const navigateTo = (screenName: string) => {
    if (screenName === 'home') navigateToDashboard();
    if (screenName === 'exams') navigateToExams();
    if (screenName === 'ai') navigateToAI();
    if (screenName === 'profile') navigateToProfileScreen();
  };

  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        onNavigateToLogin={navigateToHome}
        onRegisterSuccess={(email) => {
          setUserEmail(email);
          setCurrentScreen('confirm');
        }}
      />
    );
  }

  if (currentScreen === 'confirm') {
    return (
      <ConfirmScreen
        email={userEmail}
        onConfirmSuccess={navigateToProfile}
      />
    );
  }

  if (currentScreen === 'forgot-password') {
    return <ForgotPasswordScreen onBackToLogin={navigateToHome} />;
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
        onLogout={handleLogout}
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

  return (
    <HomeScreen
      onNavigateToRegister={navigateToRegister}
      onNavigateToForgotPassword={navigateToForgotPassword}
      onLogin={navigateToDashboard}
    />
  );
}
