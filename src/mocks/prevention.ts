import type { PreventionSnapshot } from '@/types/models';

export const PREVENTION_SNAPSHOT: PreventionSnapshot = {
  alert: {
    title: 'Atenção urgente',
    description:
      'Colesterol total não medido há 14 meses. Protocolo para sua faixa etária recomenda exame anual.',
    actionLabel: 'Agendar exame agora',
  },
  score: {
    score: 68,
    maxScore: 100,
    status: 'Bom',
  },
  checks: [
    {
      id: 1,
      title: 'Hemograma completo',
      date: 'Jan 2025',
      status: 'em_dia',
    },
    {
      id: 2,
      title: 'Eletrocardiograma',
      date: 'Dez 2024',
      status: 'em_dia',
    },
    {
      id: 3,
      title: 'Colesterol total e frações',
      date: 'Mar 2024 — Vencido',
      status: 'vencido',
    },
    {
      id: 4,
      title: 'Glicemia em jejum',
      date: 'Não realizado',
      status: 'pendente',
    },
    {
      id: 5,
      title: 'TSH e T4 livre',
      date: 'Não realizado',
      status: 'pendente',
    },
    {
      id: 6,
      title: 'Pressão arterial (monit.)',
      date: 'Contínuo via wearable',
      status: 'em_dia',
    },
  ],
};
