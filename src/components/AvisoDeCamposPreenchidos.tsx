import React from 'react';
import { Text } from 'react-native';

/**
 * Resumo do arquivo:
 * A linha que avisa que o formulario abriu com campos preenchidos (E11). Mora
 * num componente so para os formularios de compromisso e de remedio dizerem a
 * MESMA frase.
 *
 * A frase e neutra de proposito, e nao "preenchido pelo assistente": o
 * formulario tambem abre preenchido por um link de fora (`SuaSaude://`), e a
 * frase nao pode atribuir ao assistente um texto que ele nao escreveu (desvio
 * registrado no `plan.md` do E11, secao 9).
 */
export const AVISO_CAMPOS_PREENCHIDOS = 'Alguns campos já vêm preenchidos. Confira antes de salvar.';

export function AvisoDeCamposPreenchidos() {
  return (
    <Text className="mb-4 mt-4 text-[14px] leading-[20px] text-app-textSecondary dark:text-app-dark-textSecondary">
      {AVISO_CAMPOS_PREENCHIDOS}
    </Text>
  );
}
