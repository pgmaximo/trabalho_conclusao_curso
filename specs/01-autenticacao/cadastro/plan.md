# PLAN: Autenticação — Cadastro (checklist de senha ao vivo)

## 1. Diagnóstico — o que já existe vs. o que falta

`src/screens/RegisterScreen.tsx` (atual) já implementa a maior parte da funcionalidade descrita no Canvas 1d, de forma bem mais próxima do design do que outras telas do inventário. Comparação linha a linha:

| Elemento do Canvas 1d | Existe hoje em `RegisterScreen.tsx`? | Divergência |
|---|---|---|
| Checklist de 5 regras ao vivo (`sc-for rules`) | **Sim** — `getPasswordRequirements(password)` (linhas 43-51) retorna as 5 regras e é recalculado a cada render, então já é "ao vivo" por natureza do React state | Nenhuma divergência funcional. Visual usa `MaterialIcons` check-circle/radio-button-unchecked em vez do glifo/círculo colorido do Canvas — aceitável como reuso de ícone do sistema (não é uma regra de conteúdo, é estilo de ícone) |
| Regras exibidas condicionalmente (só com foco/conteúdo) | **Sim** — `isPasswordRequirementsVisible = isPasswordFocused \|\| password.length > 0` | Fiel ao comportamento implícito do Canvas (painel `sc-for` não teria motivo de aparecer vazio) |
| Erro de confirmação de senha divergente (`mismatch`) | **Não** — hoje a checagem `password !== confirmPassword` só ocorre dentro de `handleRegister()` e dispara um `Alert.alert`, não um erro inline sob o campo | **Gap real**: falta o estado `mismatch` inline (borda vermelha no campo + texto "As senhas não são iguais." abaixo), que é o comportamento do Canvas (`sc-if value="{{ mismatch }}"`). Hoje o usuário só descobre a divergência ao tocar em "Criar conta". |
| Botão desabilitado + texto de apoio "Complete os itens acima para continuar." (`notAllOk`) | **Não** — hoje o botão primário sempre aparece habilitado (texto "Criar conta"); a validação de `isPasswordValid` só bloqueia dentro de `handleRegister()` via `Alert.alert('Atenção', ...)` | **Gap real**: falta o estado visual desabilitado (bg `#DFE3E1`/texto `#7A8480`) e o texto de apoio condicional. Hoje o feedback é reativo (alerta pós-toque), não preventivo (estado do botão). |
| Campo e-mail, campo senha, campo confirmar senha | **Sim** | Usa `AuthInput` (componente próprio) em vez de inputs nativos — equivalente visual, não uma divergência de conteúdo |
| Botão "Continuar com Google" | **Sim** — `handleGoogleRegister()` via `signInWithGoogle()` | Fiel |
| "Já tem conta? Entrar" | **Sim** — `Pressable` → `onNavigateToLogin` | Fiel |
| Seta de voltar no header | **Não visível no componente atual** (o Canvas mostra `‹` 48×48 no topo da tela) | A tela usa `AuthIllustrationCard` com imagem ilustrativa em vez do header simples do Canvas (seta + título "Criar conta"). É uma divergência estrutural de layout mais ampla que já existe também em outras telas de auth (ex. Login) — decisão de manter ou reverter para o header do Canvas fica registrada como ambiguidade (regra 8 da constituição): a versão atual com ilustração é mais rica visualmente, mas diverge do Canvas 1d, que não desenha nenhuma imagem/ilustração nesta tela. **Recomendação**: seguir a regra 1 da constituição (fidelidade ao design é lei) e alinhar ao Canvas — header com seta de voltar + título "Criar conta", sem `AuthIllustrationCard` — a menos que o time decida deliberadamente manter a ilustração como melhoria intencional documentada. |

### Resumo do gap real de UI
Faltam apenas dois estados interativos condicionais que o Canvas define explicitamente via `sc-if`, mas que hoje são tratados apenas como `Alert.alert` reativo:
1. **Erro inline de confirmação de senha divergente** (`mismatch`) — borda vermelha + mensagem "As senhas não são iguais." abaixo do campo "Confirmar senha", atualizado ao vivo (não só no submit).
2. **Estado desabilitado do botão "Criar conta" + texto de apoio** (`notAllOk`) — enquanto `!isPasswordValid`, o botão deve renderizar com bg/fg de disabled e mostrar "Complete os itens acima para continuar." abaixo dele, em vez de ficar sempre no estado ativo até o toque.

Além disso, o header estrutural (seta de voltar + título simples, sem ilustração) diverge do Canvas — decisão de escopo a confirmar com o time antes da implementação (não bloqueia a spec, ver regra 8).

## 2. Validação da política real de senha do Cognito (regra 5 da constituição)

