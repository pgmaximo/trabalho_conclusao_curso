/**
 * Resumo do arquivo:
 * A secao "Resultados extraidos" da tela de detalhe do documento, com os CINCO
 * estados da leitura -- incluindo "nunca extraido", que e o estado de todo
 * documento gravado antes desta EPIC e nao e nem falha nem ausencia de
 * resultado.
 *
 * Fica num componente proprio para a tela de detalhe continuar sendo o que
 * era: os tres modos dela (visualizacao, edicao, exclusao) nao sao tocados
 * (regra 5). Esta secao entra abaixo do que ja existia.
 *
 * O que veio da tela de referencia do DASA
 * (estudos-ia/02-designs/leitura-da-tela-dasa.md): contagem no topo,
 * agrupamento por exame e o valor ao lado da faixa. O que NAO veio: o icone de
 * conferido, a seta de fora da faixa e a barra colorida -- os tres sao
 * julgamento clinico, que a regra 4 proibe.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CorrectResultPanel } from '@/components/CorrectResultPanel';
import { ExtractedResultRow } from '@/components/ExtractedResultRow';
import { InlineError } from '@/components/InlineError';
import { useThemeColors } from '@/constants/theme';
import type { UseDocumentExtractionResult } from '@/hooks/useDocumentExtraction';
import type { LabResultView } from '@/services/extractionService';
import { agruparPorExame, contarLinhas } from '@/utils/labResultGrouping';

export interface ExtractedResultsSectionProps {
  extraction: UseDocumentExtractionResult;
  onOpenSeries?: (analyteCode: string) => void;
  /** Avisa a tela que uma correcao entrou, para ela dar o retorno visivel. */
  onCorrigido?: () => void;
}

function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
      {children}
    </Text>
  );
}

