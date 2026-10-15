import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FONTS, RADII, SIZES, useThemeColors, type ThemeColors } from '@/constants/theme';

interface DateInputProps {
  label: string;
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  /** Data máxima selecionável (YYYY-MM-DD, inclusive) — dias posteriores ficam desabilitados e não respondem a toque. Usado, por exemplo, para impedir uma data de aplicação de vacina no futuro. */
  maxDate?: string;
  /** Sobrepõe o estilo do container (ex.: zerar marginTop quando o espaçamento já é controlado por um wrapper externo, como a linha Data/Hora). */
  containerStyle?: StyleProp<ViewStyle>;
}

const PLACEHOLDER_PADRAO = 'DD/MM/AAAA';

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// "AAAA-MM-DD" é uma data de CALENDÁRIO, sem fuso. `new Date('2026-10-01')` a
// lê como meia-noite UTC, e no Brasil (UTC-3) isso é 30/09 às 21h: o calendário
// reabria no dia — e, no dia 1º, no mês — anterior ao que a pessoa guardou. Aqui
// a data é montada com os números, no fuso do aparelho.
function parseIsoDate(value: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!partes) return null;
  const date = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function primeiroDiaDoMes(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DateInput({ label, value, onChange, placeholder, maxDate, containerStyle }: DateInputProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isVisible, setIsVisible] = useState(false);
  // O mês que o calendário está MOSTRANDO. A data escolhida não mora aqui: ela
  // é a prop `value`, e por isso navegar pelos meses nunca muda o que está guardado.
  const [mesVisivel, setMesVisivel] = useState(() => primeiroDiaDoMes(parseIsoDate(value) ?? new Date()));

  const mesMaximo = maxDate ? parseIsoDate(maxDate) : null;
  const limite = mesMaximo ? primeiroDiaDoMes(mesMaximo) : null;

  function formatDisplayDate(dateString: string): string {
    if (!dateString) return placeholder || PLACEHOLDER_PADRAO;
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  function abrir() {
    // Reabre sempre no mês da data guardada (ou no de hoje), e não onde a
    // pessoa parou de navegar da última vez.
    setMesVisivel(primeiroDiaDoMes(parseIsoDate(value) ?? new Date()));
    setIsVisible(true);
  }

  function handleDateSelect(date: Date) {
    onChange(toIsoDateString(date));
    setIsVisible(false);
  }

  // Avançar nunca leva a um mês em que todos os dias estão proibidos: com data
  // máxima, o calendário para no mês dela.
  function irPara(ano: number, mes: number) {
    const destino = new Date(ano, mes, 1);
    setMesVisivel(limite && destino > limite ? limite : destino);
  }

  const ano = mesVisivel.getFullYear();
  const mes = mesVisivel.getMonth();
  const estaNoLimite = Boolean(limite) && mesVisivel.getTime() >= (limite as Date).getTime();

  function renderCalendar() {
    const daysInMonth = new Date(ano, mes + 1, 0).getDate();
    const firstDay = mesVisivel.getDay();
    const days: (number | null)[] = Array(firstDay).fill(null);

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <View key={weekIndex} style={styles.weekRow}>
        {week.map((day, dayIndex) => {
          if (!day) {
            return <View key={dayIndex} style={styles.dayButton} />;
          }

          const dayDate = new Date(ano, mes, day);
          const iso = toIsoDateString(dayDate);
          // Compara a data INTEIRA: comparar só o número do dia marcava "15"
          // em todos os meses depois de a pessoa escolher o dia 15 de um deles.
          const isSelected = iso === value;
          const isDisabled = Boolean(maxDate) && iso > (maxDate as string);

          return (
            <Pressable
              key={dayIndex}
              accessibilityLabel={dayDate.toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => handleDateSelect(dayDate)}
              style={[styles.dayButton, isSelected ? styles.dayButtonSelected : null]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected ? styles.dayTextSelected : null,
                  isDisabled ? styles.dayTextDisabled : null,
                ]}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ));
  }

  const nomeDoMes = mesVisivel.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${value ? formatDisplayDate(value) : 'não informada'}`}
        accessibilityRole="button"
        style={styles.inputButton}
        onPress={abrir}
      >
        <Text style={[styles.inputText, !value ? styles.inputTextPlaceholder : null]}>
          {formatDisplayDate(value)}
        </Text>
        <Ionicons color={colors.textSecondary} name="calendar-outline" size={18} style={styles.calendarIcon} />
      </Pressable>

      <Modal visible={isVisible} transparent animationType="fade" onRequestClose={() => setIsVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Ano e mês em linhas separadas, cada uma com as suas setas. Só
                com as setas de mês, uma data de dez anos atrás (uma vacina
                antiga, por exemplo) pedia mais de cem toques. */}
            <SeletorDePeriodo
              anterior="Ano anterior"
              proximo="Próximo ano"
              proximoDesabilitado={estaNoLimite}
              rotulo={String(ano)}
              styles={styles}
              colors={colors}
              onAnterior={() => irPara(ano - 1, mes)}
              onProximo={() => irPara(ano + 1, mes)}
            />
            <SeletorDePeriodo
              anterior="Mês anterior"
              proximo="Próximo mês"
              proximoDesabilitado={estaNoLimite}
              rotulo={nomeDoMes}
              styles={styles}
              colors={colors}
              onAnterior={() => irPara(ano, mes - 1)}
              onProximo={() => irPara(ano, mes + 1)}
            />

            <View style={styles.weekDays}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <Text key={index} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            <ScrollView style={styles.daysContainer} scrollEnabled={false}>
              {renderCalendar()}
            </ScrollView>

            {/* Tocar num dia já escolhe e fecha. Este botão sempre foi a saída
                SEM escolher — e se chamava "Confirmar", o que não confirmava nada. */}
            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

type SeletorDePeriodoProps = {
  rotulo: string;
  anterior: string;
  proximo: string;
  proximoDesabilitado: boolean;
  onAnterior: () => void;
  onProximo: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
};

function SeletorDePeriodo({
  rotulo,
  anterior,
  proximo,
  proximoDesabilitado,
  onAnterior,
  onProximo,
  styles,
  colors,
}: SeletorDePeriodoProps) {
  return (
    <View style={styles.periodRow}>
      <Pressable
        accessibilityLabel={anterior}
        accessibilityRole="button"
        hitSlop={4}
        onPress={onAnterior}
        style={styles.navButton}
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.periodLabel}>{rotulo}</Text>
      <Pressable
        accessibilityLabel={proximo}
        accessibilityRole="button"
        accessibilityState={{ disabled: proximoDesabilitado }}
        disabled={proximoDesabilitado}
        hitSlop={4}
        onPress={onProximo}
        style={[styles.navButton, proximoDesabilitado ? styles.navButtonDisabled : null]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginTop: SIZES.large,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: SIZES.small,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBackground,
    borderRadius: RADII.field,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: SIZES.base,
    height: 56,
  },
  inputText: {
    ...FONTS.body,
    color: colors.text,
  },
  inputTextPlaceholder: {
    color: colors.placeholder,
  },
  calendarIcon: {
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    borderCurve: 'continuous',
    padding: SIZES.large,
    width: '85%',
    maxWidth: 350,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  periodLabel: {
    ...FONTS.bodyStrong,
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekDays: {
    flexDirection: 'row',
    marginTop: SIZES.small,
    marginBottom: SIZES.base,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    ...FONTS.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  daysContainer: {
    marginBottom: SIZES.large,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SIZES.small,
  },
  dayButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...FONTS.body,
    color: colors.text,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.textMuted,
    opacity: 0.4,
  },
  // Botão secundário do app (contorno verde), como os demais "Cancelar".
  cancelButton: {
    height: 52,
    borderRadius: RADII.field,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...FONTS.bodyStrong,
    color: colors.primary,
  },
});
