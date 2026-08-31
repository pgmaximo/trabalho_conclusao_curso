import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { FONTS, SIZES, useThemeColors } from '@/constants/theme';

interface CalendarPickerProps {
  selectedDate: number;
  onDateSelect: (date: number) => void;
  dates: { day: number; month: string; hasAppointments?: boolean }[];
}

export function CalendarPicker({ selectedDate, onDateSelect, dates }: CalendarPickerProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map((date) => {
        const isSelected = selectedDate === date.day;
        return (
          <Pressable
            key={`${date.day}-${date.month}`}
            style={[
              styles.dateButton,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => onDateSelect(date.day)}
          >
            <Text style={[styles.dayText, { color: isSelected ? colors.onPrimary : colors.text }]}>
              {date.day}
            </Text>
            <Text
              style={[
                styles.monthText,
                { color: isSelected ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              {date.month}
            </Text>
            {date.hasAppointments && !isSelected && (
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.base,
    gap: SIZES.small,
  },
  dateButton: {
    width: 60,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  dayText: {
    ...FONTS.heading,
    fontSize: 18,
    fontWeight: '600',
  },
  monthText: {
    ...FONTS.caption,
    fontSize: 11,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
