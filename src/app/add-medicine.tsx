import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddMedicineScreen } from '@/screens/AddMedicineScreen';
import { lerAcaoProposta } from '../../amplify/functions/acoes-propostas-shared/camposDaAcao';

// Os parametros vem do cartao da acao proposta (E11) ou de um link de fora
// (`SuaSaude://`), e passam pela mesma conferencia de forma da funcao. So nome
// e horarios sao lidos: uma dose num link nao tem por onde entrar (D11.3 = A).
export default function AddMedicineRoute() {
  const params = useLocalSearchParams();
  const acao = lerAcaoProposta({ tipo: 'ABRIR_NOVO_LEMBRETE', campos: params });
  return <AddMedicineScreen inicial={acao?.tipo === 'ABRIR_NOVO_LEMBRETE' ? acao.campos : undefined} />;
}
