// =============================================================================
// Arquivo: DetailHeader.tsx
// Descrição: Cabeçalho "voltar + título + ação opcional" das telas que abrem POR
// CIMA de outra: formulários (novo compromisso, novo medicamento, nova vacina,
// editar perfil, importar dados) e detalhes (documento, evolução dos
// resultados). Título em 20px.
//
// É um dos dois cabeçalhos do app depois do login. O outro é o ScreenHeader
// (título em 24px), das telas a que se chega pela barra, pelo Início ou pelo
// hub Mais. O BackHeader é só do fluxo de entrada (cadastro, confirmação,
// recuperar senha). Antes havia cópias deste cabeçalho escritas à mão em seis
// telas, com títulos de 17 a 28px
// (specs/00-fundacao/consistencia-e-textos/spec.md, D3).
// =============================================================================

import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';

type DetailHeaderProps = {
  title: string;
  onBack: () => void;
  action?: ReactNode;
};

export function DetailHeader({ title, onBack, action }: DetailHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center gap-3">
      <BackButton onPress={onBack} />

      <Text className="flex-1 text-[20px] font-semibold text-app-text dark:text-app-dark-text">
        {title}
      </Text>

      {action}
    </View>
  );
}
