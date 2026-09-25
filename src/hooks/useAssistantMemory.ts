/**
 * Resumo do arquivo:
 * O estado da tela de memória (D34, M9). A rota é dona do hook e a tela é
 * apresentacional, como em `analyte-series.tsx` e no detalhe do documento.
 *
 * Tudo o que ele expõe é um direito do art. 18 da LGPD com outro nome: `fatos`
 * é o acesso (II), `editar` é a correção (III), `apagar` e `apagarTudo` são a
 * eliminação (IV e VI), e `definirLigada` é a revogação (IX).
 */
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';

import {
  apagarFato,
  apagarTodosOsFatos,
  editarFato,
  lerInterruptor,
  listarFatos,
  definirInterruptor,
  type FatoSalvo,
  type ResultadoDaGravacao,
} from '@/services/assistantMemoryService';
import type { MemoryKind } from '../../amplify/functions/chat-assistant/memoria/regras';

export interface UseAssistantMemoryReturn {
  fatos: FatoSalvo[];
  carregando: boolean;
  ligada: boolean;
  apagar: (id: string) => void | Promise<void>;
  apagarTudo: () => void | Promise<void>;
  editar: (id: string, texto: string, tipo: MemoryKind) => Promise<ResultadoDaGravacao>;
  definirLigada: (ligada: boolean) => void | Promise<void>;
  abrirConversa: (conversationId: string) => void;
}

export function useAssistantMemory(): UseAssistantMemoryReturn {
  const [fatos, setFatos] = useState<FatoSalvo[]>([]);
  const [ligada, setLigada] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, interruptor] = await Promise.all([listarFatos(), lerInterruptor()]);
      setFatos(lista);
      setLigada(interruptor);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const apagar = useCallback(
    async (id: string) => {
      await apagarFato(id);
      await recarregar();
    },
    [recarregar],
  );

  const apagarTudo = useCallback(async () => {
    await apagarTodosOsFatos();
    await recarregar();
  }, [recarregar]);

  const editar = useCallback(
    async (id: string, texto: string, tipo: MemoryKind) => {
      const resultado = await editarFato(id, texto, tipo);
      if (resultado.ok) await recarregar();
      return resultado;
    },
    [recarregar],
  );

  const definirLigada = useCallback(async (novoEstado: boolean) => {
    // O estado da tela muda antes da gravação para o interruptor não parecer
    // travado. A gravação é a fonte da verdade na próxima leitura.
    setLigada(novoEstado);
    await definirInterruptor(novoEstado);
  }, []);

  const abrirConversa = useCallback((conversationId: string) => {
    router.push({ pathname: '/(app)/ai', params: { conversationId } });
  }, []);

  return { fatos, carregando, ligada, apagar, apagarTudo, editar, definirLigada, abrirConversa };
}
