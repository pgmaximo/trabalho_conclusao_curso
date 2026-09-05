/**
 * Resumo do arquivo:
 * Alerta de vacinação para a Home — distinto do `preventionAlert` (que
 * continua null, sem fonte real de "atrasado" — ver HomeScreen.tsx). Aqui há
 * fonte real: doses "atrasada" do usuário (prioridade) ou, na ausência delas,
 * uma campanha nacional ativa com dado real do PNI. Nunca inventa contagem —
 * cai para `null` (card não aparece) em qualquer falha ou ausência de dado.
 */
import { useEffect, useState } from 'react';

import { getActiveVaccinationCampaignMessage } from '@/services/vaccinationCampaignSummary';
import { listVaccineDosesForUser } from '@/services/vaccinationService';

export type VaccinationHomeAlert = {
  title: string;
  subtitle: string;
};

async function computeVaccinationAlert(): Promise<VaccinationHomeAlert | null> {
  try {
    const records = await listVaccineDosesForUser();
    const today = new Date().toISOString().slice(0, 10);
    const overdue = records.filter((record) => !record.appliedDate && record.dueDate && record.dueDate < today);

    if (overdue.length > 0) {
      return {
        title: overdue.length === 1 ? 'Vacina atrasada' : 'Vacinas atrasadas',
        subtitle:
          overdue.length === 1
            ? `${overdue[0].name} está com a dose atrasada.`
            : `${overdue.length} vacinas estão com dose atrasada.`,
      };
    }
  } catch {
    // Sem dado de doses (erro de rede, etc.) — não bloqueia a tentativa de
    // mostrar o alerta de campanha abaixo.
  }

  try {
    const campaignMessage = await getActiveVaccinationCampaignMessage();
    if (campaignMessage) {
      return { title: 'Campanha de vacinação ativa', subtitle: campaignMessage };
    }
  } catch {
    // idem
  }

  return null;
}

export function useVaccinationAlert(): VaccinationHomeAlert | null {
  const [alert, setAlert] = useState<VaccinationHomeAlert | null>(null);

  useEffect(() => {
    let isMounted = true;

    computeVaccinationAlert().then((result) => {
      if (isMounted) {
        setAlert(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return alert;
}
