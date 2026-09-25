# UCUM — atribuição e por que o arquivo está inteiro

## Aviso exigido pela seção 3.b da licença

The Unified Code for Units of Measure (UCUM), also known as the "UCUM
Specification", is copyright © 1999-2024, Regenstrief Institute, Inc. All rights
reserved.

Licenciado sob a UCUM Copyright Notice and License, versão 1.1, junho de 2024. O
texto completo está em `LICENSE.md`, nesta mesma pasta, e em
<https://ucum.org/license>.

**Isenção de garantia:** a obra é distribuída sem garantias de espécie alguma,
expressas ou implícitas. Ver a seção de isenção em `LICENSE.md`.

## Por que o arquivo está inteiro, e não recortado

`ucum-essence.xml` é a obra completa, sem nenhuma alteração. Não é escrúpulo
excessivo: é o que a licença determina, e neste ponto ela é o oposto da do LOINC.

Seção 3.a:

> "You may not: ... iv. add, delete, or modify the Work's content including
> field names, field contents, descriptions, and comments; or v. use the Work to
> create Derivative Works."

Recortar as vinte e poucas unidades que o projeto usa seria **deletar conteúdo**,
que a cláusula 3.a.iv proíbe em palavras. Um "extrato do UCUM" não existe como
coisa permitida.

Do LOINC, a cláusula 3 autoriza apagar registros para atender a requisito local,
e é por isso que a pasta ao lado tem 79 linhas de um arquivo com 62 mil termos.
Aqui, não. Comparação lado a lado em `../licencas.md`.

## O que continua permitido, e é o que o projeto faz

A seção 2 concede usar a obra para "developing and commercializing Software
Applications that will communicate with and interoperate with the Work".

**Escrever `mg/dL` e `ng/mL` no código do aplicativo não é redistribuir o UCUM.**
É usar a sintaxe que ele define, que é o propósito declarado da obra. Nenhuma
restrição pesa sobre isso, e é assim que o `unitConverter` e o catálogo de
analitos usam o UCUM: como gramática, não como dado copiado.

O arquivo está aqui pelo caso em que o projeto queira **validar** uma unidade
sem depender de rede — ele traz a definição formal de cada átomo de unidade e
seus prefixos. Se essa validação não for construída, o arquivo continua sendo o
registro de qual versão do UCUM o trabalho seguiu, o que o texto do TCC precisa
citar.

## O que o UCUM não faz, e é bom lembrar

O UCUM padroniza **como a unidade é escrita**. Ele não converte `ng/mL` em
`nmol/L` — essa conversão depende da massa molar do analito, que é informação
química e mora em `../../03-esquemas/conversao-unidades.md`.

Essa distinção foi o achado que dimensionou a tarefa de normalização inteira, e
vale repetir aqui: **nenhum dos dois vocabulários converte unidade de massa para
unidade molar.** O LOINC dá identidade, o UCUM dá sintaxe, e a conversão é
trabalho nosso.
