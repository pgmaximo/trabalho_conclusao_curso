import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
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
import { UploadDocumentScreen } from '@/screens/UploadDocumentScreen';
import { Amplify } from 'aws-amplify';
import { authConfig } from './src/services/aws-auth-config';

cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);
Amplify.configure(authConfig);

const PROFILE_SETUP_COMPLETED_KEY_PREFIX = '@SuaSaude:profileSetupCompleted:';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'register' | 'confirm' | 'forgot-password' | 'profile' | 'dashboard' | 'exams' | 'ai' | 'medicines' | 'appointments' | 'prevention' | 'profile-screen' | 'upload-document'
  >('home');

  // Estado para armazenar o e-mail transitório do cadastro
  const [userEmail, setUserEmail] = useState('');

  const navigateToRegister = () => setCurrentScreen('register');
  const navigateToHome = () => setCurrentScreen('home');
  const navigateToForgotPassword = () => setCurrentScreen('forgot-password');
  const navigateToProfile = () => setCurrentScreen('profile');
  const navigateToDashboard = () => setCurrentScreen('dashboard');
  const navigateToExams = () => setCurrentScreen('exams');
  const navigateToUploadDocument = () => setCurrentScreen('upload-document');
  const navigateToAI = () => setCurrentScreen('ai');
  const navigateToMedicines = () => setCurrentScreen('medicines');
  const navigateToAppointments = () => setCurrentScreen('appointments');
  const navigateToPrevention = () => setCurrentScreen('prevention');
  const navigateToProfileScreen = () => setCurrentScreen('profile-screen');

  const getProfileSetupCompletedKey = async () => {
    const user = await getCurrentUser();
    return `${PROFILE_SETUP_COMPLETED_KEY_PREFIX}${user.userId}`;
  };

  const hasCompletedProfileSetup = async () => {
    try {
      const key = await getProfileSetupCompletedKey();
      return (await AsyncStorage.getItem(key)) === 'true';
    } catch (error) {
      console.log('Erro ao verificar perfil:', error);
      return false;
    }
  };

  const markProfileSetupCompleted = async () => {
    try {
      const key = await getProfileSetupCompletedKey();
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
      console.log('Erro ao salvar perfil:', error);
    }
  };

  const handleProfileSetupComplete = async () => {
    await markProfileSetupCompleted();
    navigateToDashboard();
  };

  const handleGoogleAuthSuccess = async () => {
    if (await hasCompletedProfileSetup()) {
      navigateToDashboard();
      return;
    }

    navigateToProfile();
  };

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
        onGoogleAuthSuccess={handleGoogleAuthSuccess}
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
    return <ProfileSetupScreen onBack={navigateToHome} onComplete={handleProfileSetupComplete} />;
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
    return <ExamsScreen onTabPress={navigateTo} onAddDocument={navigateToUploadDocument} />;
  }

  if (currentScreen === 'upload-document') {
    return <UploadDocumentScreen onBack={navigateToExams} />;
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
      onGoogleAuthSuccess={handleGoogleAuthSuccess}
    />
  );
}
