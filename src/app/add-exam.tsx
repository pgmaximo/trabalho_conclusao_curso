import React from 'react';
import { useRoute } from '@react-navigation/native';
import { AddExamScreen } from '@/screens/AddExamScreen';

export default function AddExamRoute() {
  const route = useRoute();

  const { fileName, filePath, fileSize } = (route.params as any) || {
    fileName: 'document.pdf',
    filePath: '',
    fileSize: 0,
  };

  return <AddExamScreen fileName={fileName} filePath={filePath} fileSize={fileSize} />;
}
