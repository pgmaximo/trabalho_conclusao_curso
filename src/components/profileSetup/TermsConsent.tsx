import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import {
  ACEITES_DO_CADASTRO,
  RESUMO_DOS_TERMOS,
  VERSAO_DOS_TERMOS,
  type AceiteDoCadastroId,
} from '@/data/termosEPrivacidade';

export type AceitesMarcados = Record<AceiteDoCadastroId, boolean>;

export const NENHUM_ACEITE_MARCADO: AceitesMarcados = {
  termos: false,
  dadosDeSaude: false,
  transferenciaInternacional: false,
};

export function todosOsAceitesMarcados(aceites: AceitesMarcados): boolean {
  return ACEITES_DO_CADASTRO.every((aceite) => aceites[aceite.id]);
}

type TermsConsentProps = {
  aceites: AceitesMarcados;
  onToggle: (id: AceiteDoCadastroId) => void;
  onOpenTerms: () => void;
};

/**
 * O aceite dos termos no fim do Perfil de Saúde, que é onde a criação da conta
 * termina (o login manda para cá toda conta sem perfil, venha ela do e-mail ou
 * do Google). É também antes de qualquer dado de saúde sair do aparelho: o
 * formulário só é enviado no "Concluir perfil".
 *
 * Três caixas, nenhuma pré-marcada, e o texto integral a um toque — ver o
 * comentário de ACEITES_DO_CADASTRO sobre por que não é uma caixa só.
 */
export function TermsConsent({ aceites, onToggle, onOpenTerms }: TermsConsentProps) {
  const colors = useThemeColors();

  return (
    <View className="rounded-2xl border border-app-border bg-app-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface">
      <Text
        accessibilityRole="header"
        className="text-[17px] font-bold text-app-text dark:text-app-dark-text"
      >
        Termos e privacidade
      </Text>

      <View className="mt-3 gap-2">
        {RESUMO_DOS_TERMOS.map((item) => (
          <View className="flex-row gap-2" key={item}>
            <Ionicons color={colors.primary} name="checkmark" size={18} />
            <Text className="flex-1 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
              {item}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="link"
        className="mt-4 flex-row items-center gap-2 self-start py-1"
        hitSlop={8}
        onPress={onOpenTerms}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <Ionicons color={colors.secondary} name="document-text-outline" size={18} />
        <Text className="text-[15px] font-semibold text-app-secondary underline dark:text-app-dark-secondary">
          Ler os Termos de Uso e a Política de Privacidade
        </Text>
      </Pressable>

      <View className="mt-3 gap-1">
        {ACEITES_DO_CADASTRO.map((aceite) => {
          const marcado = aceites[aceite.id];

          return (
            <Pressable
              accessibilityLabel={aceite.texto}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcado }}
              className="min-h-12 flex-row items-start gap-3 py-2"
              key={aceite.id}
              onPress={() => onToggle(aceite.id)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                color={marcado ? colors.primary : colors.iconMuted}
                name={marcado ? 'checkbox' : 'square-outline'}
                size={24}
              />
              <Text className="flex-1 text-[15px] leading-[22px] text-app-text dark:text-app-dark-text">
                {aceite.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-2 text-[13px] leading-[19px] text-app-textMuted dark:text-app-dark-textMuted">
        Os três são necessários para criar a conta, porque o SuaSaúde existe para guardar dados de
        saúde. Você pode revogá-los depois (seção 19). Versão {VERSAO_DOS_TERMOS}.
      </Text>
    </View>
  );
}
