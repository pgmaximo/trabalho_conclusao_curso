/**
 * Bottom sheet exibida após salvar um medicamento novo quando há interação
 * conhecida com algum medicamento já ativo do usuário (AddMedicineScreen).
 * Nunca bloqueia o salvamento — o registro já foi criado antes desta tela
 * aparecer; o único efeito do botão "Entendi" é fechar o aviso e navegar.
 */
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { FONTS, SPACING, useThemeColors } from '@/constants/theme';
import type { DrugInteractionMatch } from '@/services/drugInteractionService';

type DrugInteractionSheetProps = {
  visible: boolean;
  matches: DrugInteractionMatch[];
  onClose: () => void;
};

export function DrugInteractionSheet({ visible, matches, onClose }: DrugInteractionSheetProps) {
  const colors = useThemeColors();

  if (matches.length === 0) return null;

  return (
    <BottomSheet visible={visible} title="Possível interação medicamentosa" onClose={onClose}>
      {matches.map((match) => {
        const isDanger = match.severity === 'danger';
        const backgroundColor = isDanger ? colors.dangerSoft : colors.warningSoft;
        const borderColor = isDanger ? colors.dangerBadgeBorder : colors.warningBadgeBorder;
        const textColor = isDanger ? colors.danger : colors.warning;

        return (
          <View key={match.pair.id} style={[styles.card, { backgroundColor, borderColor }]}>
            <View style={styles.cardHeader}>
              <Ionicons color={textColor} name="warning" size={16} />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                {match.medicineA.name} + {match.medicineB.name}
              </Text>
            </View>
            <Text style={[styles.cardText, { color: textColor }]}>{match.riskPt}</Text>
            <Text style={[styles.cardText, { color: textColor }]}>{match.mechanismPt}</Text>
          </View>
        );
      })}

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Isto não substitui orientação médica — converse com seu médico ou farmacêutico antes de continuar ou ajustar o tratamento.
      </Text>

      <Button title="Entendi" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: SPACING.md,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardTitle: {
    ...FONTS.bodyStrong,
  },
  cardText: {
    ...FONTS.caption,
    lineHeight: 20,
  },
  disclaimer: {
    ...FONTS.caption,
  },
});
