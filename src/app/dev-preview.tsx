/**
 * Resumo do arquivo:
 * Rota de PREVIEW para desenvolvimento — renderiza telas diretamente com
 * props/dados de exemplo (mesma técnica dos testes RTL: "renderizar o
 * componente de tela com props explícitas, nunca a rota"), sem depender de
 * login no Cognito nem de um backend Amplify real. Existe para permitir
 * validação visual rápida de mudanças de UI (ex.: via Playwright/screenshot
 * em `expo start --web`), tanto por humanos quanto pelo agente.
 *
 * Bloqueada em produção por `__DEV__` — em um build de produção esta rota
 * renderiza `null` e não expõe nada. Acesse via /dev-preview (lista todos
 * os previews disponíveis) ou /dev-preview?screen=<nome>.
 */
import React from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddVaccineScreen } from '@/screens/AddVaccineScreen';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { MarkDoseAppliedSheet } from '@/components/MarkDoseAppliedSheet';
import type {
  VaccinationCampaignView,
  VaccinationSiteView,
  VaccineDoseItem,
  VaccineGroupView,
} from '@/types/models';

const PENDING_ITEM: VaccineDoseItem = {
  id: '1',
  name: 'Influenza (gripe)',
  status: 'pendente',
  description: 'Dose anual · campanha até 30/09/2026',
  dueDate: '2026-09-30',
};

const LATE_ITEM: VaccineDoseItem = {
  id: '2',
  name: 'Dupla adulto (dT)',
  status: 'atrasada',
  description: 'Reforço a cada 10 anos',
  dueDate: '2020-01-01',
};

const HEPATITE_B_GROUP: VaccineGroupView = {
  catalogId: 'hepatite-b',
  nome: 'Hepatite B',
  seriesTotal: 3,
  dosesAplicadas: [
    {
      id: '3',
      name: 'Hepatite B',
      doseNumber: 1,
      status: 'aplicada',
      description: 'Hepatite B · 1ª dose',
      appliedDate: '2025-03-14',
      location: 'UBS Jardim América',
      manufacturer: 'Fundação Butantan',
    },
  ],
  proximaDose: {
    id: '4',
    name: 'Hepatite B',
    doseNumber: 2,
    status: 'pendente',
    description: 'Recomendada até 13/04/2025',
    dueDate: '2025-04-13',
  },
};

const ACTIVE_CAMPAIGN: VaccinationCampaignView = {
  catalogId: 'multivacinacao-2026',
  nome: 'Campanha Nacional de Multivacinação',
  janelaInicio: '2026-08-03',
  janelaFim: '2026-09-01',
  dosesNoPeriodo: 812345,
  ufReferencia: 'SP',
  dataAsOf: '2026-08-30',
  fonteUrl: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026',
};

const NEARBY_SITE: VaccinationSiteView = {
  cnes: '5802911',
  nome: 'UBS Planalto II',
  bairro: 'Planalto',
  logradouro: 'Rua das Flores, 123',
  distanciaKm: 1.4,
};

const noop = () => {};

const PREVIEWS: Record<string, () => React.ReactElement> = {
  'vaccination-empty': () => (
    <VaccinationScreen
      upcoming={[]}
      groups={[]}
      campaigns={[]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation={false}
      isEmpty
      isLoading={false}
      isRequestingLocation={false}
      errorMessage={null}
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
    />
  ),
  'vaccination-loading': () => (
    <VaccinationScreen
      upcoming={[]}
      groups={[]}
      campaigns={[]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation={false}
      isEmpty={false}
      isLoading
      isRequestingLocation={false}
      errorMessage={null}
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
    />
  ),
  'vaccination-error': () => (
    <VaccinationScreen
      upcoming={[]}
      groups={[]}
      campaigns={[]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation={false}
      isEmpty={false}
      isLoading={false}
      isRequestingLocation={false}
      errorMessage="Falha de rede ao carregar sua carteira."
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
    />
  ),
  'vaccination-with-data': () => (
    <VaccinationScreen
      upcoming={[PENDING_ITEM, LATE_ITEM]}
      groups={[HEPATITE_B_GROUP]}
      campaigns={[ACTIVE_CAMPAIGN]}
      campaignSamplingNotice="Contagem baseada em uma amostra de 8000 registros do PNI/RNDS — não é um censo."
      sites={[NEARBY_SITE]}
      hasLocation
      isEmpty={false}
      isLoading={false}
      isRequestingLocation={false}
      errorMessage={null}
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
    />
  ),
  'vaccination-no-location': () => (
    <VaccinationScreen
      upcoming={[PENDING_ITEM]}
      groups={[HEPATITE_B_GROUP]}
      campaigns={[]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation={false}
      isEmpty={false}
      isLoading={false}
      isRequestingLocation={false}
      errorMessage={null}
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
    />
  ),
  'add-vaccine': () => <AddVaccineScreen />,
  'mark-dose-applied-sheet': () => (
    <MarkDoseAppliedSheet visible dose={PENDING_ITEM} isSaving={false} onClose={noop} onSubmit={noop} />
  ),
};

export default function DevPreviewRoute() {
  // Hook chamado incondicionalmente antes de qualquer return antecipado —
  // regra dos hooks do React (o guard de __DEV__ abaixo não pode vir antes).
  const { screen } = useLocalSearchParams<{ screen?: string }>();

  if (!__DEV__) {
    return null;
  }

  const Preview = screen ? PREVIEWS[screen] : undefined;

  if (Preview) {
    return <Preview />;
  }

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <ScrollView contentContainerClassName="p-6">
        <Text className="mb-4 text-xl font-bold text-app-text dark:text-app-dark-text">
          Previews disponíveis (dev only)
        </Text>
        {Object.keys(PREVIEWS).map((name) => (
          <Link key={name} href={`/dev-preview?screen=${name}`} asChild>
            <View className="mb-3 rounded-app border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface">
              <Text className="text-app-text dark:text-app-dark-text">{name}</Text>
            </View>
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
