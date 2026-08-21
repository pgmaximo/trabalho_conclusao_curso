/**
 * Resumo do arquivo:
 * Rota da Carteira de vacinação (4e). Rota fina — busca dados reais via
 * useVaccinationData e persiste novas doses via vaccinationService.
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { AddVaccineSheet } from '@/components/AddVaccineSheet';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { useVaccinationData } from '@/hooks/useVaccinationData';
import { createVaccineDose, type CreateVaccineDoseInput } from '@/services/vaccinationService';

export default function VaccinationRoute() {
  const { upcoming, history, activeCampaignMessage, isEmpty, isLoading, errorMessage, retry } =
    useVaccinationData();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(input: CreateVaccineDoseInput) {
    setIsSaving(true);
    try {
      await createVaccineDose(input);
      setIsSheetVisible(false);
      retry();
    } catch (error) {
      console.log('Erro ao salvar vacina:', error);
      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar a vacina agora. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <VaccinationScreen
        activeCampaignMessage={activeCampaignMessage}
        errorMessage={errorMessage}
        history={history}
        isEmpty={isEmpty}
        isLoading={isLoading}
        onAddVaccine={() => setIsSheetVisible(true)}
        onRetry={retry}
        upcoming={upcoming}
      />

      <AddVaccineSheet
        isSaving={isSaving}
        onClose={() => setIsSheetVisible(false)}
        onSubmit={handleSubmit}
        visible={isSheetVisible}
      />
    </>
  );
}
