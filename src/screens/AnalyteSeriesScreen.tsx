/**
 * Resumo do arquivo:
 * Tela de comparacao entre coletas do mesmo analito.
 *
 * REGRA DE COPY DESTA TELA: nada aqui diz se o numero e bom, ruim, normal ou
 * alterado, e nada calcula tendencia. Um grafico que sobe ja sugere um
 * julgamento -- acrescentar palavra ou cor a isso e interpretacao clinica, que
 * a regra 4 da constituicao proibe. A tela mostra numero, faixa e origem; quem
 * interpreta e o profissional de saude, e e para ele que o rodape encaminha.
 *
 * A tela e apresentacional: quem consulta o backend e o hook, na rota, como em
 * health-data.tsx e no detalhe do documento. E o que permite testar os quatro
 * estados sem rede.
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyteCollectionRow } from '@/components/AnalyteCollectionRow';
import { AnalyteSeriesChart } from '@/components/AnalyteSeriesChart';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DetailHeader } from '@/components/DetailHeader';
import { InlineError } from '@/components/InlineError';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';
import { useThemeColors } from '@/constants/theme';
import type { UseAnalyteSeriesResult } from '@/hooks/useAnalyteSeries';
import type { ExclusionReason } from '@/services/analyteSeries';

/**
 * O motivo de cada exclusao, em portugues. Sao FRASES DE FATO, nunca de
 * julgamento: dizem o que aconteceu com a leitura, e nao o que o valor
 * significa. "Aguarda sua conferencia" e uma afirmacao sobre a nossa
 * confianca; "alterado" seria uma afirmacao sobre a pessoa.
 */
const MOTIVOS: Record<ExclusionReason, string> = {
  'pendente-de-revisao': 'aguarda sua conferência',
  'sem-valor': 'não pôde ser lido com segurança',
  'sem-data': 'está sem a data da coleta',
  'limite-de-deteccao': 'foi informado como um limite, não como uma medida',
  'unidade-divergente': 'está em outra unidade de medida',
};

export interface AnalyteSeriesScreenProps {
  state: UseAnalyteSeriesResult;
}

/** Botao de escolha em fileira. O Button do repositorio e `w-full` por
 *  contrato, entao um seletor lado a lado precisa do Pressable, do mesmo jeito
 *  que a tela de detalhe do documento ja faz. */
