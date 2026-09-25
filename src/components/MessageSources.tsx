/**
 * Resumo do arquivo:
 * A origem dos numeros que uma resposta citou, dentro da propria bolha.
 *
 * Por que ela existe: a R4 diz que nenhum numero aparece sem origem. No
 * backend isso e campo obrigatorio do schema e conferencia contra o que as
 * ferramentas devolveram; aqui e o que a pessoa VE -- de qual exame, de que
 * data, e o caminho ate o papel.
 *
 * REGRA DE COPY: cada linha diz de onde o numero veio, e nada sobre o que ele
 * significa. Nenhuma comparacao com faixa, nenhuma palavra de julgamento.
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Citation } from '@/services/aiAssistantService';

/** AAAA-MM-DD -> DD/MM/AAAA. Data fora do formato volta como veio: inventar
 *  uma data seria pior do que mostrar a que foi registrada. */
function formatarData(iso: string | null): string {
  if (!iso) return 'sem data';
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

export function MessageSources({ citations }: { citations: Citation[] }) {
  // Uma resposta pode citar a mesma coleta duas vezes na mesma frase. Repetir
  // a origem por baixo transformaria a secao num inventario em vez de uma
  // lista de onde ir.
  const porLinha = new Map<string, Citation>();
  for (const c of citations) porLinha.set(c.resultId, c);
  const unicas = [...porLinha.values()];

  if (unicas.length === 0) return null;

  return (
    <View className="mt-3 border-t border-app-border pt-2 dark:border-app-dark-border">
      <Text className="mb-1 text-[12px] text-app-textSecondary dark:text-app-dark-textSecondary">
        {unicas.length === 1 ? 'De onde veio este número' : 'De onde vieram estes números'}
      </Text>
      {unicas.map((c) => (
        <Pressable
          accessibilityLabel={`Ver o documento de ${c.analyteLabel} de ${formatarData(c.collectedAt)}`}
          accessibilityRole="button"
          className="py-1"
          key={c.resultId}
          onPress={() => router.push(`/document-detail?id=${c.documentId}`)}
        >
          <Text className="text-[13px] text-app-primaryDark dark:text-app-dark-primaryDark">
            {`${c.analyteLabel} · ${formatarData(c.collectedAt)} · ${c.value} ${c.unit}`.trim()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
