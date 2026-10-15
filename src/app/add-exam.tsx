import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { AddExamScreen } from '@/screens/AddExamScreen';

export default function AddExamRoute() {
  // Este projeto usa Expo Router (nao React Navigation direto). Os params da rota
  // chegam como string (o Expo Router serializa), por isso fileSize e convertido.
  const { fileName, filePath, fileSize } = useLocalSearchParams<{
    fileName?: string;
    filePath?: string;
    fileSize?: string;
  }>();

  return (
    <AddExamScreen
      fileName={fileName ?? 'document.pdf'}
      filePath={filePath ?? ''}
      fileSize={fileSize ? Number(fileSize) : 0}
    />
  );
}
