# Regras de linguagem da IA de comunicação

O texto que de fato vai ao modelo vive em
`amplify/functions/ai-language-rules/rulesPrompt.ts`. Este documento explica o
porquê de cada regra; aquele arquivo é o que o modelo lê.

Estas regras não são sugestão de tom. Elas são requisito de interface pela
regra 4 da constituição do projeto, e precisam virar três coisas concretas:
prompt de sistema, verificação sobre a resposta gerada, e teste automatizado.

## R1 — O termo vetado

O usuário determinou que a IA nunca use uma palavra específica. A razão é boa:
ela fecha uma questão que, em saúde, esta IA não tem autoridade para fechar.

**Este documento não a escreve por extenso, e isso é coerência, não charada.**
Um repositório que proíbe uma palavra enquanto a repete em vinte arquivos está
ensinando o contrário do que diz. A raiz existe montada a partir de partes, com
comentário explicando, em **um** lugar só:
`amplify/functions/ai-language-rules/languageRules.ts`. O padrão de detecção
precisa dela para detectá-la — é a única exceção, e ela vale para o padrão,
nunca para a copy.

A proibição alcança as flexões e derivações: o termo isolado, seu plural, e
os verbos e substantivos formados a partir dele.

Substituições aceitáveis conforme a intenção:

| Intenção | Usar |
|---|---|
| encerrar um processo | concluir, encerrar |
| o último item de uma lista | o último, o mais recente |
| resultado consolidado | consolidado, reunido |
| resposta que fecha uma dúvida | uma leitura possível, um caminho |

## R2 — Toda resposta encaminha a um profissional de saúde

Nenhuma resposta sobre saúde pode sair sem encaminhamento a um médico. Não é
um rodapé decorativo: quando a pergunta envolve sintoma, número de exame ou
decisão de cuidado, o encaminhamento é parte da resposta.

Vale distinguir dois casos, porque repetir o mesmo aviso mecanicamente em toda
mensagem faz o usuário parar de lê-lo:

- **Pergunta clínica** (sintoma, resultado, medicação, o que fazer): o
  encaminhamento aparece no corpo da resposta, específico — qual especialidade,
  com que urgência aparente, o que levar à consulta.
- **Pergunta operacional** (quando foi minha consulta, que remédio eu tomo):
  o aviso fixo da tela já cumpre o papel; forçar a frase aqui vira ruído.

A tela já carrega o aviso permanente "Apoio informativo — não substitui
avaliação médica", que a spec da tela declara obrigatório e não dispensável.

## R3 — Sugestões pequenas, nunca determinadas

Permitido: hábitos gerais e de baixo risco — hidratação, sono, movimento,
levar o exame à consulta, anotar quando o sintoma aparece.

Proibido: dose, posologia, iniciar ou interromper medicação, diagnóstico
nomeado, prognóstico, interpretação categórica de resultado, urgência médica
descartada ("não é nada grave").

A fronteira prática: a sugestão pode ser dita a qualquer pessoa sem conhecer o
quadro clínico dela? Se não pode, não é sugestão pequena.

## R4 — Nenhum número sem origem

Se a IA cita um valor de exame, ele veio de uma linha gravada por uma tool, com
data e documento de origem identificáveis. A IA não estima, não arredonda por
conveniência e não completa uma série que tem buraco.

Quando o dado não existe, a resposta é que ele não existe. Um chute sobre valor
de exame é o pior resultado possível das duas frentes.

## R5 — O que a IA não sabe, ela diz

Sem acesso ao dado, sem resposta inventada. "Não tenho esse exame registrado"
é uma resposta aceitável e desejável.

---

## Como isso vira verificação, e não só boa intenção

Cinco camadas, porque prompt sozinho não garante nada. As duas primeiras foram
aprendidas com a feature de wearable do Arturo, onde já estão implementadas:

1. **Vocabulário restrito.** O conjunto de valores que o modelo pode escolher
   não contém a opção que soaria como diagnóstico fechado. No schema dele,
   `severidade` aceita `informativo` ou `atencao`, e nada mais forte — a regra
   vira estrutura, não pedido. Um modelo não pode escolher o que não lhe é
   oferecido.
2. **Encaminhamento como campo obrigatório.** `perguntasParaOMedico` é exigido
   pelo schema de saída. A R2 deixa de depender de o modelo lembrar da frase e
   passa a ser condição para a resposta ser aceita. Copiar para o chat.
3. **Guardrail do Bedrock.** Já existe um, criado por infraestrutura como
   código: `health-insights-guardrail` bloqueia diagnóstico fechado e
   prescrição na entrada e na saída, filtra ataque de prompt e anonimiza dado
   pessoal. A decidir se o chat reusa esse ou ganha um irmão — as políticas de
   assunto são quase as mesmas, mas o chat tem entrada livre do usuário, que o
   fluxo de importação não tem.
4. **Verificação determinística de saída** — o termo proibido da R1 e padrões
   de posologia da R3, checados no código antes de a resposta chegar à tela.
   É a camada que o guardrail não cobre, porque a R1 é uma regra deste projeto,
   não uma categoria de segurança genérica.
5. **Teste adversarial** — perguntas que tentam arrancar a violação ("me diga
   de uma vez se está tudo certo", "quantos miligramas eu tomo"), com asserção
   sobre a resposta, rodando junto com `npm run validate`.

A camada 4 é o que diferencia uma regra declarada de uma regra cumprida. Um
modelo produz texto longo e variado, e a chance de escorregar em uma palavra
proibida ao longo de muitos tokens não é desprezível.

**Nota de projeto herdada:** a tool forçada, que é como se obriga a saída em
JSON, é incompatível com raciocínio estendido nos modelos da Anthropic. Foi por
isso que a feature de wearable escolheu Sonnet em vez de Opus. Repetir a escolha
dela, e não redescobrir o erro 400.

## O que acontece quando a camada 4 barra uma resposta — **decidido**

Esta seção registrava uma pendência e dizia "camada 2", o que estava errado: a
camada 2 é o encaminhamento como campo obrigatório do schema, e ela **impede**
em vez de barrar. Quem barra é a **camada 4**, a verificação determinística.

A decisão foi tomada em 2026-09-16 e é a **D31**: gerar de novo uma vez com o
motivo como instrução; falhando, cair para uma resposta determinística montada
com o dado que as ferramentas já devolveram; não havendo esse dado,
indisponibilidade honesta. Recortar o trecho e exibir com aviso foram recusados,
cada um com motivo.

O estudo que comparou as cinco opções está em `resposta-reprovada.md`, e traz o
gatilho que reabre a decisão caso a medição desminta a aposta.
