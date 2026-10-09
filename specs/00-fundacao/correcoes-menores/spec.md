# EPIC: Correções menores

## 1. Identificação

- **Origem:** a auditoria de usabilidade de
  `specs/00-fundacao/correcoes-de-usabilidade/spec.md` (2026-10-09). Esta EPIC
  cobre o que o dono do projeto escolheu do grupo "coisas menores" (itens 1, 3
  e 4) e a retirada do filtro "Alterados · Em breve", que as duas EPICs
  anteriores tinham deixado de fora.
- **Restrição do pedido:** a mesma das EPICs anteriores. Não mudar a
  usabilidade geral nem a identidade do app.
- **Ator:** usuário autenticado, com atenção a idosos e baixo letramento digital.

## 2. Decisões

| # | Defeito | Correção | Arquivos centrais |
|---|---|---|---|
| D1 | **Filtro "Alterados · Em breve" em Exames.** O chip estava na tela, desabilitado, desde a primeira versão da lista. | O filtro saiu. Ficam Todos, Exames e Receitas. Ver §2.1. | `src/constants/documentFilters.ts`, `useExamsData.ts`, `ExamsScreen.tsx`, `FilterChips.tsx` |
| D2 | **O Início pulava quando o dado chegava.** Enquanto documentos e compromissos carregavam, cada seção mostrava o esqueleto de tela inteira (duas barras de título e dois cartões de três linhas), perto do dobro da altura das duas linhas que entravam no lugar. | Cada lista guarda o lugar com duas linhas que têm a caixa e a altura das linhas de verdade. A altura vem de um texto invisível com a mesma classe do texto real, então vale para qualquer aparelho e tamanho de fonte. Medido no navegador, em 360dp e 390dp: a página tem a mesma altura carregando e carregada (seção de documentos 219dp, de compromissos 287dp). | `HomeScreen.tsx` |
| D3 | **Compromisso salvo como "Consulta" sem a pessoa ver.** O formulário abria sem tipo marcado, o tipo não é obrigatório, e o que ia para o banco sem toque era "Consulta". Um exame marcado assim aparecia na Agenda com selo e cor de consulta. | "Consulta" já vem marcado. O que aparece marcado é o que será salvo. | `AddAppointmentScreen.tsx` |
| D4 | **Formulário de medicamento.** Eram 12 campos numa rolagem só. E as unidades do estoque (Comp., ml, Cáps.) não cobriam as formas que o próprio formulário oferece (Gotas, Injeção, Outro), sendo a unidade obrigatória: uma caneta de insulina virava "3 comp.". | Os três campos que quase ninguém preenche (aviso de estoque, observações, lembretes ligados ou desligados) ficam atrás de "Mais opções". O estoque ganhou as unidades "Doses" e "Unidades". Ver §2.2. | `MedicineFormFields.tsx`, `src/utils/medicineUnit.ts`, `amplify/data/schemas/medicines.ts`, `useMedicinesData.ts` |

### 2.1 O filtro "Alterados" (D1)

O Canvas 3a tem o filtro e um selo "Normal / Alterado" em cada exame. Quando a
lista foi feita, um documento só guardava tipo, nome e datas, e a decisão
(`specs/03-exames-receitas/lista/plan.md`, §2, Opção A) foi mostrar o chip
desabilitado, com "Em breve", em vez de um filtro que nunca devolvia nada.

Desde então o app passou a ler os exames e a guardar, de cada resultado, o
valor e a faixa do laboratório. Mas a regra 4, como a spec da leitura a aplica
(`specs/06-ia-leitura-exames/extracao-de-documentos/spec.md`, §6), proíbe
marcar um valor como alterado: "não classifica valor como bom ou ruim, não
marca alterado". "Em breve" passou a prometer o que as regras do projeto dizem
que não vai chegar.

É um desvio consciente do Canvas, que tem o chip. A alternativa que continua
aberta é a Opção B daquele plano: a própria pessoa marcar um documento como
alterado (o rótulo seria dela, não do app). Pede campo novo no banco e no
formulário de documento.

O `FilterChips` perdeu o estado "desabilitado · Em breve", que só existia para
este chip.

### 2.2 O formulário de medicamento (D4)

**"Mais opções".** Um botão no fim do formulário, que diz o que há dentro
("Aviso de estoque, observações e lembretes"). Fechado no medicamento novo. Ao
editar um medicamento em que algum dos três já tem valor (uma observação, um
aviso de estoque, os lembretes desligados), abre já mostrando: escondido, o que
a pessoa salvou pareceria ter sumido. Nenhum dos três campos pode dar erro de
validação, então nada fica escondido impedindo de salvar. A "Data de término"
ficou à vista, ao lado da de início: tratamento curto é comum.

**Unidades.** A lista passou a ser Comp., ml, Cáps., Doses, Unidades. "Doses"
serve a canetas, sprays e inaladores; "Unidades", ao resto (pomadas, sachês,
adesivos). No cartão de estoque: "22 comp.", "120 ml", "30 cáps." (era "caps.",
sem acento), "1 dose" / "20 doses", "3 un.".

A lista existe em dois lugares que precisam ser iguais: o formulário
(`src/utils/medicineUnit.ts`) e o banco (`amplify/data/schemas/medicines.ts`,
campo `unit`). O banco recusa um valor fora da lista dele. Um teste compara as
duas.

**A mudança no banco precisa ser implantada** (`npx ampx sandbox` no
desenvolvimento, ou o fluxo de implantação do projeto). Antes disso, salvar um
medicamento com "Doses" ou "Unidades" falha com "Não foi possível salvar o
medicamento.". É uma mudança que só acrescenta valores: os medicamentos já
gravados não mudam. O `amplify_outputs.json` é gerado pela implantação e não
foi editado à mão.

## 3. Fora de escopo

- **Item 2 da auditoria** (lista de documentos vazia do Início sem botão de
  adicionar) e os itens 5, 6 e 7 (as 21 vacinas em chips, o detalhe do exame
  sem pré-visualização, o emoji de alerta em Remédios): não pedidos nesta leva.
- **Filtrar as unidades pela forma escolhida** (só "Comp." e "Cáps." para
  Comprimido). As cinco aparecem sempre, como as três apareciam.
- **O esqueleto das outras telas.** O `ScreenSkeleton` continua como está: nas
  telas inteiras ele guarda o lugar do título e dos cartões.

## 4. Critérios de aceite

- [x] D1 a D4 cobertos por teste (ver `__tests__/filtrosDeExames`,
      `homeCarregando`, `tipoDoCompromisso`, `formularioDeMedicamentoOpcoes`).
- [x] `npm run validate` verde.
- [x] Telas alteradas conferidas no navegador, pela rota `/dev-preview`, em
      360dp, claro e escuro; o Início medido carregando e carregado, em 360dp
      e 390dp.
- [ ] Implantar a mudança do banco (D4) e salvar um medicamento com "Doses" e
      outro com "Unidades".
- [ ] Conferência em aparelho real (sem dispositivo neste ambiente).
