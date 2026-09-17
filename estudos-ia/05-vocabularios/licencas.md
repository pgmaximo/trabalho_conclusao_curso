# Licenças do LOINC e do UCUM — o que cada uma permite (tarefa 0.2a)

**Estado: encerrada em 2026-09-16.** Era o bloqueio externo mais antigo do
projeto e o único item que travava a Tarefa 3 do plano de extração.

Os dois arquivos oficiais foram baixados e as duas licenças foram lidas por
inteiro antes de qualquer byte entrar neste repositório. Versões conferidas:
**LOINC 2.83**, licença 5.8; **UCUM**, licença versão 1.1 de junho de 2024.

## O achado que importa: elas não são a mesma licença

O material de estudo anterior tratava LOINC e UCUM como um par —
"gratuitos porém licenciados pelo Regenstrief Institute". Os dois são de fato do
Regenstrief e os dois são gratuitos, mas **as condições de redistribuição são
opostas no ponto que mais interessa a este projeto**:

| | LOINC | UCUM |
|---|---|---|
| Recorte de um subconjunto | **permitido explicitamente** | **proibido explicitamente** |
| Acrescentar campos nossos | permitido | proibido |
| Redistribuir a obra inteira | permitido, com a licença junto | permitido, com atribuição |
| Obra derivada | só tradução, e com aviso prévio | proibida |

Essa diferença decide a forma da pasta: do LOINC entra **um extrato de 78
linhas**; do UCUM entra **o arquivo inteiro, sem uma vírgula alterada**.

## LOINC — o que a licença permite

Texto completo em `loinc/LoincLicense_5.8.txt`. As cláusulas que governam o que
fizemos:

**Cláusula 3 — recorte é permitido.** "Records may be deleted from the LOINC
Table or LOINC Table Core to deal with local requirements." É exatamente o nosso
caso: 78 analitos de rotina brasileira, de um arquivo com 62 mil termos
laboratoriais ativos. Registros **acrescentados** por nós teriam que levar um
"X" à frente do código, para nunca serem confundidos com código oficial. Não
acrescentamos nenhum.

**Cláusula 2 — campos novos são permitidos, alterar os existentes não.** "New
fields may be added to the Group 1 Artifacts." Nossas colunas próprias — unidade
canônica brasileira, massa molar, rótulo do projeto — são **campos novos**. O
conteúdo das colunas do LOINC fica intocado, byte por byte. É por isso que o
extrato guarda `EXAMPLE_UCUM_UNITS` como o LOINC o escreveu, e a nossa unidade
canônica mora numa coluna separada em vez de sobrescrever aquela.

**Cláusula 10 — é a que se aplica ao aplicativo.** Ela autoriza incorporar
porções do LOINC em "data dictionaries, online terminology services, software
programs including mobile device applications". Um aplicativo móvel com um
catálogo de analitos é literalmente o exemplo escrito na licença. Quatro
obrigações vêm junto:

1. **O aviso curto, com o texto exato.** Está em
   `loinc/LOINC_short_license.txt`, e precisa aparecer também na licença ou nos
   termos de uso do aplicativo publicado. Não é opcional e não pode ser
   parafraseado.
2. **Conteúdo de terceiro** precisa estar em conformidade ou ser retirado. O
   gerador do extrato recusa qualquer termo com `EXTERNAL_COPYRIGHT_NOTICE`
   preenchido — nenhum dos 78 tem, e a checagem virou `assert` no script.
3. **Todo dado extraído anda junto do código LOINC e de um nome oficial.** O
   nome tem que ser um destes: nome completamente especificado, `SHORTNAME`,
   `LONG_COMMON_NAME` ou `DisplayName`. O extrato carrega os quatro. **Esta
   cláusula tem consequência de desenho:** a coluna `analyteLabel` do model
   `LabResult` não pode ser um rótulo inventado por nós; ela precisa carregar
   um nome oficial, e o rótulo do projeto vive numa coluna separada.
4. Número de versão e situação do termo são "fortemente encorajados". O extrato
   traz `STATUS` por linha, e a versão está registrada aqui e no README.

**Cláusula 12 — tradução exige aviso prévio, e cede os direitos.** Traduzir o
LOINC é obra derivada: exige avisar o Regenstrief antes, e os direitos da
tradução são cedidos a eles. Fora a tradução, "no other right to create a
derivative work of any of the Licensed Materials is hereby granted".

**É por isso que não escrevemos sinônimos em português.** O plano previa uma
coluna `synonyms` preenchida por nós com as variações que o laboratório
brasileiro escreve. Isso andaria perigosamente perto de uma tradução do LOINC.
Não é mais preciso: o próprio release traz a variante linguística **pt-BR**, e o
extrato a carrega. "Glicose", "Hemoglobina", "Tirotropina", "Ascorbato" vêm do
Regenstrief, não de nós.

**Cláusula 1 — não usar para criar um padrão concorrente.** Não é o que estamos
fazendo; o projeto consome o LOINC como identidade, que é o propósito dele.

## UCUM — o que a licença proíbe

Texto completo em `ucum/LICENSE.md`. A seção 3 é curta e dura:

> "You may not: ... iv. add, delete, or modify the Work's content including
> field names, field contents, descriptions, and comments; or v. use the Work to
> create Derivative Works."

Ou seja: **não existe "extrato do UCUM".** Recortar as 20 unidades que usamos
seria deletar conteúdo, que a cláusula 3.a.iv proíbe em palavras.

A seção 2, porém, concede o que precisamos: reproduzir e distribuir a obra, e
"use the Work for the purposes of developing and commercializing Software
Applications that will communicate with and interoperate with the Work".

Daí as duas conclusões práticas:

- **`ucum-essence.xml` entra inteiro e intocado**, com a licença ao lado e o
  aviso da seção 3.b. É o arquivo de definição das unidades, e é o que permite
  validar uma unidade sem depender de rede.
- **Escrever `mg/dL` e `ng/mL` no nosso código não é redistribuir o UCUM.** É
  usar a sintaxe que ele define, que é o propósito declarado da obra. Nenhuma
  restrição pesa sobre isso.

## O que isso muda no plano

| Antes | Agora |
|---|---|
| Tarefa 3 bloqueada por licença | **desbloqueada** |
| `synonyms` preenchido por nós | variante pt-BR oficial do Regenstrief |
| `analyteLabel` livre | precisa carregar nome oficial (cláusula 10.3) |
| Unidade canônica podia sobrescrever a do LOINC | é **coluna nova**; a do LOINC fica intocada (cláusula 2) |
| UCUM seria recortado como o LOINC | entra inteiro, ou não entra |

## O que ainda depende de decisão humana

- O aviso da cláusula 10.1 precisa aparecer **na licença ou nos termos de uso do
  aplicativo publicado**, não só neste repositório. Enquanto o aplicativo não
  for publicado, a obrigação não está vencida — mas ela não pode ser esquecida
  na publicação.
- O texto do TCC precisa citar as duas licenças e as duas versões.
- Quando o LOINC lançar uma versão nova, o extrato se regenera pelo script; o
  número de versão muda em dois lugares (aqui e no README).
