// A9: reexecuta a verificacao sobre os textos que a R3 reprovou nas rodadas, e mostra o trecho e o motivo.
import fs from 'node:fs';
import path from 'node:path';
import { checkLanguageRules } from '../../../../../amplify/functions/ai-language-rules/languageRules.ts';
import { extrairResposta } from '../../../../../amplify/functions/chat-assistant/chatSchema.ts';

const S = process.env.SCRATCH as string;
const vistos = new Set<string>();
for (const f of fs.readdirSync(S).filter((n) => /^resultados-local.*\.json$/.test(n))) {
  for (const r of JSON.parse(fs.readFileSync(path.join(S, f), 'utf8'))) {
    for (const t of r.turnos) {
      const logs: string[] = t.rastro?.logs ?? [];
      if (!logs.some((l) => /"regras":\[[^\]]*R3/.test(l))) continue;
      for (const l of logs.filter((x) => x.startsWith('BRUTO '))) {
        const env: any = extrairResposta(l.slice(6));
        const texto = env?.texto;
        if (typeof texto !== 'string' || vistos.has(texto)) continue;
        vistos.add(texto);
        const ferramentas = (t.rastro.ferramentas ?? []).map((x: any) => x.nome).join(',');
        const c = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true });
        const r3 = c.ok ? [] : c.violations.filter((v) => v.rule === 'R3');
        if (!r3.length) continue;
        console.log(`## ${r.epico}#${r.id} [${ferramentas}] «${t.fala}»`);
        for (const v of r3) console.log(`   trecho: ${JSON.stringify(v.excerpt)}\n   motivo: ${v.reason.slice(0, 140)}`);
      }
    }
  }
}
