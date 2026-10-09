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
import { DeleteConfirmPanel } from '@/components/DeleteConfirmPanel';
import { DetailHeader } from '@/components/DetailHeader';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { InlineError } from '@/components/InlineError';
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
  hasMunicipio: boolean;
  isEmpty: boolean;
  isLoading: boolean;
  isRequestingLocation: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onAddVaccine: () => void;
  onRequestLocation: () => void;
  onMarkDoseApplied: (item: VaccineDoseItem) => void;
  /** Exclui um registro lançado por engano. Sem ela, a tela não desenha a
   *  lixeira: a Carteira não mostra controle que não faz nada. */
  onDeleteDose?: (item: VaccineDoseItem) => Promise<void>;
};

// O que os cartões precisam para excluir: quem está com a pergunta aberta,
// quem está sendo excluído e o erro da última tentativa. Um registro de cada vez.
type DeleteControls = {
  confirmingId: string | null;
  deletingId: string | null;
  error: { id: string; message: string } | null;
  onAsk: (item: VaccineDoseItem) => void;
  onCancel: () => void;
  onConfirm: (item: VaccineDoseItem) => void;
};

const DELETE_QUESTION = 'Excluir este registro de vacina? Essa ação não pode ser desfeita.';

const FILTER_OPTIONS = ['Todas', 'Pendentes', 'Atrasadas'] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

/**
 * Único ponto que decide se um status bate com o filtro selecionado — usado
 * tanto por "Próximas recomendadas" quanto pela "próxima dose" de cada card
 * de "Carteira por vacina". Antes, só a primeira lista respeitava o filtro;
 * a segunda continuava mostrando doses Pendente mesmo com "Atrasadas"
 * selecionado, o que parecia (e era, na prática) o filtro "não funcionar".
 */
function matchesFilter(status: VaccineDoseItem['status'], filter: FilterOption): boolean {
  if (filter === 'Todas') return true;
  if (filter === 'Pendentes') return status === 'pendente';
  return status === 'atrasada';
}

const EMPTY_FILTER_MESSAGE: Record<FilterOption, string> = {
  Todas: 'Nenhuma vacina pendente ou atrasada no momento.',
  Pendentes: 'Nenhuma vacina pendente no momento.',
  Atrasadas: 'Nenhuma vacina atrasada no momento.',
};

function formatDatePt(iso: string): string {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

// DECISION (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D3): marcar
// como aplicada era tocar no SELO de status, que não parece um botão. O selo
// voltou a ser só status, e a ação ganhou um botão com o nome dela.
function MarkAppliedButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Toque para registrar a data em que esta dose foi tomada"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      className="h-12 flex-1 items-center justify-center rounded-field border-[1.5px] border-app-primary dark:border-app-dark-primary"
    >
      <Text className="text-[16px] font-semibold text-app-primary dark:text-app-dark-primary">
        Marcar como aplicada
      </Text>
    </Pressable>
  );
}

function DeleteDoseButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      className="size-12 items-center justify-center rounded-field"
    >
      <Ionicons color={colors.textSecondary} name="trash-outline" size={20} />
    </Pressable>
  );
}

// Pergunta e erro da exclusão, logo abaixo do registro a que se referem.
function DeleteDosePanel({ item, controls }: { item: VaccineDoseItem; controls?: DeleteControls }) {
  if (!controls) return null;

  const hasError = controls.error?.id === item.id;
  const isConfirming = controls.confirmingId === item.id;

  if (!hasError && !isConfirming) return null;

  return (
    <View className="mt-3">
      {hasError ? <InlineError message={controls.error?.message ?? ''} /> : null}
      {isConfirming ? (
        <DeleteConfirmPanel
          isDeleting={controls.deletingId === item.id}
          message={DELETE_QUESTION}
          onCancel={controls.onCancel}
          onConfirm={() => controls.onConfirm(item)}
        />
      ) : null}
    </View>
  );
}

