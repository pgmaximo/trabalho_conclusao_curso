import type { MedicalDocument, MedicalDocumentFilter } from '@/types/models';

export const MEDICAL_DOCUMENT_FILTERS: MedicalDocumentFilter[] = [
  'Todos',
  'Exames',
  'Receitas',
  'Laudos',
];

export const MEDICAL_DOCUMENTS: MedicalDocument[] = [
  {
    icon: '✅',
    title: 'Hemograma completo',
    subtitle: '15 jan 2025 - Dr. Silva',
    statusLabel: 'PDF',
    statusColor: '#F39C12',
    category: 'Exames',
  },
  {
    icon: '💊',
    title: 'Receita — Losartana 50mg',
    subtitle: '10 jan 2025 - Dr. Gomes',
    statusLabel: 'Receita',
    statusColor: '#3498DB',
    category: 'Receitas',
  },
  {
    icon: '❤️',
    title: 'ECG — Eletrocardiograma',
    subtitle: '05 dez 2024 - Hospital IMT',
    statusLabel: 'Laudo',
    statusColor: '#27AE60',
    category: 'Laudos',
  },
  {
    icon: '🩸',
    title: 'Colesterol total e frações',
    subtitle: 'Mar 2024 - Lab Central',
    statusLabel: 'Expirado',
    statusColor: '#E74C3C',
    category: 'Exames',
  },
  {
    icon: '📋',
    title: 'TSH e T4 livre',
    subtitle: 'Jul 2023 - Lab Central',
    statusLabel: 'Expirado',
    statusColor: '#E74C3C',
    category: 'Exames',
  },
];
