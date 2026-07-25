import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface DateInputProps {
  label: string;
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DateInput({ label, value, onChange, placeholder }: DateInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());

  function formatDisplayDate(dateString: string): string {
    if (!dateString) return placeholder || 'DD/MM/YYYY';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  function handleDateSelect(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    onChange(formattedDate);
    setSelectedDate(date);
    setIsVisible(false);
  }

  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function renderCalendar() {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
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
          const isSelected =
            day &&
            day === selectedDate.getDate() &&
            selectedDate.getMonth() === new Date().getMonth() &&
            selectedDate.getFullYear() === new Date().getFullYear();

          return (
            <Pressable
              key={dayIndex}
              style={[
                styles.dayButton,
                ...(isSelected ? [styles.dayButtonSelected] : []),
              ]}
              onPress={() => {
                if (day) {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(day);
                  handleDateSelect(newDate);
                }
              }}
              disabled={!day}
            >
              {day && (
                <Text
                  style={[
                    styles.dayText,
                    ...(isSelected ? [styles.dayTextSelected] : []),
                  ]}
                >
                  {day}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    ));
  }

  const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.inputButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.inputText}>{formatDisplayDate(value)}</Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </Pressable>

      <Modal visible={isVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                style={styles.navButton}
              >
                <Text style={styles.navButtonText}>←</Text>
              </Pressable>
              <Text style={styles.monthYear}>{monthName}</Text>
              <Pressable
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                style={styles.navButton}
              >
                <Text style={styles.navButtonText}>→</Text>
              </Pressable>
            </View>

            <View style={styles.weekDays}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            <ScrollView style={styles.daysContainer} scrollEnabled={false}>
              {renderCalendar()}
            </ScrollView>

            <Pressable
              style={styles.confirmButton}
              onPress={() => setIsVisible(false)}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SIZES.large,
  },
  label: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SIZES.small,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.base,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  calendarIcon: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.large,
    width: '85%',
    maxWidth: 350,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.large,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  monthYear: {
    ...FONTS.subtitle,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: SIZES.base,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    ...FONTS.caption,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.primary,
  },
  dayText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    alignItems: 'center',
  },
  confirmButtonText: {
    ...FONTS.body,
    color: '#fff',
    fontWeight: '700',
  },
});
