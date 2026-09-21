/**
 * Resumo do arquivo:
 * Uma linha de analito na tela de detalhe do documento.
 *
 * REGRA DE COPY DESTE ARQUIVO: nada aqui diz se o valor e bom ou ruim. Sem
 * "normal", sem "alterado", sem cor de semaforo sobre o numero. A faixa do
 * laboratorio aparece ao lado do valor e quem a le e a pessoa -- comparar os
 * dois e interpretacao clinica, e a regra 4 da constituicao a proibe.
 *
 * A tela de referencia (estudos-ia/02-designs/leitura-da-tela-dasa.md) marca
 * cada linha com um sinal verde ou laranja. Nos copiamos a estrutura de tres
 * colunas e NAO copiamos o veredito: um laboratorio e servico de saude com
 * responsabilidade tecnica assinada, e este aplicativo e organizacao de
 * informacao com encaminhamento a um profissional.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import type { LabResultView } from '@/services/extractionService';
import { formatarDecimal, formatarFaixa } from '@/utils/decimalDisplay';

/**
 * Token de AVISO, nunca o de erro. Uma linha pendente nao e uma falha: e uma
 * pergunta. Pintar de vermelho ensinaria a pessoa a ignora-la -- e ela e
 * exatamente a linha que precisa de atencao.
 *
 * Exportado para o teste poder provar a escolha do token sem depender de como
 * o nativewind serializa className no ambiente de teste.
 */
export const CLASSE_LINHA_PENDENTE =
  'border-l-4 border-l-app-warning bg-app-warningSoft dark:border-l-app-dark-warning dark:bg-app-dark-warningSoft';

export interface ExtractedResultRowProps {
  result: LabResultView;
  onConfirm: (id: string) => void;
  onCorrect: (result: LabResultView) => void;
  onOpenSeries?: (analyteCode: string) => void;
  /** Some enquanto o painel de correcao daquela linha esta aberto. */
  emCorrecao?: boolean;
}

export function ExtractedResultRow({
  result,
  onConfirm,
  onCorrect,
  onOpenSeries,
  emCorrecao = false,
}: ExtractedResultRowProps) {
  const colors = useThemeColors();
  const pendente = result.reviewStatus === 'PENDENTE_DE_REVISAO';
  const faixa = formatarFaixa(result.referenceLow, result.referenceHigh);
  const unidade = result.unit ?? result.rawUnit ?? '';

  // A mesma precedencia da tela de serie (decisao E3): numero, depois texto.
  // O texto NAO recebe `unidade` -- ele ja traz a do papel, e nunca converteu.
  const referencia = faixa
    ? `Referência do laboratório: ${faixa} ${unidade}`.trim()
    : result.rawReferenceText
      ? `Referência do laboratório: ${result.rawReferenceText}`
      : null;

  const detalhes = [
    referencia,
    result.collectionMoment,
    result.sourcePage ? `página ${result.sourcePage}` : null,
  ].filter(Boolean);

  return (
    <View
      className={`px-4 py-3 ${pendente ? CLASSE_LINHA_PENDENTE : ''}`}
      accessibilityLabel={`${result.projectLabel}: ${formatarDecimal(result.value)} ${unidade}`}
    >
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="flex-1 text-[16px] text-app-text dark:text-app-dark-text">
          {result.projectLabel}
        </Text>
        <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">
          {result.valueQualifier ?? ''}
          {formatarDecimal(result.value)} {unidade}
        </Text>
      </View>

      {detalhes.length > 0 ? (
        <View className="mt-1 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
            {detalhes.join(' · ')}
          </Text>
          {onOpenSeries && !pendente ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver a evolução de ${result.projectLabel}`}
              onPress={() => onOpenSeries(result.analyteCode)}
            >
              <Text className="text-[13px] font-semibold" style={{ color: colors.primary }}>
                Evolução
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {result.valueQualifier ? (
        <Text className="mt-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
          O laboratório informou este resultado como um limite, não como uma medida — por isso ele
          não entra na comparação entre coletas.
        </Text>
      ) : null}

      {pendente && !emCorrecao ? (
        <View className="mt-2">
          <Text className="text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
            Não conseguimos ler este valor com segurança. No documento está escrito{' '}
            <Text className="font-semibold text-app-text dark:text-app-dark-text">
              {result.rawValue}
              {result.rawUnit ? ` ${result.rawUnit}` : ''}
            </Text>
            . Confira no documento antes de confirmar.
          </Text>
          <View className="mt-2 flex-row gap-5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirmar a leitura de ${result.projectLabel}`}
              onPress={() => onConfirm(result.id)}
            >
              <Text className="text-[15px] font-semibold" style={{ color: colors.primary }}>
                Confirmar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Corrigir a leitura de ${result.projectLabel}`}
              onPress={() => onCorrect(result)}
            >
              <Text className="text-[15px] font-semibold" style={{ color: colors.primary }}>
                Corrigir
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
