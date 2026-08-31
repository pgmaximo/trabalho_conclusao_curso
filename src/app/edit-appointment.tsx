import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { EditAppointmentScreen } from '@/screens/EditAppointmentScreen';

// Deep link/cold start sem `?id=` nunca deve renderizar tela em branco (mesmo
// gap corrigido em document-detail/3c) — redireciona para a Agenda.
export default function EditAppointmentRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (!id) {
      router.replace('/appointments');
    }
  }, [id]);

  if (!id) return null;
  return <EditAppointmentScreen id={id} />;
}
