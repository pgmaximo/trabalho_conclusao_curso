/**
 * Resumo do arquivo:
 * Vacinação para a Home, a partir de UMA busca das doses do usuário:
 *
 * - `alert`: distinto do `preventionAlert` (que continua null, sem fonte real
 *   de "atrasado" — ver HomeScreen.tsx). Aqui há fonte real: doses "atrasada"
 *   do usuário (prioridade) ou, na ausência delas, uma campanha nacional ativa
 *   com dado real do PNI. Nunca inventa contagem — cai para `null` (card não
 *   aparece) em qualquer falha ou ausência de dado.
 * - `doseCounts`: alimenta a linha de apoio do atalho Vacinação do Acesso
 *   rápido. `null` enquanto as doses carregam ou se a busca falhou — nesse
 *   caso o atalho fica sem linha, em vez de afirmar "nenhuma vacina".
 */
import { useEffect, useState } from 'react';

import { countVaccineDoses, isDoseOverdue, type VaccineDoseCounts } from '@/services/homeVaccination';
import { getActiveVaccinationCampaignMessage } from '@/services/vaccinationCampaignSummary';
import { listVaccineDosesForUser, type VaccineDoseRecord } from '@/services/vaccinationService';

export type VaccinationHomeAlert = {
  title: string;
  subtitle: string;
};

export type HomeVaccination = {
  alert: VaccinationHomeAlert | null;
  doseCounts: VaccineDoseCounts | null;
};

function buildOverdueAlert(records: VaccineDoseRecord[], today: string): VaccinationHomeAlert | null {
  const overdue = records.filter((record) => isDoseOverdue(record, today));

  if (overdue.length === 0) {
    return null;
  }

  return {
    title: overdue.length === 1 ? 'Vacina atrasada' : 'Vacinas atrasadas',
    subtitle:
      overdue.length === 1
        ? `${overdue[0].name} está com a dose atrasada.`
        : `${overdue.length} vacinas estão com dose atrasada.`,
  };
}

export function useHomeVaccination(): HomeVaccination {
  const [alert, setAlert] = useState<VaccinationHomeAlert | null>(null);
  const [doseCounts, setDoseCounts] = useState<VaccineDoseCounts | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      let overdueAlert: VaccinationHomeAlert | null = null;

      try {
        const records = await listVaccineDosesForUser();
        if (!isMounted) return;

        const today = new Date().toISOString().slice(0, 10);
        // A contagem sai assim que as doses chegam, sem esperar a consulta da
        // campanha abaixo (outra chamada de rede, mais lenta).
        setDoseCounts(countVaccineDoses(records, today));
        overdueAlert = buildOverdueAlert(records, today);
      } catch {
        // Sem dado de doses (erro de rede, etc.) — não bloqueia a tentativa de
        // mostrar o alerta de campanha abaixo.
      }

      if (overdueAlert) {
        setAlert(overdueAlert);
        return;
      }

      try {
        const campaignMessage = await getActiveVaccinationCampaignMessage();
        if (isMounted && campaignMessage) {
          setAlert({ title: 'Campanha de vacinação ativa', subtitle: campaignMessage });
        }
      } catch {
        // idem
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { alert, doseCounts };
}
