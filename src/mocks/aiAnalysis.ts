import type { AIAnalysisSnapshot } from '@/types/models';

export const AI_ANALYSIS_SNAPSHOT: AIAnalysisSnapshot = {
  introMessage:
    'Envie a foto ou PDF do seu exame e faço uma análise preliminar dos resultados.',
  userMessage: 'Aqui está meu hemograma',
  analysisTitle: 'Hemograma — Análise preliminar',
  analysisSubtitle: 'Identifiquei os seguintes pontos:',
  recommendation:
    'A ferritina está abaixo do nível. Converse com seu médico sobre suplementação de ferro.',
  historyLabel: 'Ver histórico de análises anteriores →',
  historyCount: '5 análises nos últimos 6 meses',
  actions: [
    { icon: '📷', label: 'Câmera' },
    { icon: '📄', label: 'PDF' },
    { icon: '📊', label: 'Histórico' },
  ],
  metrics: [
    { label: 'Ferritina', value: '18 ng/mL', status: 'Baixo', statusColor: '#F39C12' },
    { label: 'Glicose', value: '92 mg/dL', status: 'Normal', statusColor: '#27AE60' },
    {
      label: 'Colesterol total',
      value: '182 mg/dL',
      status: 'Normal',
      statusColor: '#27AE60',
    },
    { label: 'Hemoglobina', value: '11.2 g/dL', status: 'Atenção', statusColor: '#E74C3C' },
  ],
};
