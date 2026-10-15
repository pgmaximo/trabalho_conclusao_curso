import { useSyncExternalStore } from 'react';

/**
 * O aviso de "salvou" que atravessa a navegação.
 *
 * Os formulários (compromisso, documento, medicamento, vacina, perfil) fecham
 * assim que salvam, e quem confirma é a tela para onde a pessoa volta. Por isso
 * o aviso mora aqui, fora do React: o formulário chama `avisarSucesso(...)` e
 * navega; o `AvisoDeSucesso`, montado no `AppShell`, mostra.
 *
 * Cada aviso tem um `id` para que a mesma frase, avisada duas vezes seguidas,
 * apareça de novo e recomece a contagem
 * (specs/00-fundacao/consistencia-e-textos/spec.md, D5).
 */
export type Aviso = { id: number; mensagem: string };

let avisoAtual: Aviso | null = null;
let proximoId = 1;
const ouvintes = new Set<() => void>();

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function lerAviso() {
  return avisoAtual;
}

export function avisarSucesso(mensagem: string) {
  avisoAtual = { id: proximoId, mensagem };
  proximoId += 1;
  notificar();
}

/**
 * Tira o aviso da tela. Com `id`, só tira se ele ainda for o aviso da vez: o
 * relógio de um aviso antigo não pode apagar o que chegou depois.
 */
export function dispensarAviso(id?: number) {
  if (avisoAtual === null || (id !== undefined && avisoAtual.id !== id)) {
    return;
  }
  avisoAtual = null;
  notificar();
}

export function useAvisoDeSucesso(): Aviso | null {
  return useSyncExternalStore(assinar, lerAviso, lerAviso);
}
