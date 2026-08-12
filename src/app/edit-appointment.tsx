import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EditAppointmentScreen } from '@/screens/EditAppointmentScreen';

export default function EditAppointmentRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return null;
  return <EditAppointmentScreen id={id} />;
}
