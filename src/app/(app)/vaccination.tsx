/**
 * Resumo do arquivo:
 * Rota da Carteira de vacinação (4e, expandida na feat_vacina). Busca dados
 * reais via useVaccinationData (doses do usuário + campanhas do PNI/RNDS +
 * unidades do CNES), navega para a tela cheia de cadastro (/add-vaccine) e
 * orquestra o sheet de "marcar como aplicada" (registro rápido de uma dose
 * pendente/atrasada sem recadastrar a vacina do zero).
 */
import React, { useState } from 'react';
import { router } from 'expo-router';

import { MarkDoseAppliedSheet, type MarkDoseAppliedInput } from '@/components/MarkDoseAppliedSheet';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { avisarSucesso } from '@/hooks/avisoDeSucesso';
import { useVaccinationData } from '@/hooks/useVaccinationData';
import { deleteVaccineDose, markDoseApplied } from '@/services/vaccinationService';
import type { VaccineDoseItem } from '@/types/models';
import { goBackOr } from '@/utils/goBack';

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
  // As falhas aparecem na tela, junto de onde aconteceram, e não num pop-up do
  // sistema (specs/00-fundacao/consistencia-e-textos/spec.md, D4).
  const [markError, setMarkError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Devolve `false` quando não salvou: a folha fica aberta, com o que a pessoa
  // digitou e o erro.
  async function handleConfirmMarkApplied(input: MarkDoseAppliedInput): Promise<boolean> {
    if (!doseToMark) return false;

    setIsMarking(true);
    setMarkError(null);
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
      avisarSucesso('Dose marcada como aplicada.');
      retry();
      return true;
    } catch (error) {
      setMarkError(
        error instanceof Error ? error.message : 'Não foi possível marcar a dose como aplicada.',
      );
      return false;
    } finally {
      setIsMarking(false);
    }
  }

  // Um erro aqui sobe para a tela, que o mostra junto do registro.
  async function handleDeleteDose(item: VaccineDoseItem) {
    await deleteVaccineDose(item.id);
    avisarSucesso('Registro de vacina excluído.');
    retry();
  }

  async function handleRequestLocation() {
    setLocationError(null);
    const location = await requestLocation();
    if (!location) {
      // Não afirmamos que é falta de permissão/configuração — isso já
      // aconteceu com permissão concedida e localização ativada (o GPS do
      // Android às vezes simplesmente não responde a tempo; ver comentário
      // em locationService.ts#resolvePosition). Culpar a configuração do
      // usuário quando não sabemos a causa real só manda a pessoa checar
      // algo que já está certo.
      setLocationError(
        'Não foi possível obter sua localização agora. Isso pode acontecer mesmo com a localização ativada: o GPS às vezes demora para responder. Tente de novo em alguns segundos.',
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
        locationError={locationError}
        onBack={() => goBackOr('/more')}
        onMarkDoseApplied={(item) => {
          setMarkError(null);
          setDoseToMark(item);
        }}
        onDeleteDose={handleDeleteDose}
      />

      <MarkDoseAppliedSheet
        visible={doseToMark !== null}
        dose={doseToMark}
        isSaving={isMarking}
        errorMessage={markError}
        onClose={() => {
          setMarkError(null);
          setDoseToMark(null);
        }}
        onSubmit={handleConfirmMarkApplied}
      />
    </>
  );
}
