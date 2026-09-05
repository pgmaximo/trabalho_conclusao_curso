/**
 * Resumo do arquivo:
 * Rota da Carteira de vacinação (4e, expandida na feat_vacina). Busca dados
 * reais via useVaccinationData (doses do usuário + campanhas do PNI/RNDS +
 * unidades do CNES), navega para a tela cheia de cadastro (/add-vaccine) e
 * orquestra o sheet de "marcar como aplicada" (registro rápido de uma dose
 * pendente/atrasada sem recadastrar a vacina do zero).
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { MarkDoseAppliedSheet, type MarkDoseAppliedInput } from '@/components/MarkDoseAppliedSheet';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { useVaccinationData } from '@/hooks/useVaccinationData';
import { markDoseApplied } from '@/services/vaccinationService';
import type { VaccineDoseItem } from '@/types/models';

export default function VaccinationRoute() {
  const {
    upcoming,
    groups,
    campaigns,
    campaignSamplingNotice,
    sites,
    hasLocation,
    hasMunicipio,
    isEmpty,
    isLoading,
    isRequestingLocation,
    errorMessage,
    retry,
    requestLocation,
  } = useVaccinationData();

  const [doseToMark, setDoseToMark] = useState<VaccineDoseItem | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  async function handleConfirmMarkApplied(input: MarkDoseAppliedInput) {
    if (!doseToMark) return;

    setIsMarking(true);
    try {
      await markDoseApplied({
        id: doseToMark.id,
        catalogId: doseToMark.catalogId,
        ordem: doseToMark.doseNumber,
        appliedDate: input.appliedDate,
        location: input.location,
        lot: input.lot,
        manufacturer: input.manufacturer,
      });
      setDoseToMark(null);
      retry();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao marcar a vacina como aplicada.';
      Alert.alert('Erro ao salvar', message);
    } finally {
      setIsMarking(false);
    }
  }

  async function handleRequestLocation() {
    const location = await requestLocation();
    if (!location) {
      // Não afirmamos que é falta de permissão/configuração — isso já
      // aconteceu com permissão concedida e localização ativada (o GPS do
      // Android às vezes simplesmente não responde a tempo; ver comentário
      // em locationService.ts#resolvePosition). Culpar a configuração do
      // usuário quando não sabemos a causa real só manda a pessoa checar
      // algo que já está certo.
      Alert.alert(
        'Não foi possível obter sua localização agora',
        'Isso pode acontecer mesmo com a localização ativada e a permissão concedida — o GPS às vezes demora para responder. Tente novamente em alguns segundos.',
      );
    }
  }

  return (
    <>
      <VaccinationScreen
        upcoming={upcoming}
        groups={groups}
        campaigns={campaigns}
        campaignSamplingNotice={campaignSamplingNotice}
        sites={sites}
        hasLocation={hasLocation}
        hasMunicipio={hasMunicipio}
        errorMessage={errorMessage}
        isEmpty={isEmpty}
        isLoading={isLoading}
        isRequestingLocation={isRequestingLocation}
        onAddVaccine={() => router.push('/add-vaccine')}
        onRetry={retry}
        onRequestLocation={handleRequestLocation}
        onMarkDoseApplied={setDoseToMark}
      />

      <MarkDoseAppliedSheet
        visible={doseToMark !== null}
        dose={doseToMark}
        isSaving={isMarking}
        onClose={() => setDoseToMark(null)}
        onSubmit={handleConfirmMarkApplied}
      />
    </>
  );
}
