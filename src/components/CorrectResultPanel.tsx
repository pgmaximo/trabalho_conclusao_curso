/**
 * Resumo do arquivo:
 * Painel inline de correcao de uma linha que a extracao nao conseguiu ler com
 * seguranca. E a outra metade da revisao humana: sem ele, a unica acao
 * possivel sobre uma leitura errada seria aceita-la, e a revisao viraria
 * carimbo.
 *
 * Tres decisoes, e as tres existem para nao reabrir um problema ja fechado:
 *
 * 1. Painel inline, nunca Alert.prompt -- convencao do repositorio, registrada
 *    no item 18 do GAP_ANALYSIS.md e seguida pelo DeleteConfirmPanel.
 * 2. A unidade NAO e digitada: e a que a tela ja mostra. Campo livre traria a
 *    conversao de unidade para dentro do aplicativo, e a conversao vive num
 *    lugar so, sob teste, na Lambda.
 * 3. O numero digitado passa pelo MESMO parseDecimal que leu o laudo. A pessoa
 *    digita "32,5" porque o papel diz "32,5", e parseFloat devolveria 32
 *    (D23). Corrigir uma leitura errada introduzindo o mesmo erro pelo outro
 *    lado seria ironico demais.
 */
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { InlineError } from '@/components/InlineError';
import { correctLabResult, type LabResultView } from '@/services/extractionService';

export interface CorrectResultPanelProps {
  result: LabResultView;
  onDone: () => void;
  onCancel: () => void;
}

export function CorrectResultPanel({ result, onDone, onCancel }: CorrectResultPanelProps) {
  const [digitado, setDigitado] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Quando a linha tem unidade de comparacao, e ela; sem ela, e a que estava
  // no papel. Duas opcoes, nunca um campo livre.
  const unidade = result.unit ?? result.rawUnit ?? '';

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await correctLabResult(result.id, digitado, unidade);
      if (resultado.ok) {
        onDone();
      } else {
        setErro(resultado.message);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a correção.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View
      accessibilityRole="alert"
      className="mx-4 mb-3 rounded-card border border-app-border bg-app-surfaceMuted p-4 dark:border-app-dark-border dark:bg-app-dark-surfaceMuted"
    >
      <Text className="text-[16px] font-semibold text-app-text dark:text-app-dark-text">
        Corrigir {result.projectLabel}
      </Text>

      <Text className="mt-1 text-[13px] text-app-textSecondary dark:text-app-dark-textSecondary">
        No documento está escrito{' '}
        <Text className="font-semibold text-app-text dark:text-app-dark-text">
          {result.rawValue}
          {result.rawUnit ? ` ${result.rawUnit}` : ''}
        </Text>
        {result.sourcePage ? `, na página ${result.sourcePage}` : ''}. Confira no documento e
        digite o valor como ele aparece lá.
      </Text>

      <View className="mt-3 flex-row items-center gap-3">
        <TextInput
          accessibilityLabel="Valor"
          className="flex-1 rounded-field border border-app-border bg-app-surface px-3 py-3 text-[16px] text-app-text dark:border-app-dark-border dark:bg-app-dark-surface dark:text-app-dark-text"
          // "decimal-pad" e nao "numeric": o teclado precisa ter a virgula,
          // que e o separador decimal que o laudo usa.
          keyboardType="decimal-pad"
          onChangeText={setDigitado}
          placeholder={result.rawValue}
          value={digitado}
        />
        <Text className="text-[16px] text-app-textSecondary dark:text-app-dark-textSecondary">
          {unidade}
        </Text>
      </View>

      {erro ? (
        <View className="mt-3">
          <InlineError message={erro} />
        </View>
      ) : null}

      <Button
        disabled={salvando || digitado.trim() === ''}
        disabledReason={digitado.trim() === '' ? 'Digite o valor que está no documento.' : undefined}
        loading={salvando}
        onPress={salvar}
        title="Salvar correção"
      />
      <Button disabled={salvando} onPress={onCancel} title="Cancelar" variant="secondary" />

      <Text className="mt-3 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
        O que estava escrito no documento continua guardado do jeito que estava — sua correção
        registra como esse valor deve ser acompanhado.
      </Text>
    </View>
  );
}
