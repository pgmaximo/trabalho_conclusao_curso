import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddAppointmentScreen } from '@/screens/AddAppointmentScreen';
import { lerAcaoProposta } from '../../amplify/functions/acoes-propostas-shared/camposDaAcao';

// Os parametros vem do cartao da acao proposta (E11) -- ou de um link de fora,
// porque o app tem esquema `SuaSaude://`. Por isso passam pela MESMA
// conferencia de forma da funcao e do servico: o que nao passa vira campo
// vazio, e nada e gravado sem o toque em Salvar.
export default function AddAppointmentRoute() {
  const params = useLocalSearchParams();
  const acao = lerAcaoProposta({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: params });
  return <AddAppointmentScreen inicial={acao?.tipo === 'ABRIR_NOVO_AGENDAMENTO' ? acao.campos : undefined} />;
}