function DoseCard({
  item,
  onMarkApplied,
  deleteControls,
}: {
  item: VaccineDoseItem;
  onMarkApplied: (item: VaccineDoseItem) => void;
  deleteControls?: DeleteControls;
}) {
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
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {item.name}
          </Text>
          <Text className="mt-1 text-[15px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {supportLine}
          </Text>
        </View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>

      {isPending || deleteControls ? (
        <View className="mt-3 flex-row items-center justify-end gap-2">
          {isPending ? <MarkAppliedButton onPress={() => onMarkApplied(item)} /> : null}
          {deleteControls ? (
            <DeleteDoseButton label={`Excluir ${item.name}`} onPress={() => deleteControls.onAsk(item)} />
          ) : null}
        </View>
      ) : null}

      <DeleteDosePanel controls={deleteControls} item={item} />
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
  filter,
  onMarkApplied,
  deleteControls,
}: {
  group: VaccineGroupView;
  filter: FilterOption;
  onMarkApplied: (item: VaccineDoseItem) => void;
  deleteControls?: DeleteControls;
}) {
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
          {group.dosesAplicadas.map((dose) => {
            const doseLabel = dose.doseNumber ? `${dose.doseNumber}ª dose` : 'Dose';

            return (
              <View key={dose.id}>
                <View className="flex-row items-center gap-2">
                  <Text className="flex-1 text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    {doseLabel} · {dose.appliedDate ? formatDatePt(dose.appliedDate) : '—'}
                    {dose.location ? ` · ${dose.location}` : ''}
                    {dose.manufacturer ? ` · ${dose.manufacturer}` : ''}
                  </Text>
                  {deleteControls ? (
                    <DeleteDoseButton
                      label={`Excluir ${group.nome}, ${doseLabel}`}
                      onPress={() => deleteControls.onAsk(dose)}
                    />
                  ) : null}
                </View>
                <DeleteDosePanel controls={deleteControls} item={dose} />
              </View>
            );
          })}
        </View>
      ) : null}

      {group.proximaDose && matchesFilter(group.proximaDose.status, filter) ? (
        // Borda + rótulo "Próxima dose" separam claramente esta linha do
        // histórico de doses aplicadas logo acima — sem isso, o badge podia
        // ser lido como se qualificasse a última dose aplicada em vez da
        // dose futura que ele de fato descreve (achado relatado pelo
        // usuário: "parece que a primeira dose está pendente, não a segunda").
        <View className="mt-3 border-t border-app-border pt-3 dark:border-app-dark-border">
          <Text className="mb-2 text-[12px] font-semibold uppercase text-app-textMuted dark:text-app-dark-textMuted">
            Próxima dose
          </Text>
          <View className="flex-row items-center gap-2">
            <Badge
              label={group.proximaDose.status === 'atrasada' ? 'Atrasada' : 'Pendente'}
              variant={group.proximaDose.status === 'atrasada' ? 'danger' : 'warning'}
            />
            <Text className="flex-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {group.proximaDose.doseNumber ? `${group.proximaDose.doseNumber}ª dose` : 'Dose'}
              {group.proximaDose.dueDate ? ` · ${formatDatePt(group.proximaDose.dueDate)}` : ''}
            </Text>
          </View>
          <View className="mt-3 flex-row">
            <MarkAppliedButton onPress={() => onMarkApplied(group.proximaDose as VaccineDoseItem)} />
          </View>
        </View>
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
          <Ionicons color={colors.onPrimary} name="medical" size={14} />
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
  hasMunicipio,
  isEmpty,
  isLoading,
  isRequestingLocation,
  errorMessage,
  onRetry,
  onAddVaccine,
  onRequestLocation,
  onMarkDoseApplied,
  onDeleteDose,
}: VaccinationScreenProps) {
  const { colorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<FilterOption>('Todas');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  async function confirmDelete(item: VaccineDoseItem) {
    if (!onDeleteDose) return;

    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await onDeleteDose(item);
    } catch (error) {
      // O registro continua na tela, com o motivo logo abaixo dele.
      setDeleteError({
        id: item.id,
        message: error instanceof Error ? error.message : 'Não foi possível excluir a vacina.',
      });
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  const deleteControls: DeleteControls | undefined = onDeleteDose
    ? {
        confirmingId: confirmingDeleteId,
        deletingId,
        error: deleteError,
        onAsk: (item) => {
          setDeleteError(null);
          setConfirmingDeleteId(item.id);
        },
        onCancel: () => setConfirmingDeleteId(null),
        onConfirm: (item) => void confirmDelete(item),
      }
    : undefined;

  const filteredUpcoming = useMemo(
    () => upcoming.filter((item) => matchesFilter(item.status, filter)),
    [upcoming, filter],
  );

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
              <Ionicons color={colors.onPrimary} name="location" size={16} />
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
                {filteredUpcoming.length > 0 ? (
                  filteredUpcoming.map((item) => (
                    <DoseCard
                      key={item.id}
                      deleteControls={deleteControls}
                      item={item}
                      onMarkApplied={onMarkDoseApplied}
                    />
                  ))
                ) : (
                  <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    {EMPTY_FILTER_MESSAGE[filter]}
                  </Text>
                )}
              </Section>
            ) : null}

            {groups.length > 0 ? (
              <Section title="Carteira por vacina">
                {groups.map((group) => (
                  <VaccineGroupCard
                    key={group.catalogId}
                    deleteControls={deleteControls}
                    group={group}
                    filter={filter}
                    onMarkApplied={onMarkDoseApplied}
                  />
                ))}
              </Section>
            ) : null}

            {hasLocation ? (
              <Section title="Onde se vacinar">
                {!hasMunicipio ? (
                  // hasLocation só garante a UF (GPS + geocodificação) — o
                  // código IBGE do município é uma segunda consulta de rede
                  // independente que pode falhar sozinha. Dizer "nenhuma UBS
                  // encontrada" aqui seria afirmar uma busca que nunca
                  // aconteceu (regra de nunca fingir dado que não é real).
                  <Text className="text-[14px] text-app-textSecondary dark:text-app-dark-textSecondary">
                    Não foi possível identificar seu município para buscar unidades de saúde próximas.
                  </Text>
                ) : sites.length > 0 ? (
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
