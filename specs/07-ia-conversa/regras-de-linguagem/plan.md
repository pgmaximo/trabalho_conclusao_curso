# PLAN: Regras de linguagem da IA (Bloco 7)

Plano técnico completo (tarefas com teste antes da implementação, código):
`docs/superpowers/plans/2026-09-16-regras-de-linguagem.md`. Este arquivo
registra as decisões exigidas pela constituição (regras 3, 5, 8).

## 1. Diagnóstico — estado atual vs. proposto

As regras R1 a R5 existem escritas em `estudos-ia/01-estudos/regras-de-linguagem.md`,
com um argumento que o próprio estudo faz e que esta EPIC leva a sério:

> A camada 4 é o que diferencia uma regra declarada de uma regra cumprida.

Hoje existem **duas** das cinco camadas, e as duas vieram da feature de wearable
do Arturo, não desta frente:

| Camada | Estado hoje |
|---|---|
| 1. Vocabulário restrito no schema | existe (`insightSchema.ts`: `severidade` só aceita `informativo` ou `atencao`) |
| 2. Encaminhamento como campo obrigatório | existe (`perguntasParaOMedico` é exigido pelo schema) |
| 3. Guardrail do Bedrock | existe (`health-insights-guardrail`, criado por IaC) |
| 4. **Verificação determinística de saída** | **não existe** |
| 5. **Teste adversarial** | **não existe** |

Esta EPIC entrega as camadas 4 e 5. As três primeiras são reaproveitadas, não
reescritas.

**Por que a camada 3 não basta.** O guardrail do Bedrock bloqueia categorias
genéricas de segurança e dois tópicos que o projeto definiu (diagnóstico
definitivo e prescrição). Ele **não** conhece a R1 — a palavra proibida é uma
regra deste projeto, não uma categoria de risco reconhecível — e não cobre os
padrões de posologia da R3 em toda forma que o português produz.

## 2. Novas dependências (regra 3 da constituição)

**Nenhuma.** Expressão regular e funções de string do próprio JavaScript
bastam.

**Recusada — biblioteca de moderação de conteúdo.** Existem pacotes para
filtragem de texto, e nenhum deles conhece as regras deste projeto. A R1 é uma
decisão do usuário sobre uma palavra específica em português; a R3 tem uma
fronteira que o estudo define em uma frase ("a sugestão pode ser dita a
qualquer pessoa sem conhecer o quadro clínico dela?"). Isso não é um problema
de dicionário.

**Recusado — usar o modelo para verificar o modelo.** Seria uma segunda chamada,
com custo, latência, e a mesma classe de falibilidade que se quer verificar. A
verificação determinística tem a propriedade que importa: ela erra sempre do
mesmo jeito, e o jeito é conhecido e testável.

## 3. Decisões de arquitetura (regra 5 — nunca efeito colateral)

- **Módulo puro, sem nenhuma importação.** É a regra de compartilhamento da D30:
  só módulo sem importação pode ser usado pelos dois lados. Aqui isso não é
  conveniência — é o que permite testá-lo com centenas de textos em
  milissegundos, e é o que permitiria verificar texto no aplicativo se um dia
  for preciso.
- **Reprova, nunca reescreve.** Consertar o texto produziria uma frase que
  ninguém escreveu sobre a saúde de alguém. A decisão do que fazer com a
  reprovação pertence a quem chamou.
- **Assimetria declarada: falso positivo é preferível.** Onde a regra for
  ambígua, reprova. Uma resposta boa reprovada custa uma nova geração; uma
  resposta com posologia aprovada custa muito mais.
- **O tipo da pergunta é parâmetro, não adivinhação.** A R2 distingue pergunta
  clínica de operacional, e quem sabe qual é o chamador — ele conhece a tool
  que foi usada e o que o usuário perguntou. Fazer o verificador inferir isso
  seria criar uma segunda classificação, falível, dentro da camada que existe
  para ser infalível.
- **Uma fonte de verdade para o texto das regras.** A constante que vai no
  prompt é a mesma que a documentação cita. Copiar à mão é como duas cópias
  divergem.
- **A verificação não reusa o guardrail e não o substitui.** São camadas
  diferentes com falhas diferentes: o guardrail roda na AWS e cobre categorias;
  esta roda no processo e cobre este projeto.

## 4. Ambiguidades documentadas (regra 8)

- **O que mostrar ao usuário quando a verificação reprova — fechado pela D31**
  em 2026-09-16, depois do estudo em `estudos-ia/01-estudos/resposta-reprovada.md`.
  A ambiguidade estava registrada aqui e a decisão foi tomada onde ela pertence:
  na EPIC da conversa, que é quem tem o dado das ferramentas em mãos. O
  verificador não muda por causa disso — ele já devolvia regra, motivo e trecho,
  que é o que a D31 usa. **O que muda é uma exigência sobre o campo `motivo`:**
  ele é escrito para ser dito ao modelo, em termos da regra e não do sintoma,
  porque é dele que sai o bilhete da segunda geração.
- **A fronteira da R3 é um julgamento, e a verificação a aproxima.** "A sugestão
  pode ser dita a qualquer pessoa sem conhecer o quadro clínico dela?" é um
  critério humano. O código o aproxima por padrões: números com unidade de
  medicamento, verbos de prescrição, afirmações categóricas de condição. **A
  aproximação vai errar**, e o conjunto adversarial existe para medir onde.
- **Português tem muitas formas de dizer a mesma coisa.** "Tome 500mg", "usar
  500 mg", "500mg de 8 em 8 horas", "meio comprimido". A primeira versão cobre
  as formas frequentes e registra que a cobertura é parcial. O que impede isso
  de virar falsa segurança: a tarefa de conferência manual contra respostas
  reais do modelo é obrigatória, não opcional.
- **O aviso permanente da tela é premissa desta EPIC.** A R2 só dispensa o
  encaminhamento em pergunta operacional porque a tela carrega o aviso fixo
  "Apoio informativo — não substitui avaliação médica", que a spec da tela 4a
  declara obrigatório e não dispensável. Se esse aviso sair da tela, a regra
  aqui muda.

## 5. Limites e custo

**Custo de execução: zero.** Nenhuma chamada de rede, nenhum modelo. A
verificação roda sobre uma string, no mesmo processo.

**Custo de manutenção, que é o real:** cada padrão novo descoberto na
conferência manual vira um caso de teste antes de virar uma linha de regra. É o
método que impede o arquivo de crescer em regras que ninguém sabe se ainda
valem.
