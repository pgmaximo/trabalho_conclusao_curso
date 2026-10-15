/**
 * Resumo do arquivo:
 * O cartao somente-leitura do detalhe do documento: Tipo, Nome, Data e, quando
 * o documento e receita, a Data de validade.
 *
 * Extraido da DocumentDetailScreen sem mudar uma linha do que ele desenha. A
 * tela tinha 329 linhas num componente so, e as tres partes dela --
 * visualizacao, edicao e exclusao -- competiam pelo mesmo arquivo. Esta e a
 * parte mais facil de separar porque nao tem estado nenhum: recebe o que
 * mostra e mostra.
 */
import React from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { formatDateForDisplay } from '@/services/examService';

export interface DocumentSummaryCardProps {
  typeLabel: string;
  documentName: string;
  documentDate: string;
  /** So aparece em receita, e so quando foi informada. */
  expirationDate?: string;
}

export function DocumentSummaryCard({
  typeLabel,
  documentName,
  documentDate,
  expirationDate,
}: DocumentSummaryCardProps) {
  // Estreita o tipo alem de testar a presenca: a formatacao de data recebe
  // string, e o `Boolean(...)` sozinho nao diz isso ao compilador.
  const validade = expirationDate ? expirationDate : null;

  return (
    <Card padding="regular" style={{ marginBottom: 20 }} variant="surface">
      <View className="border-b border-app-border pb-3 dark:border-app-dark-border">
        <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Tipo
        </Text>
        <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
          {typeLabel}
        </Text>
      </View>

      <View className="border-b border-app-border py-3 dark:border-app-dark-border">
        <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Nome
        </Text>
        <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
          {documentName}
        </Text>
      </View>

      <View
        className={validade ? 'border-b border-app-border py-3 dark:border-app-dark-border' : 'pt-3'}
      >
        <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          Data
        </Text>
        <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
          {formatDateForDisplay(documentDate)}
        </Text>
      </View>

      {validade ? (
        <View className="pt-3">
          <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
            Data de validade
          </Text>
          <Text className="mt-1 text-[17px] font-semibold text-app-text dark:text-app-dark-text">
            {formatDateForDisplay(validade)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
