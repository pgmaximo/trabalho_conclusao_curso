// =============================================================================
// Arquivo: useAsyncResource.ts
// Descrição: Hook genérico para gerenciar recursos assíncronos com estados
// Hook: useAsyncResource
// =============================================================================
//
// Este hook implementa um padrão reutilizável para gerenciar operações
// assíncronas com estados de loading, success e error. É a base para todos
// os outros hooks de dados do aplicativo.
//
// Funcionalidades:
// - Estados de loading, success e error
// - Dados tipados com TypeScript generics
// - Funcionalidade de retry automática
// - Proteção contra memory leaks (cleanup)
// - Tratamento de erros padronizado
// - Dados iniciais opcionais
//
// Estados:
// - loading: Operação em andamento
// - success: Operação concluída com sucesso
// - error: Operação falhou
//
// =============================================================================

// Importações necessárias
import { useEffect, useState } from 'react';  // Hooks do React

// Estados possíveis para recursos assíncronos
type AsyncResourceStatus = 'loading' | 'success' | 'error';

// Estado completo do recurso assíncrono
type AsyncResourceState<T> = {
  data: T | null;              // Dados carregados (null se não carregado)
  status: AsyncResourceStatus;  // Estado atual do recurso
  errorMessage: string | null;  // Mensagem de erro (null se não houver erro)
  retry: () => void;           // Função para tentar novamente
};

/**
 * Hook genérico para gerenciar recursos assíncronos
 * @param loadResource - Função assíncrona para carregar dados
 * @param initialData - Dados iniciais opcionais (padrão: null)
 * @returns Objeto com estado do recurso e função de retry
 */
export function useAsyncResource<T>(
  loadResource: () => Promise<T>,  // Função assíncrona para carregar dados
  initialData: T | null = null     // Dados iniciais opcionais
): AsyncResourceState<T> {
  // Estados do hook
  const [data, setData] = useState<T | null>(initialData);           // Dados carregados
  const [status, setStatus] = useState<AsyncResourceStatus>('loading'); // Estado atual
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Mensagem de erro
  const [reloadToken, setReloadToken] = useState(0);                  // Token para retry

  // Effect para carregar dados quando mudar o reloadToken
  useEffect(() => {
    let isMounted = true;  // Flag para evitar memory leaks

    // Função assíncrona para executar o carregamento
    async function executeLoad() {
      // Define estado inicial de loading
      setStatus('loading');
      setErrorMessage(null);

      try {
        // Executa a função assíncrona
        const resource = await loadResource();

        // Verifica se componente ainda está montado
        if (!isMounted) {
          return;
        }

        // Atualiza estado de sucesso
        setData(resource);
        setStatus('success');
      } catch (error) {
        // Verifica se componente ainda está montado
        if (!isMounted) {
          return;
        }

        // Atualiza estado de erro com mensagem apropriada
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
        );
      }
    }

    // Executa o carregamento
    void executeLoad();

    // Cleanup function para evitar memory leaks
    return () => {
      isMounted = false;
    };
  }, [loadResource, reloadToken]);  // Dependências

  // Retorna estado completo e função de retry
  return {
    data,                           // Dados carregados
    status,                         // Estado atual
    errorMessage,                   // Mensagem de erro
    retry: () => setReloadToken((currentValue) => currentValue + 1), // Incrementa token para retry
  };
}
