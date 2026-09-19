import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { FONTS, SIZES, useThemeColors } from '@/constants/theme';
import type { CalendarDateItem } from '@/types/models';

interface CalendarPickerProps {
  selectedDate: string; // AAAA-MM-DD
  onDateSelect: (isoDate: string) => void;
  dates: CalendarDateItem[];
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
        const isSelected = selectedDate === date.isoDate;
        return (
          <Pressable
            key={date.isoDate}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.dateButton,
              {
                borderColor: isSelected ? colors.primary : date.isToday ? colors.secondary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.surface,
              },
            ]}
            onPress={() => onDateSelect(date.isoDate)}
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
