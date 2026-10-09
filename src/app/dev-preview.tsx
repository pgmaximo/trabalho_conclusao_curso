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

import { AddMedicineScreen } from '@/screens/AddMedicineScreen';
import { AddVaccineScreen } from '@/screens/AddVaccineScreen';
import { AgendaScreen } from '@/screens/AgendaScreen';
import { AssistantMemoryScreen } from '@/screens/AssistantMemoryScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { HealthDashboardScreen } from '@/screens/HealthDashboardScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MedicinesScreen } from '@/screens/MedicinesScreen';
import { MoreScreen } from '@/screens/MoreScreen';
import { PreventionScreen } from '@/screens/PreventionScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { VaccinationScreen } from '@/screens/VaccinationScreen';
import { BottomTabBar } from '@/components/BottomTabBar';
import { MarkDoseAppliedSheet } from '@/components/MarkDoseAppliedSheet';
import { APP_TABS } from '@/constants/navigation';
import type { UserProfile } from '@/contexts/UserContext';
import type { HealthImport } from '@/types/healthInsights';
import type {
  AppointmentEntry,
  MedicalDocument,
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

const PREVIEW_USER: UserProfile = {
  id: 'preview-user',
  name: 'Maria Souza',
  email: 'maria.souza@example.com',
  gender: undefined,
  birthDate: '1961-04-12',
  weightKg: 68,
  heightCm: 162,
  isSmoker: false,
  onboardingCompleted: true,
};

function previewDocument(id: string, title: string, subtitle: string, documentDate: string): MedicalDocument {
  return {
    id,
    icon: 'document-text-outline',
    title,
    subtitle,
    category: 'Exames',
    documentType: 'exam',
    documentName: title,
    documentDate,
    expirationDate: null,
    s3FileName: `${id}.pdf`,
    originalFileName: `${id}.pdf`,
  };
}

const PREVIEW_EXAMS: MedicalDocument[] = [
  previewDocument('doc-1', 'Hemograma completo', 'Exame · 02/10/2026', '2026-10-02'),
  previewDocument('doc-2', 'Colesterol total e frações', 'Exame · 18/09/2026', '2026-09-18'),
];

// Datas relativas a hoje: fixas, o compromisso cairia no passado e o preview
// deixaria de mostrar "Amanhã".
function previewScheduledAt(daysFromToday: number, time: string): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T${time}`;
}

const PREVIEW_APPOINTMENTS: AppointmentEntry[] = [
  {
    id: 'apt-1',
    time: '08:00',
    title: 'Cardiologista',
    location: 'Clínica Central',
    type: 'consulta',
    scheduledAt: previewScheduledAt(1, '08:00'),
  },
  {
    id: 'apt-2',
    time: '14:30',
    title: 'Ultrassom abdominal',
    location: 'Laboratório São Lucas',
    type: 'exame',
    scheduledAt: previewScheduledAt(6, '14:30'),
  },
];

const HOME_BASE_PROPS: React.ComponentProps<typeof HomeScreen> = {
  greeting: 'Boa tarde, Maria',
  todayLabel: 'sexta-feira, 9 de outubro de 2026',
  todaySummaryText: 'Nenhum compromisso ou pendência para hoje.',
  recentExams: [],
  examsLoading: false,
  examsError: null,
  onRetryExams: noop,
  upcomingAppointments: [],
  appointmentsLoading: false,
  appointmentsError: null,
  onRetryAppointments: noop,
  onNavigateToExamDetail: noop,
  onNavigateToAppointmentDetail: noop,
  onNavigateToExams: noop,
  onNavigateToAppointments: noop,
  onNavigateToMedicines: noop,
  onNavigateToPrevention: noop,
  onNavigateToVaccination: noop,
  onNavigateToHealthData: noop,
  onNavigateToProfile: noop,
  profileAvatar: { name: PREVIEW_USER.name },
};

const READY_HEALTH_IMPORT: HealthImport = {
  id: 'import-1',
  status: 'READY',
  sourceHint: 'SAMSUNG_HEALTH',
  fileNames: ['pedometer_day_summary.csv', 'sleep.csv'],
  periodStart: '2026-07-01',
  periodEnd: '2026-09-28',
  dayCount: 90,
  warnings: ['12 colunas não reconhecidas foram ignoradas.'],
  errorMessage: null,
  startedAt: '2026-09-29T10:00:00.000Z',
  analyzedAt: '2026-09-29T10:02:00.000Z',
  modelId: 'us.anthropic.claude-sonnet-4-6',
  summary: {
    periodStart: '2026-07-01',
    periodEnd: '2026-09-28',
    dayCount: 90,
    metrics: [
      {
        metric: 'steps',
        label: 'Passos',
        unit: 'passos',
        n: 80,
        firstSeen: '2026-07-01',
        lastSeen: '2026-09-28',
        daysWithData: 80,
        coveragePct: 89,
        mean: 8200,
        median: 8000,
        sd: 1500,
        min: 2000,
        max: 15000,
        p25: 6000,
        p75: 10000,
        weekday: 8500,
        weekend: 7000,
        trendSlopePerDay: 5,
        monthly: [
          { month: '2026-07', mean: 7800 },
          { month: '2026-08', mean: 8300 },
          { month: '2026-09', mean: 8500 },
        ],
      },
      {
        metric: 'sleepMinutes',
        label: 'Sono',
        unit: 'min',
        n: 70,
        firstSeen: '2026-07-01',
        lastSeen: '2026-09-28',
        daysWithData: 70,
        coveragePct: 78,
        mean: 402,
        median: 410,
        sd: 45,
        min: 250,
        max: 520,
        p25: 370,
        p75: 440,
        weekday: 395,
        weekend: 425,
        trendSlopePerDay: 0.2,
        monthly: [
          { month: '2026-07', mean: 390 },
          { month: '2026-08', mean: 405 },
          { month: '2026-09', mean: 412 },
        ],
      },
    ],
    correlations: [
      { metricA: 'steps', metricB: 'sleepMinutes', lagDays: 0, label: 'Passos e sono', r: 0.42, n: 60 },
    ],
    warnings: ['12 colunas não reconhecidas foram ignoradas.'],
  },
  insights: {
    resumo: 'Seus passos aumentaram ao longo do período analisado, e o sono ficou estável.',
    destaques: [
      { metrica: 'Passos', valor: '8.200/dia', comparacao: 'acima da média do período', tom: 'positivo' },
    ],
    pontosDeAtencao: [],
    padroes: [],
    sugestoes: [],
    perguntasParaOMedico: [],
    limitacoes: 'Cobertura de sono limitada a 78% dos dias.',
  },
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T10:02:00.000Z',
};

const PREVIEWS: Record<string, () => React.ReactElement> = {
  // O Início dentro da moldura do app (conteúdo + barra de abas), como o
  // AppShell monta — para ver a barra no contexto, e não solta.
  'home-in-shell': () => (
    <View className="flex-1 bg-app-background dark:bg-app-dark-background">
      <View className="flex-1">
        <HomeScreen
          {...HOME_BASE_PROPS}
          examsCount={7}
          pendingDosesToday={2}
          recentExams={PREVIEW_EXAMS}
          smartwatchAnalysisReady
          upcomingAppointments={PREVIEW_APPOINTMENTS}
          vaccineDoseCounts={{ overdue: 0, pending: 1, applied: 5 }}
        />
      </View>
      <BottomTabBar
        activeTab="dashboard"
        items={APP_TABS.map(({ icon, label, id }) => ({ icon, label, id }))}
        onTabPress={noop}
      />
    </View>
  ),
  'home-with-data': () => (
    <HomeScreen
      {...HOME_BASE_PROPS}
      examsCount={7}
      pendingDosesToday={2}
      recentExams={PREVIEW_EXAMS}
      smartwatchAnalysisReady
      todaySummaryText="2 medicamentos pendentes"
      upcomingAppointments={PREVIEW_APPOINTMENTS}
      vaccinationAlert={{ title: 'Vacina atrasada', subtitle: 'Dupla adulto (dT) está com a dose atrasada.' }}
      vaccineDoseCounts={{ overdue: 1, pending: 2, applied: 5 }}
    />
  ),
  'home-new-user': () => (
    // Conta recém-criada: tudo carregou, e não há nada ainda.
    <HomeScreen
      {...HOME_BASE_PROPS}
      examsCount={0}
      pendingDosesToday={0}
      smartwatchAnalysisReady={false}
      vaccineDoseCounts={{ overdue: 0, pending: 0, applied: 0 }}
    />
  ),
  'home-loading': () => (
    // Nenhuma fonte respondeu: os atalhos descrevem o destino.
    <HomeScreen
      {...HOME_BASE_PROPS}
      appointmentsLoading
      examsLoading
      pendingDosesToday={null}
      smartwatchAnalysisReady={null}
      vaccineDoseCounts={null}
    />
  ),
  'medicines-with-data': () => (
    <MedicinesScreen
      errorMessage={null}
      hasMedicines
      interactions={[]}
      isLoading={false}
      medicines={[
        { id: 'm1__08:00', medicineId: 'm1', time: '08:00', name: 'Losartana', dosage: '50mg', status: 'taken' },
        { id: 'm2__09:00', medicineId: 'm2', time: '09:00', name: 'Metformina', dosage: '850mg', status: 'missed' },
        { id: 'm1__20:00', medicineId: 'm1', time: '20:00', name: 'Losartana', dosage: '50mg', status: 'pending' },
      ]}
      onRetry={noop}
      onToggleMedicineStatus={async () => {}}
      pendingCount={2}
      stocks={[
        { id: 'm1', name: 'Losartana', quantity: 22, unit: 'comp.', status: 'ok', percentage: 73 },
        { id: 'm2', name: 'Metformina', quantity: 4, unit: 'comp.', status: 'low', percentage: 13 },
      ]}
    />
  ),
  'add-medicine': () => <AddMedicineScreen />,
  agenda: () => (
    <AgendaScreen appointments={PREVIEW_APPOINTMENTS} errorMessage={null} isLoading={false} onBack={noop} onRetry={noop} />
  ),
  'prevention-empty': () => (
    <PreventionScreen
      activeCampaignMessage={null}
      errorMessage={null}
      isLoading={false}
      lastUpdated=""
      onBack={noop}
      onCompleteProfile={noop}
      onEnableRemindersForIds={noop}
      onRetry={noop}
      onToggleReminder={noop}
      pendingReminderIds={new Set()}
      profileComplete
      recommendations={[]}
    />
  ),
  more: () => <MoreScreen />,
  'assistant-memory': () => (
    <AssistantMemoryScreen
      onBack={noop}
      state={{
        fatos: [
          {
            id: 'f-1',
            texto: 'Prefiro respostas curtas',
            tipo: 'PREFERENCIA_DE_RESPOSTA',
            confirmadoEm: '2026-09-10T12:00:00Z',
            editadoEm: null,
            conversaDeOrigem: null,
          },
        ],
        carregando: false,
        ligada: true,
        apagar: noop,
        apagarTudo: noop,
        editar: async () => ({ ok: true }),
        definirLigada: noop,
        abrirConversa: noop,
      }}
    />
  ),
  'edit-profile': () => (
    <EditProfileScreen
      displayName={PREVIEW_USER.name}
      email={PREVIEW_USER.email}
      initialValues={{
        fullName: PREVIEW_USER.name,
        birthDate: '12/04/1961',
        biologicalSex: 'female',
        heightCm: '162',
        weightKg: '68',
        chronicConditions: 'Hipertensão',
        medications: 'Losartana 50mg, 1x ao dia',
        allergies: '',
        tobaccoUse: 'no',
        sexuallyActive: 'unknown',
        physicalActivity: 'yes',
        alcoholUse: 'no',
        pregnancyStatus: 'unknown',
      }}
      isSaving={false}
      onCancel={noop}
      onSubmit={noop}
      onUploadPhoto={async () => {}}
    />
  ),
  'health-dashboard-ready': () => (
    <HealthDashboardScreen
      errorMessage={null}
      healthImport={READY_HEALTH_IMPORT}
      isLoading={false}
      isTimedOut={false}
      onBack={noop}
      onDeleteImport={noop}
      onImportPress={noop}
      onRetry={noop}
    />
  ),
  'health-dashboard-empty': () => (
    <HealthDashboardScreen
      errorMessage={null}
      healthImport={null}
      isLoading={false}
      isTimedOut={false}
      onImportPress={noop}
      onRetry={noop}
    />
  ),
  profile: () => (
    <ProfileScreen
      user={PREVIEW_USER}
      theme="system"
      onSetTheme={noop}
      reminderIntervals={{ A: 30, B: 60, C: 90, D: 180, I: 90 }}
      onSetReminderInterval={noop}
      onLogout={noop}
      onEditProfile={noop}
      onBack={noop}
    />
  ),
  'vaccination-empty': () => (
    <VaccinationScreen
      upcoming={[]}
      groups={[]}
      campaigns={[]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation={false}
      hasMunicipio={false}
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
      hasMunicipio={false}
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
      hasMunicipio={false}
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
      hasMunicipio
      isEmpty={false}
      isLoading={false}
      isRequestingLocation={false}
      errorMessage={null}
      onRetry={noop}
      onAddVaccine={noop}
      onRequestLocation={noop}
      onMarkDoseApplied={noop}
      onDeleteDose={async () => {}}
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
      hasMunicipio={false}
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
  'vaccination-location-sem-municipio': () => (
    // Reproduz o bug relatado: GPS + geocodificação resolveram a UF (o botão
    // "Ative a localização" some), mas a 2ª consulta de rede (código IBGE do
    // município) falhou sozinha — "Onde se vacinar" precisa dizer isso, não
    // fingir que buscou UBS e não achou nenhuma.
    <VaccinationScreen
      upcoming={[PENDING_ITEM]}
      groups={[HEPATITE_B_GROUP]}
      campaigns={[ACTIVE_CAMPAIGN]}
      campaignSamplingNotice={null}
      sites={[]}
      hasLocation
      hasMunicipio={false}
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
