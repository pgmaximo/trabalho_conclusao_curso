/**
 * Resumo do arquivo:
 * Tela "Carteira de vacinação" (4e, expandida na feat_vacina) — carteira
 * agrupada por vacina com progresso de doses, "Próximas recomendadas"
 * (Pendente/Atrasada), campanhas de vacinação com dado REAL do PNI/RNDS
 * (amplify/functions/get-vaccination-campaigns) e unidades de saúde
 * próximas reais do CNES ("Onde se vacinar"). Segunda-nível (acessada via
 * "Mais"), com cabeçalho próprio de voltar.
 *
 * A carteira aqui NÃO é o documento oficial — isso é dito explicitamente na
 * tela (RNDS/Meu SUS Digital exigem certificado ICP-Brasil, inacessível a
 * este app; ver specs da feature). É um registro pessoal complementar.
 */
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { DetailHeader } from '@/components/DetailHeader';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { Section } from '@/components/Section';
import { useThemeColors } from '@/constants/theme';
import type {
  VaccinationCampaignView,
  VaccinationSiteView,
  VaccineDoseItem,
  VaccineGroupView,
} from '@/types/models';

type VaccinationScreenProps = {
  upcoming: VaccineDoseItem[];
  groups: VaccineGroupView[];
  campaigns: VaccinationCampaignView[];
  campaignSamplingNotice: string | null;
  sites: VaccinationSiteView[];
  hasLocation: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isRequestingLocation: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onAddVaccine: () => void;
  onRequestLocation: () => void;
  onMarkDoseApplied: (item: VaccineDoseItem) => void;
};

const FILTER_OPTIONS = ['Todas', 'Pendentes', 'Atrasadas'] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

function formatDatePt(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function DoseCard({ item, onMarkApplied }: { item: VaccineDoseItem; onMarkApplied: (item: VaccineDoseItem) => void }) {
  const colors = useThemeColors();
  const isPending = item.status !== 'aplicada';

  const badge =
    item.status === 'aplicada'
      ? { label: 'Aplicada', variant: 'success' as const }
      : item.status === 'atrasada'
        ? { label: 'Atrasada', variant: 'danger' as const }
        : { label: 'Pendente', variant: 'warning' as const };

  const supportLine =
    item.status === 'aplicada' && item.appliedDate
      ? `Aplicada em ${formatDatePt(item.appliedDate)}${item.location ? ` · ${item.location}` : ''}`
      : item.description;

  return (
    <Card padding="compact" style={{ marginBottom: 10 }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {item.name}
          </Text>
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {supportLine}
          </Text>
        </View>
        {isPending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Marcar como aplicada"
            accessibilityHint="Toque para registrar a data em que esta dose foi tomada"
            onPress={() => onMarkApplied(item)}
            hitSlop={8}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pressed && { opacity: 0.6 }]}
          >
            <Badge label={badge.label} variant={badge.variant} />
            <Ionicons color={colors.textMuted} name="chevron-forward" size={14} />
          </Pressable>
        ) : (
          <Badge label={badge.label} variant={badge.variant} />
        )}
      </View>
    </Card>
  );
}

function DosePip({ filled }: { filled: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      className="size-3 rounded-full"
      style={{ backgroundColor: filled ? colors.success : colors.border }}
    />
  );
}

