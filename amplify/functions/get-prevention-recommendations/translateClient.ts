/**
 * Resumo do arquivo:
 * Traduz o conteudo da USPSTF (ingles) para portugues via a API gratuita do
 * MyMemory (sem chave, sem conta AWS paga — ao contrario do Amazon Translate,
 * que exige upgrade de plano da conta AWS). Usado apenas para exibir uma
 * adaptacao em portugues ao lado do texto oficial verbatim em ingles — nunca
 * substitui o texto original, que continua sendo retornado sem alteracoes
 * (exigencia dos termos de direitos autorais da AHRQ).
 */

const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';

// Cache em memoria por execucao "quente" da funcao — reduz chamadas repetidas
// enquanto o mesmo container Lambda estiver ativo (nao persiste entre cold
// starts; um cache persistente em DynamoDB seria o proximo passo se a cota
// gratuita de 5.000 palavras/dia por IP se mostrar insuficiente na pratica).
const translationCache = new Map<string, string>();

// Uso anonimo (sem e-mail de contato) fica limitado a 5.000 palavras/dia por
// IP. Assim que a API sinalizar cota esgotada, paramos de tentar traduzir
// pelo resto desta invocacao e caimos de volta para o texto em ingles.
let quotaExhausted = false;

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number;
  quotaFinished?: boolean;
};

/**
 * Traduz um texto do ingles para portugues (pt-BR). Em caso de falha (cota
 * esgotada, erro de rede, resposta inesperada, etc.), retorna o texto original
 * em ingles como fallback silencioso — o app sempre tem o texto oficial
 * disponivel de qualquer forma.
 */
export async function translateToPortuguese(text: string | null | undefined): Promise<string | null> {
  if (!text) {
    return null;
  }

  if (quotaExhausted) {
    return text;
  }

  const cached = translationCache.get(text);
  if (cached) {
    return cached;
  }

  try {
    const url = `${MYMEMORY_API_URL}?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`MyMemory retornou status ${response.status}`);
    }

    const data = (await response.json()) as MyMemoryResponse;

    if (data.quotaFinished) {
      quotaExhausted = true;
    }

    const translated = data.responseData?.translatedText;

    if (!translated || data.responseStatus !== 200) {
      return text;
    }

    translationCache.set(text, translated);
    return translated;
  } catch (error) {
    console.error('Erro ao traduzir texto da USPSTF para português (MyMemory):', error);
    return text;
  }
}
