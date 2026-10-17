/**
 * Resumo do arquivo:
 * O cache, em memoria do container, do dataset da USPSTF que
 * `consultar_prevencao` le (E7). Existe porque a D7.1 = A faz o chat baixar o
 * dataset INTEIRO, e baixa-lo a cada pergunta de prevencao seria latencia e
 * trafego repetidos por um dado que muda raramente.
 *
 * O que se guarda e dado PUBLICO, igual para todo mundo. Nada do usuario
 * passa por aqui: o filtro pelo perfil acontece depois, fora do cache.
 *
 * Fica no chat, e nao em `uspstf-shared/`, porque a Lambda da tela nao ganha
 * cache: mudar o comportamento dela esta fora do escopo do E7.
 */
import { fetchUspstfDataset } from '../../uspstf-shared/uspstfClient';
import type { UspstfDataset } from '../../uspstf-shared/uspstfClient';

/** Dez minutos: o container quente vive pouco, e o dataset muda raramente.
 *  Recalibrar se a medicao do E7 (CA-14) mostrar outra coisa. */
export const TTL_DATASET_MS = 10 * 60 * 1000;

/** Teto de espera pela API, bem abaixo dos 120 s do laco de ferramentas. */
const TIMEOUT_DA_FONTE_MS = 8000;

type Entrada = { promessa: Promise<UspstfDataset>; expiraEm: number };

let entrada: Entrada | null = null;

/**
 * Guarda a PROMESSA, e nao so o resultado: duas perguntas ao mesmo tempo num
 * container frio reaproveitam a requisicao em voo em vez de dispararem duas.
 * Mesmo padrao do `gradeTextCache` da Lambda da tela.
 */
export function obterDataset(
  apiKey: string,
  agora: () => number = Date.now,
  buscar: (chave: string) => Promise<UspstfDataset> = (chave) =>
    fetchUspstfDataset(chave, { timeoutMs: TIMEOUT_DA_FONTE_MS }),
): Promise<UspstfDataset> {
  if (entrada && agora() < entrada.expiraEm) return entrada.promessa;

  const promessa = buscar(apiKey);
  const nova: Entrada = { promessa, expiraEm: agora() + TTL_DATASET_MS };
  entrada = nova;

  // Falha nao fica guardada: sem isto, uma queda de segundos da fonte faria o
  // chat dizer "nao consegui consultar" pelos dez minutos seguintes. A
  // comparacao evita apagar uma entrada mais nova que ja a substituiu.
  promessa.catch(() => {
    if (entrada === nova) entrada = null;
  });

  return promessa;
}

/** So para teste: o cache vive no modulo, e os testes precisam de um zerado. */
export function limparCacheDoDataset(): void {
  entrada = null;
}
