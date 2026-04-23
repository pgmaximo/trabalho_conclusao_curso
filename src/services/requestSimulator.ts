// =============================================================================
// Arquivo: requestSimulator.ts
// Descrição: Simulador de requisições assíncronas para desenvolvimento
// =============================================================================
//
// Este arquivo implementa um simulador de requisições HTTP para replicar
// o comportamento de APIs reais durante o desenvolvimento. Permite simular
// delays, erros e sucessos para testar estados de loading e error.
//
// Funcionalidades:
// - Simulação de delay configurável
// - Simulação de erros controlados
// - Suporte a generics TypeScript para tipagem segura
// - Interface simples para uso em serviços
//
// Uso:
// - simulateRequest(data, { delayMs: 300 }): Simula requisição com delay
// - simulateRequest(data, { shouldFail: true }): Simula erro
// - simulateRequest(data): Simula requisição instantânea
//
// =============================================================================

/**
 * Função para simular requisições assíncronas com opções configuráveis
 * @param result - Dados que serão retornados em caso de sucesso
 * @param options - Opções de configuração da simulação
 * @returns Promise com os dados ou erro simulado
 */
export async function simulateRequest<T>(
  result: T,  // Dados a serem retornados (tipado com generics)
  options?: {
    delayMs?: number;           // Delay em milissegundos (padrão: 250ms)
    errorMessage?: string;     // Mensagem de erro personalizada
    shouldFail?: boolean;       // Se deve simular falha (padrão: false)
  }
): Promise<T> {
  // Define o delay (padrão: 250ms se não especificado)
  const delayMs = options?.delayMs ?? 250;

  // Simula delay da requisição usando Promise e setTimeout
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

  // Verifica se deve simular falha
  if (options?.shouldFail) {
    // Lança erro com mensagem personalizada ou padrão
    throw new Error(
      options.errorMessage ?? 'Nao foi possivel concluir a solicitacao.'
    );
  }

  // Retorna os dados em caso de sucesso
  return result;
}
