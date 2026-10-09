import { router, type Href } from 'expo-router';

/**
 * Volta para a tela anterior. Sem histórico para voltar — a tela foi aberta
 * por link direto, ou a página foi recarregada na web —, vai para `fallback`,
 * para o botão de voltar nunca ficar sem efeito.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