function VaccineGroupCard({
  group,
  onMarkApplied,
}: {
  group: VaccineGroupView;
  onMarkApplied: (item: VaccineDoseItem) => void;
}) {
  const colors = useThemeColors();
  const total = group.seriesTotal;
  const applied = group.dosesAplicadas.length;

  const progressLabel =
    total && total > 1
      ? `${applied} de ${total} doses`
      : applied > 0
        ? 'Aplicada'
        : 'Nenhuma dose registrada';

  return (
    <Card padding="compact" style={{ marginBottom: 10 }}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
          {group.nome}
        </Text>
        <Text className="text-[13px] font-semibold text-app-textSecondary dark:text-app-dark-textSecondary">
          {progressLabel}
        </Text>
      </View>

      {total && total > 1 ? (
        <View className="mt-2 flex-row gap-1.5">
          {Array.from({ length: total }, (_, index) => (
            <DosePip key={index} filled={index < applied} />
          ))}
        </View>
      ) : null}

      {group.dosesAplicadas.length > 0 ? (
        <View className="mt-3 gap-1.5">
          {group.dosesAplicadas.map((dose) => (
            <Text key={dose.id} className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {dose.doseNumber ? `${dose.doseNumber}ª dose` : 'Dose'} · {dose.appliedDate ? formatDatePt(dose.appliedDate) : '—'}
              {dose.location ? ` · ${dose.location}` : ''}
              {dose.manufacturer ? ` · ${dose.manufacturer}` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {group.proximaDose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Marcar como aplicada"
          accessibilityHint="Toque para registrar a data em que esta dose foi tomada"
          onPress={() => onMarkApplied(group.proximaDose as VaccineDoseItem)}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, pressed && { opacity: 0.6 }]}
        >
          <Badge
            label={group.proximaDose.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
            variant={group.proximaDose.status === 'atrasada' ? 'danger' : 'warning'}
          />
          <Text className="flex-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {group.proximaDose.doseNumber ? `${group.proximaDose.doseNumber}ª dose` : 'Próxima dose'}
            {group.proximaDose.dueDate ? ` · ${formatDatePt(group.proximaDose.dueDate)}` : ''}
          </Text>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={14} />
        </Pressable>
      ) : null}
    </Card>
  );
}

function CampaignCard({ campaign }: { campaign: VaccinationCampaignView }) {
  const colors = useThemeColors();

  const janela =
    campaign.janelaInicio && campaign.janelaFim
      ? `${formatDatePt(campaign.janelaInicio)} a ${formatDatePt(campaign.janelaFim)}`
      : null;

  const contagem =
    campaign.dosesNoPeriodo !== null && campaign.dosesNoPeriodo !== undefined
      ? `${campaign.dosesNoPeriodo.toLocaleString('pt-BR')} doses registradas no período${
          campaign.ufReferencia ? ` em ${campaign.ufReferencia}` : ' no Brasil'
        } (amostra do PNI/RNDS).`
      : 'Sem contagem de doses disponível para este recorte ainda.';

  return (
    <View className="mb-4 gap-2 rounded-app border border-app-successBadgeBorder bg-app-successSoft px-4 py-3 dark:border-app-dark-successBadgeBorder dark:bg-app-dark-successSoft">
      <View className="flex-row items-start gap-3">
        <View className="size-6 items-center justify-center rounded-full bg-app-successIconBg dark:bg-app-dark-successIconBg">
          <Ionicons color="#FFFFFF" name="medical" size={14} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold leading-[20px] text-app-primaryDark dark:text-app-dark-primaryDark">
            {campaign.nome}
          </Text>
          {janela ? (
            <Text className="mt-0.5 text-[13px] text-app-primaryDark dark:text-app-dark-primaryDark">{janela}</Text>
          ) : null}
        </View>
      </View>
      <Text className="text-[13px] leading-[18px] text-app-primaryDark dark:text-app-dark-primaryDark">
        {contagem}
      </Text>
      {campaign.dataAsOf ? (
        <Text className="text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
          Dado mais recente disponível: {formatDatePt(campaign.dataAsOf)}.
        </Text>
      ) : null}
      <Pressable onPress={() => Linking.openURL(campaign.fonteUrl)}>
        <Text className="text-[12px] font-semibold" style={{ color: colors.primary }}>
          Ver fonte oficial
        </Text>
      </Pressable>
    </View>
  );
}

function SiteRow({ site }: { site: VaccinationSiteView }) {
  return (
    <Card padding="compact" style={{ marginBottom: 8 }}>
      <Text className="text-[15px] font-semibold text-app-text dark:text-app-dark-text">{site.nome}</Text>
      {site.logradouro || site.bairro ? (
        <Text className="mt-0.5 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {[site.logradouro, site.bairro].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {site.distanciaKm !== null ? (
        <Text className="mt-0.5 text-[12px] text-app-textMuted dark:text-app-dark-textMuted">
          {site.distanciaKm < 1
            ? `${Math.round(site.distanciaKm * 1000)} m`
            : `${site.distanciaKm.toFixed(1)} km`}
        </Text>
      ) : null}
    </Card>
  );
}

export function VaccinationScreen({
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
  onRetry,
  onAddVaccine,
  onRequestLocation,
  onMarkDoseApplied,
}: VaccinationScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<FilterOption>('Todas');

  const filteredUpcoming = useMemo(() => {
    if (filter === 'Todas') return upcoming;
    if (filter === 'Pendentes') return upcoming.filter((item) => item.status === 'pendente');
    return upcoming.filter((item) => item.status === 'atrasada');
  }, [upcoming, filter]);

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background" edges={['top']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerClassName="px-6 pb-12 pt-6" showsVerticalScrollIndicator={false}>
        <DetailHeader
          title="Carteira de vacinação"
          onBack={() => router.back()}
          action={
            <Pressable
              accessibilityLabel="Adicionar vacina"
              accessibilityRole="button"
              onPress={onAddVaccine}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="size-12 items-center justify-center rounded-field border-[1.5px] border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft"
            >
              <Ionicons color={colors.primary} name="add" size={22} />
            </Pressable>
          }
        />

        <Card padding="compact" variant="outlined" style={{ marginBottom: 16 }}>
          <Text className="text-[13px] leading-[18px] text-app-textSecondary dark:text-app-dark-textSecondary">
            Esta carteira é um registro pessoal — não é o documento oficial do SUS. Para a carteira
            oficial, consulte o Meu SUS Digital.
          </Text>
        </Card>

        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.catalogId} campaign={campaign} />
        ))}

        {campaignSamplingNotice ? (
          // Explica a contagem (ou a ausência de campanha) do bloco logo
          // acima — mantido perto do que ele descreve; renderizar no fim da
          // tela deixava a nota "órfã", sem relação visual com o dado que
          // ela qualifica (achado ao revisar screenshots de
          // scripts/preview-screenshot.mjs).
          <Text className="mb-4 text-[11px] leading-[15px] text-app-textMuted dark:text-app-dark-textMuted">
            {campaignSamplingNotice}
          </Text>
        ) : null}

        {!hasLocation ? (
          <Pressable
            accessibilityRole="button"
            disabled={isRequestingLocation}
            onPress={onRequestLocation}
            className="mb-4 flex-row items-center gap-3 rounded-app border border-app-infoBadgeBorder bg-app-infoSoft px-4 py-3 dark:border-app-dark-infoBadgeBorder dark:bg-app-dark-infoSoft"
          >
            <View className="size-8 items-center justify-center rounded-full bg-app-infoIconBg dark:bg-app-dark-infoIconBg">
              <Ionicons color="#FFFFFF" name="location" size={16} />
            </View>
            <Text className="flex-1 text-[14px] leading-[19px] text-app-text dark:text-app-dark-text">
              {isRequestingLocation
                ? 'Buscando sua localização...'
                : 'Ative a localização para ver campanhas da sua região e unidades de saúde próximas.'}
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <ScreenSkeleton blocks={3} />
        ) : errorMessage ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar sua carteira"
            description={errorMessage}
            tone="error"
            actionLabel="Tentar novamente"
            onActionPress={onRetry}
          />
        ) : isEmpty ? (
          <EmptyState
            icon="medical-outline"
            title="Você ainda não tem vacinas registradas."
            description="Adicione uma dose já aplicada ou uma recomendação futura para começar sua carteira."
            actionLabel="Adicionar vacina"
            onActionPress={onAddVaccine}
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Section title="Próximas recomendadas">
                <FilterChips
                  options={[...FILTER_OPTIONS]}
                  activeFilter={filter}
                  onFilterChange={(value) => setFilter(value as FilterOption)}
                />
                {filteredUpcoming.map((item) => (
                  <DoseCard key={item.id} item={item} onMarkApplied={onMarkDoseApplied} />
                ))}
              </Section>
            ) : null}

            {groups.length > 0 ? (
              <Section title="Carteira por vacina">
                {groups.map((group) => (
                  <VaccineGroupCard key={group.catalogId} group={group} onMarkApplied={onMarkDoseApplied} />
                ))}
              </Section>
            ) : null}

            {hasLocation ? (
              <Section title="Onde se vacinar">
                {sites.length > 0 ? (
                  sites.map((site) => <SiteRow key={site.cnes} site={site} />)
                ) : (
                  <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Nenhuma unidade básica de saúde encontrada para o seu município.
                  </Text>
                )}
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
