/**
 * Resumo do arquivo:
 * Centraliza a saida da conta autenticada.
 * A navegacao fica nas rotas; este servico cuida apenas da sessao Cognito e local.
 */
import { signOut } from 'aws-amplify/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserSession } from './userSessionService';
import { invalidateExamsCache } from '@/hooks/useExamsData';
import { invalidateAppointmentsCache } from '@/hooks/appointmentsCache';
import { invalidateMedicinesCache } from '@/hooks/medicinesCache';
import { removeAllMedicineReminders } from '@/services/medicineReminderService';

// DECISION: remove o cache do perfil diretamente via AsyncStorage em vez de chamar
// clearUser() do UserContext — evita acoplamento de serviço com React Context
const USER_PROFILE_KEY = '@SuaSaude:userProfile';

export async function logoutUser() {
  try {
    await clearUserSession();
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    // Caches de lista (exames, agendamentos, medicamentos) não são escopados por
    // usuário — sem isso, trocar de conta no mesmo dispositivo mostra documentos/dados
    // do usuário anterior, que o AppSync corretamente rejeita ao editar/deletar
    // ("Not Authorized to access ... on type Mutation").
    await invalidateExamsCache();
    await invalidateAppointmentsCache();
    await invalidateMedicinesCache();
    await removeAllMedicineReminders().catch((error) => console.warn('Erro ao limpar lembretes locais:', error));
    await import('@/services/medicinePushService')
      .then(({ unregisterMedicinePushDevice }) => unregisterMedicinePushDevice())
      .catch((error) => console.warn('Erro ao desativar push de medicamentos:', error));
    await signOut();
  } catch (error) {
    console.log('Erro ao sair:', error);
  }
}