function Chip({
  label,
  selecionado,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      className={`rounded-pill border px-4 py-2 ${
        selecionado
          ? 'border-app-primary bg-app-primarySoft dark:border-app-dark-primary dark:bg-app-dark-primarySoft'
          : 'border-app-border bg-app-surface dark:border-app-dark-border dark:bg-app-dark-surface'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-[14px] ${
          selecionado
            ? 'font-semibold text-app-primaryDark dark:text-app-dark-primaryDark'
            : 'text-app-text dark:text-app-dark-text'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
      {children}
    </Text>
  );
}

export function AnalyteSeriesScreen({ state }: AnalyteSeriesScreenProps) {
  const colors = useThemeColors();
  const serie = state.activeSeries;

  // Mais de um momento significa que a mesma substancia foi medida em
  // condicoes que nao se comparam (D22). Com um momento so, a escolha nao
  // existe e o seletor nao aparece.
  const temVariosMomentos = state.series.length > 1;

  return (
    <SafeAreaView className="flex-1 bg-app-background dark:bg-app-dark-background">
      <DetailHeader onBack={() => router.back()} title="Evolução dos resultados" />

      <ScrollView contentContainerClassName="px-6 pb-32" showsVerticalScrollIndicator={false}>
        {state.errorMessage ? <InlineError message={state.errorMessage} /> : null}

        {state.isLoading ? <ScreenSkeleton blocks={2} /> : null}

        {/* Estado 1: nenhum exame com valor extraido. Sem tom de erro: a
            pessoa nao fez nada errado, so ainda nao ha o que comparar. */}
        {!state.isLoading && state.options.length === 0 ? (
          <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
            <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">
              Ainda não há resultados para acompanhar
            </Text>
            <View className="mt-2">
              <Legenda>
                Assim que você adicionar um exame com valores, eles aparecem aqui e passam a ser
                comparados entre uma coleta e outra.
              </Legenda>
            </View>
            <Button
              onPress={() => router.push('/add-exam')}
              title="Adicionar um exame"
              variant="primary"
            />
          </Card>
        ) : null}

        {/* Seletor de analito */}
        {state.options.length > 0 ? (
          <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
            <Legenda>Resultado</Legenda>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {state.options.map((opcao) => (
                <Chip
                  key={opcao.analyteCode}
                  label={`${opcao.projectLabel} (${opcao.collectionCount})`}
                  onPress={() => state.selectCode(opcao.analyteCode)}
                  selecionado={opcao.analyteCode === state.selectedCode}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {/* Seletor de momento -- so quando ha mais de um (D22) */}
        {temVariosMomentos ? (
          <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
            <Legenda>Momento da coleta</Legenda>
            <View className="mt-1">
              <Legenda>
                Este exame foi colhido em momentos diferentes. Cada momento é acompanhado
                separadamente.
              </Legenda>
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {state.series.map((x) => (
                <Chip
                  key={x.collectionMoment ?? 'sem-momento'}
                  label={x.collectionMoment ?? 'Sem momento informado'}
                  onPress={() => state.selectMoment(x.collectionMoment)}
                  selecionado={x.collectionMoment === serie?.collectionMoment}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {serie ? (
          <>
            {/* Estado 2: duas coletas ou mais -- o grafico */}
            {serie.points.length >= 2 ? (
              <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
                <AnalyteSeriesChart referenceRange={state.referenceRange} series={serie} />
              </Card>
            ) : null}

            {/* Estado 3: uma coleta so. Um grafico de um ponto nao e uma
                serie: e um ponto com eixos em volta. */}
            {serie.points.length === 1 ? (
              <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
                <Legenda>
                  Você tem uma coleta deste resultado. Ainda não há com o que comparar — quando
                  você adicionar outro exame com o mesmo resultado, a comparação aparece aqui.
                </Legenda>
              </Card>
            ) : null}

            {/* Estado 4: existe linha, mas nenhuma que entre na comparacao */}
            {serie.points.length === 0 ? (
              <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
                <Legenda>
                  Ainda não há valor deste resultado pronto para comparar. Veja abaixo o que está
                  faltando em cada coleta.
                </Legenda>
              </Card>
            ) : null}

            {/* O que ficou de fora. Contado e explicado, nunca omitido: uma
                tela que mostra dois pontos quando existem tres, sem dizer
                nada, mente por omissao. */}
            {serie.excluded.length > 0 ? (
              <Card padding="regular" style={{ marginTop: 16 }} variant="outlined">
                <Text className="text-[14px] text-app-text dark:text-app-dark-text">
                  {serie.excluded.length === 1
                    ? `1 resultado ${MOTIVOS[serie.excluded[0].reason]} e não entrou na comparação.`
                    : `${serie.excluded.length} resultados não entraram na comparação.`}
                </Text>

                {serie.excluded.map((item) => (
                  <Pressable
                    accessibilityLabel={`Ver o documento de ${item.collectedAt ?? 'data não informada'}`}
                    accessibilityRole="button"
                    className="mt-2"
                    key={item.id}
                    onPress={() => router.push(`/document-detail?id=${item.documentId}`)}
                  >
                    <Text className="text-[13px]" style={{ color: colors.primary }}>
                      {item.collectedAt ?? 'Sem data'}
                      {/* Com UMA exclusao o resumo acima ja disse o motivo;
                          repeti-lo aqui e ruido. Com varias, o resumo so tem a
                          contagem, e cada linha precisa dizer o seu. */}
                      {serie.excluded.length > 1 ? ` · ${MOTIVOS[item.reason]}` : ''} · ver
                      documento
                    </Text>
                  </Pressable>
                ))}
              </Card>
            ) : null}

            {/* Lista das coletas, da mais recente para a mais antiga */}
            {serie.points.length > 0 ? (
              <Card padding="regular" style={{ marginTop: 16 }} variant="surface">
                <Legenda>Coletas</Legenda>
                {[...serie.points].reverse().map((ponto) => (
                  <AnalyteCollectionRow key={ponto.id} point={ponto} unit={serie.unit} />
                ))}
              </Card>
            ) : null}

            {/* Requisito de interface da regra 4, nao cortesia de texto. */}
            <Text className="mt-4 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
              Estes números vieram dos seus documentos e servem para organizar seu histórico. Leve
              seus exames ao seu médico para avaliar o que eles significam.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
