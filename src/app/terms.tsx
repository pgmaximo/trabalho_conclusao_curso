/**
 * Resumo do arquivo:
 * Rota dos Termos de Uso e da Política de Privacidade. Fora do grupo (app)
 * porque também é aberta antes do login (link do login e do cadastro) e no meio
 * do Perfil de Saúde, que empilha esta tela por cima sem perder o que já foi
 * preenchido.
 */
import React from 'react';

import { TermsScreen } from '@/screens/TermsScreen';
import { goBackOr } from '@/utils/goBack';

export default function TermsRoute() {
  return <TermsScreen onBack={() => goBackOr('/')} />;
}
