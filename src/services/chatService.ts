/**
 * Resumo do arquivo:
 * Camada de servico que abstrai a chamada de IA do chat de saude.
 * Hoje retorna respostas mockadas; a UI/hook nao sabem que e mock.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatService {
  // userContext (futuro): perfil + exames serializados injetados no system prompt
  sendMessage: (message: string, history: ChatMessage[], userContext?: string) => Promise<string>;
}

const MOCK_RESPONSES = [
  'Baseado no seu perfil, recomendo consultar um médico para avaliar esses resultados.',
  'Seus exames indicam que os valores estão dentro da faixa normal para sua idade.',
  'Para entender melhor esse resultado, seria útil verificar o histórico dos últimos 6 meses.',
  'Posso analisar seu exame com mais detalhes. Você pode me enviar o arquivo pelo botão de anexo.',
];

export async function sendMessage(
  message: string,
  _history: ChatMessage[],
  _userContext?: string,
): Promise<string> {
  // DECISION: delay simulado de 1–2s para parecer processamento real
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

// ATTENTION: para conectar a Claude API, substituir apenas este sendMessage por:
//   import Anthropic from '@anthropic-ai/sdk';
//   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//   const completion = await client.messages.create({
//     model: 'claude-sonnet-4-6',
//     max_tokens: 1024,
//     system: userContext,                       // perfil + exames serializados
//     messages: history.map((m) => ({ role: m.role, content: m.content }))
//       .concat({ role: 'user', content: message }),
//   });
//   return completion.content[0].type === 'text' ? completion.content[0].text : '';
// A interface ChatService permanece a mesma — UI e hook nao mudam.
