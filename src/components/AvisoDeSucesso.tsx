import React from 'react';

import { SuccessSnackbar } from '@/components/SuccessSnackbar';
import { dispensarAviso, useAvisoDeSucesso } from '@/hooks/avisoDeSucesso';

/**
 * Mostra, com o `SuccessSnackbar` de sempre, o aviso que um formulário deixou
 * ao salvar (ver `avisoDeSucesso.ts`). Fica no `AppShell`, dentro da área das
 * telas, para aparecer acima da barra de abas.
 */
export function AvisoDeSucesso() {
  const aviso = useAvisoDeSucesso();

  if (!aviso) {
    return null;
  }

  return (
    <SuccessSnackbar
      // `key`: um aviso novo remonta o snackbar, e a contagem de 4s recomeça.
      key={aviso.id}
      message={aviso.mensagem}
      onHide={() => dispensarAviso(aviso.id)}
      visible
    />
  );
}