export function ExtractedResultsSection({
  extraction,
  onOpenSeries,
  onCorrigido,
}: ExtractedResultsSectionProps) {
  const colors = useThemeColors();
  // Uma linha por vez em correcao, do mesmo jeito que isConfirmingDelete faz
  // com o painel de exclusao. O estado vive AQUI, e nao na tela: a tela de
  // detalhe nao precisa conhecer o tipo de uma linha de analito para mostrar
  // um documento.
  const [linhaEmCorrecao, setLinhaEmCorrecao] = useState<LabResultView | null>(null);
  const { state, isLoading, isTimedOut, isRetrying, errorMessage } = extraction;

  const linhas = state?.results ?? [];
  const contagem = contarLinhas(linhas);
  const grupos = agruparPorExame(linhas);

  const emAndamento = state?.status === 'PENDING' || state?.status === 'PROCESSING';

  return (
    <Card padding="regular" style={{ marginBottom: 20 }} variant="surface">
      <Text className="text-[18px] font-semibold text-app-text dark:text-app-dark-text">
        Resultados extraídos
      </Text>

      {isLoading && !state ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator color={colors.primary} />
          <Legenda>Carregando…</Legenda>
        </View>
      ) : null}

      {emAndamento ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator color={colors.primary} />
          <Legenda>Estamos lendo o documento. Isso leva alguns minutos.</Legenda>
        </View>
      ) : null}

      {isTimedOut ? (
        <View className="mt-3">
          <Legenda>
            A leitura está demorando mais do que o normal para este documento. Você pode conferir de
            novo daqui a pouco.
          </Legenda>
          <Button
            onPress={extraction.refresh}
            style={{ marginTop: 12 }}
            title="Conferir de novo"
            variant="secondary"
          />
        </View>
      ) : null}

      {state?.status === 'SUCCEEDED' ? (
        <View className="mt-3">
          {/* Contagem visivel. Na tela do DASA ela informa; aqui ela tambem
              protege: o estudo de leitura mediu cobertura instavel entre
              execucoes, e sem contagem uma omissao nao deixa rastro. */}
          <Legenda>
            {contagem.total === 1 ? '1 valor lido' : `${contagem.total} valores lidos`} deste
            documento
            {contagem.pendentes > 0
              ? ` · ${contagem.pendentes === 1 ? '1 espera' : `${contagem.pendentes} esperam`} sua conferência`
              : ''}
          </Legenda>

          {grupos.map((grupo) => (
            <View key={grupo.titulo} className="mt-4">
              <Text className="px-4 text-[15px] font-semibold text-app-text dark:text-app-dark-text">
                {grupo.titulo}
              </Text>

              {!grupo.comparavel ? (
                // A limitacao honesta da D32, dita onde ela importa. Nao e um
                // aviso de saude: e o limite do que o aplicativo promete.
                <Text className="px-4 pt-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
                  Guardamos estes valores do jeito que o laudo trouxe, mas não conseguimos comparar
                  com outros laboratórios.
                </Text>
              ) : null}

              <View className="mt-1">
                {grupo.linhas.map((linha) => (
                  <View key={linha.id}>
                    <ExtractedResultRow
                      emCorrecao={linhaEmCorrecao?.id === linha.id}
                      onConfirm={extraction.confirm}
                      onCorrect={setLinhaEmCorrecao}
                      onOpenSeries={onOpenSeries}
                      result={linha}
                    />
                    {linhaEmCorrecao?.id === linha.id ? (
                      <CorrectResultPanel
                        onCancel={() => setLinhaEmCorrecao(null)}
                        onDone={() => {
                          setLinhaEmCorrecao(null);
                          // Rele o banco em vez de remendar o estado local: o
                          // que a tela mostra passa a ser o que ficou gravado.
                          extraction.refresh();
                          onCorrigido?.();
                        }}
                        result={linha}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {state?.status === 'NO_RESULTS' ? (
        // Sem tom de erro e sem icone de alerta: este documento simplesmente
        // nao tem numero para acompanhar, e isso e comum e legitimo.
        <View className="mt-3">
          <Legenda>
            Este documento não tem valores acompanháveis — é o caso de laudos descritivos, culturas
            e sorologias. O arquivo continua guardado e disponível.
          </Legenda>
        </View>
      ) : null}

      {state?.status === 'FAILED' ? (
        <View className="mt-3">
          <Legenda>
            Não conseguimos ler o conteúdo deste documento. Ele continua guardado e você pode
            abri-lo normalmente.
          </Legenda>
          <Button
            disabled={isRetrying}
            onPress={extraction.retry}
            style={{ marginTop: 12 }}
            title="Tentar de novo"
            variant="secondary"
          />
        </View>
      ) : null}

      {state?.status === 'NUNCA_EXTRAIDO' ? (
        // Documento gravado antes desta EPIC. Nao e falha e nao e "sem
        // resultado": e um documento que nunca passou pela leitura.
        <View className="mt-3">
          <Legenda>Este documento foi guardado antes da leitura automática existir.</Legenda>
          <Button
            disabled={isRetrying}
            onPress={extraction.retry}
            style={{ marginTop: 12 }}
            title="Ler agora"
            variant="secondary"
          />
        </View>
      ) : null}

      {errorMessage ? (
        <View className="mt-3">
          <InlineError message={errorMessage} />
        </View>
      ) : null}

      {state && state.warnings.length > 0 ? (
        <View className="mt-4 gap-1">
          <Text className="text-[13px] font-semibold text-app-text dark:text-app-dark-text">
            O que ficou de fora
          </Text>
          {state.warnings.map((aviso) => (
            <Legenda key={aviso}>• {aviso}</Legenda>
          ))}
        </View>
      ) : null}

      {/* O rodape nao e enfeite: a regra 4 da constituicao faz do
          encaminhamento a um profissional de saude um requisito de interface,
          e esta e uma tela que mostra numero de exame. */}
      <Text className="mt-4 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
        Estes valores foram lidos automaticamente do seu documento e servem para organizar seu
        histórico. Leve o exame ao seu médico para avaliar o que eles significam.
      </Text>
    </Card>
  );
}
