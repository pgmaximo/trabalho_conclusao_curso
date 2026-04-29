import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface CalendarPickerProps {
  selectedDate: number;
  onDateSelect: (date: number) => void;
  dates: Array<{ day: number; month: string; hasAppointments?: boolean }>;
}

export function CalendarPicker({ selectedDate, onDateSelect, dates }: CalendarPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map((date, index) => (
        <Pressable
          key={index}
          style={[
            styles.dateButton,
            selectedDate === date.day && styles.dateButtonSelected,
          ]}
          onPress={() => onDateSelect(date.day)}
        >
          <Text
            style={[
              styles.dayText,
              selectedDate === date.day && styles.dayTextSelected,
            ]}
          >
            {date.day}
          </Text>
          <Text
            style={[
              styles.monthText,
              selectedDate === date.day && styles.monthTextSelected,
            ]}
          >
            {date.month}
          </Text>
          {date.hasAppointments && selectedDate !== date.day && (
            <View style={styles.dot} />
          )}
        </Pressable>
      ))}
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dateButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    ...FONTS.heading,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#fff',
  },
  monthText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  monthTextSelected: {
    color: '#fff',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
});
