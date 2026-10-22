// E12 itens 2 e 3: muitas conversas e uma conversa longa, pelo proprio chatHistoryService do app.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Amplify } = require('aws-amplify');
const { signIn, signOut } = require('aws-amplify/auth');

(async () => {

const S = process.env.SCRATCH as string;
const OUT = JSON.parse(fs.readFileSync(path.join(S, 'outputs', 'amplify_outputs.json'), 'utf8'));
const CREDS = JSON.parse(fs.readFileSync(path.join(S, 'test-users.json'), 'utf8'));
Amplify.configure(OUT);
await signOut().catch(() => {});
await signIn({ username: CREDS.A.email, password: CREDS.A.password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });

const h = require('../../../../../src/services/chatHistoryService.ts');

const antes = (await h.listarConversas()).length;
const NOVAS = 130;
for (let i = 0; i < NOVAS; i++) await h.criarConversa(`conversa de teste ${i}`);
const longa = (await h.criarConversa('conversa longa de teste')) as string;
for (let i = 0; i < 60; i++) {
  await h.salvarTurno(longa, { pergunta: `pergunta ${i}`, resposta: `resposta ${i}`, citations: [], ruleCheckStatus: 'APROVADA' });
}
const lista = await h.listarConversas();
const msgs = await h.lerMensagens(longa);
console.log(JSON.stringify({ conversasAntes: antes, criadas: NOVAS + 1, listadas: lista.length, mensagensDaLonga: (msgs as any[]).length, primeira: (msgs as any[])[0]?.content, ultima: (msgs as any[]).at(-1)?.content }));

await h.apagarConversa(longa);
const tabela = execFileSync('aws', ['dynamodb', 'list-tables', '--query', "TableNames[?starts_with(@,'ChatMessage-3v4vuz')]|[0]", '--output', 'text']).toString().trim();
const sobra = execFileSync('aws', ['dynamodb', 'query', '--table-name', tabela, '--index-name', 'chatMessagesByConversationId', '--key-condition-expression', 'conversationId = :c', '--expression-attribute-values', JSON.stringify({ ':c': { S: longa } }), '--select', 'COUNT', '--query', 'Count', '--output', 'text']).toString().trim();
console.log(JSON.stringify({ excluida: !(await h.listarConversas()).some((c: any) => c.id === longa), mensagensQueSobraramNoDynamo: Number(sobra) }));

// limpa as 130 curtas para nao poluir a conta
for (const c of await h.listarConversas()) await h.apagarConversa(c.id);
console.log('limpo', (await h.listarConversas()).length);
})();
