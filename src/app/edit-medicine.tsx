import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { EditMedicineScreen } from '@/screens/EditMedicineScreen';

// Fallback de deep link vazio (GAP_ANALYSIS.md item 20): nunca renderiza `null`/tela em
// branco quando `id` está ausente — redireciona para `/medicines` em vez disso.
export default function EditMedicineRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return <Redirect href="/medicines" />;
  return <EditMedicineScreen id={id} />;
}