`amplify/auth/resource.ts` define apenas:
```ts
export const auth = defineAuth({
  loginWith: { email: true },
});
```
Sem bloco `passwordPolicy` explícito — ou seja, o Amplify Gen 2 aplica os **defaults do framework**, não uma política customizada visível no código-fonte.

Para não presumir esse default, sintetizamos/inspecionamos o artefato CloudFormation já gerado (`.amplify/artifacts/cdk.out/amplifytccpedrosandbox12a5bc5141authFDF3A070.nested.template.json`) e extraímos a `PasswordPolicy` real do recurso `AWS::Cognito::UserPool` (`amplifyAuthUserPool4BA7F805`):

```json
"PasswordPolicy": {
  "MinimumLength": 8,
  "RequireLowercase": true,
  "RequireNumbers": true,
  "RequireSymbols": true,
  "RequireUppercase": true
}
```

**Conclusão: as 5 regras do checklist já implementado em `getPasswordRequirements()` batem exatamente com a política real do Cognito**:
- `password.length >= 8` ↔ `MinimumLength: 8`
- `/\d/.test(password)` ↔ `RequireNumbers: true`
- `/[^A-Za-z0-9]/.test(password)` ↔ `RequireSymbols: true`
- `/[A-Z]/.test(password)` ↔ `RequireUppercase: true`
- `/[a-z]/.test(password)` ↔ `RequireLowercase: true`

Não é necessário alterar `amplify/auth/resource.ts` nem a lista de regras exibidas. **Ressalva importante**: este artefato é um snapshot local gerado pela última sincronização do sandbox (`ampx sandbox`) e não uma leitura ao vivo do User Pool em produção — se a política do Cognito for alterada via `passwordPolicy` em `resource.ts` no futuro (ou o ambiente de produção divergir do sandbox local), as 5 regras exibidas precisam ser atualizadas junto, e o `signUp` deve continuar sendo a fonte de verdade final (erro `InvalidPasswordException` como rede de segurança caso o checklist local fique desatualizado).

## 3. Abordagem técnica

1. **Não introduzir biblioteca nova** (regra 3 da constituição) — os dois gaps são resolvidos com state React local já existente no componente:
   - `mismatch`: `boolean` derivado (`confirmPassword.length > 0 && password !== confirmPassword`), usado para: (a) borda do campo `AuthInput` de confirmação de senha ficar vermelha, (b) renderizar a linha de erro inline (ícone "!" + texto), condicional a `mismatch`.
   - `notAllOk`: já existe como `!isPasswordValid` — reaproveitar essa expressão para: (a) desabilitar visualmente o `Button` "Criar conta" (variante disabled, se o componente `Button` já suporta um prop `disabled`/`variant="disabled"` — confirmar em `src/components/Button.tsx`; senão, é um ajuste pequeno no componente `Button` compartilhado, não uma nova lib), (b) renderizar o texto de apoio condicional abaixo do botão.
2. **`AuthInput`**: verificar se já aceita prop de erro (`error`/`errorMessage` ou `borderColor` customizada) antes de adicionar uma nova prop — reuso em vez de reescrita (regra 3).
3. **Header**: decisão de produto a confirmar — se o time optar por alinhar ao Canvas (recomendado), trocar `AuthIllustrationCard` pelo header simples (seta `‹` + "Criar conta") nesta tela; se optar por manter a ilustração como melhoria intencional, documentar a exceção explicitamente no `spec.md` (regra 8) em vez de deixar a divergência silenciosa. Este plano recomenda seguir o Canvas, mas não bloqueia a tarefa caso o time decida diferente — ver `tasks.md`.
4. **Nenhuma mudança de schema/backend** é necessária — Cognito já está corretamente configurado; este EPIC é puramente de UI/UX na tela existente.
5. **Não modificar `amplify/auth/resource.ts`** neste EPIC — está fora do escopo e funcionando conforme validado na seção 2.

## 4. Riscos / pontos de atenção
- Se o componente `Button` compartilhado não suportar um estado "disabled com motivo" hoje, essa capacidade precisa ser adicionada nele (usado por outras telas também) — não duplicar lógica de "botão cinza" só dentro de `RegisterScreen.tsx`.
- Qualquer mudança de header (remover `AuthIllustrationCard`) pode afetar consistência visual com `LoginScreen` (que aparentemente também usa cartão ilustrado) — confirmar se `LoginScreen` já tem EPIC próprio tratando isso, para não desalinhar as duas telas de forma independente.
- `mismatch` não deve bloquear o clique em "Criar conta" isoladamente de forma redundante com `notAllOk` — o botão já fica desabilitado por `notAllOk` (regras de senha), mas a divergência de confirmação de senha só é conhecida quando os dois campos têm conteúdo; manter a validação de `password !== confirmPassword` também dentro de `handleRegister()` como segunda camada de segurança (defesa em profundidade), mesmo com o erro inline visível.
