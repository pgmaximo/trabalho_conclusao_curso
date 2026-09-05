/**
 * Resumo do arquivo:
 * Rota da Carteira de vacinação (4e, expandida na feat_vacina). Rota fina —
 * busca dados reais via useVaccinationData (doses do usuário + campanhas do
 * PNI/RNDS + unidades do CNES) e navega para a tela cheia de cadastro
 * (/add-vaccine, ver src/screens/AddVaccineScreen.tsx).
 */
import React from 'react';
import { router } from 'expo-router';

import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { useVaccinationData } from '@/hooks/useVaccinationData';

export default function VaccinationRoute() {
  const {
    upcoming,
    groups,
    campaigns,
    campaignSamplingNotice,
    sites,
    hasLocation,
    isEmpty,
    isLoading,
    isRequestingLocation,
    errorMessage,
    retry,
    requestLocation,
  } = useVaccinationData();

  return (
    <VaccinationScreen
      upcoming={upcoming}
      groups={groups}
      campaigns={campaigns}
      campaignSamplingNotice={campaignSamplingNotice}
      sites={sites}
      hasLocation={hasLocation}
      errorMessage={errorMessage}
      isEmpty={isEmpty}
      isLoading={isLoading}
      isRequestingLocation={isRequestingLocation}
      onAddVaccine={() => router.push('/add-vaccine')}
      onRetry={retry}
      onRequestLocation={requestLocation}
    />
  );
}
