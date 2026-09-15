# EPIC: Importar dados de wearables (Bloco 4)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: **N/A — feature nova, sem Canvas de origem.** Não existe tela correspondente em `specs/design/raw/`; o desenho de UI foi feito diretamente nesta implementação, seguindo os tokens de `specs/design/DESIGN_TOKENS.md` (ambiguidade documentada, regra 8 da constituição).
- Rota/arquivo no código: `src/app/import-health-data.tsx` → `src/screens/ImportHealthDataScreen.tsx`.
- Ator(es): usuário final.

## 2. História da funcionalidade

Como usuário final, quero importar o arquivo que exportei do Samsung Health (ou de um app exportador do Apple Health), para que o app analise meus dados de sono, passos e batimentos sem eu precisar conectar nenhuma conta externa.

### Cenários (Given/When/Then)

- **Consentimento**: Dado que é a primeira vez que o usuário abre esta tela nesta sessão, quando a tela carrega, então é exibido um bloco explicando onde o dado é processado (Amazon Bedrock, dentro da conta AWS do projeto) antes de qualquer seleção de arquivo ser possível.
- **Seleção de arquivos**: Dado que o usuário concordou com o consentimento, quando toca em "Selecionar arquivos", então o seletor nativo abre filtrado para `.csv`/`.json`/`.zip`, com seleção múltipla habilitada.
- **Validação client-side**: Dado que o usuário selecionou arquivos, quando algum deles excede o limite de tamanho (25MB para CSV/JSON avulso, 100MB para ZIP) ou tem extensão não suportada, então um `InlineError` nomeia o arquivo problemático — nada é enviado.
- **Limite de quantidade**: Dado que o usuário já selecionou 20 arquivos, quando tenta adicionar mais, então o botão "Adicionar mais arquivos" fica desabilitado com o motivo explícito.
- **Envio com sucesso**: Dado que a seleção é válida, quando o usuário toca em "Importar e analisar", então cada arquivo é enviado sequencialmente para `health-imports/{identityId}/{importId}/{n}-{nome}`, a linha `HealthImport` é criada com `status: PENDING`, a mutation `startHealthAnalysis` é chamada, e o app navega para o dashboard (`/health-data?importId=...`) já acompanhando essa importação.
- **Erro de upload/rede**: Dado que o upload ou a criação da linha falha, quando o erro ocorre, então um `InlineError` mostra a mensagem e o usuário permanece na tela (nenhuma navegação acontece, nenhum estado parcial é deixado sem explicação).
- **Remoção de arquivo**: Dado que o usuário selecionou um arquivo por engano, quando toca no ícone de remover ao lado dele, então o arquivo sai da lista sem precisar recomeçar a seleção.
- **Formato não suportado (Apple Health nativo)**: A cópia da tela explica, por plataforma, que o export nativo `export.xml` do app Saúde da Apple não é suportado, orientando o uso de um exportador terceiro (ex.: Health Auto Export) para gerar CSV/JSON.

## 3. Estrutura da página

1. Cabeçalho "voltar + Importar dados de saúde" (`BackHeader`).
2. **Etapa de consentimento** (gate local, antes de qualquer seleção): texto sobre onde o dado é processado, retenção de 30 dias, e o botão "Concordar e continuar".
3. **Etapa de seleção** (após consentimento): card com instruções por plataforma (Samsung Health vs. iPhone), lista de arquivos selecionados (nome, tamanho, botão remover), botão "Selecionar arquivos"/"Adicionar mais arquivos", texto de limites, botão "Importar e analisar".

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão voltar (`BackHeader`) | ícone | `router.back()` | tela anterior (Perfil) | sempre habilitado |
| "Concordar e continuar" | botão | avança para a etapa de seleção | mesma tela | sempre habilitado |
| "Selecionar arquivos" / "Adicionar mais arquivos" | botão | abre `DocumentPicker` (multi-seleção) | mesma tela | desabilitado ao atingir 20 arquivos |
| Ícone de remover por arquivo | ícone | remove o arquivo da lista local | mesma tela | sempre habilitado |
| "Importar e analisar" | botão | upload + `HealthImport.create` + `startHealthAnalysis` | `/health-data?importId=...` | desabilitado sem arquivo válido selecionado, ou durante o envio |

## 5. Mapa de dados

| Campo/Componente | Origem do dado | Fonte técnica | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|
| Lista de arquivos selecionados | `expo-document-picker` | local (não persistido até o envio) | `{name, uri, size}[]` | extensão (csv/json/zip), tamanho por tipo, máx. 20 arquivos | erro do picker vira `InlineError`, seleção não é perdida |
| `HealthImport.fileKeys`/`fileNames` | Upload feito pelo cliente | S3 (`health-imports/{identityId}/{importId}/...`) via `uploadData` | `string[]` | chave só é aceita pelo backend se casar com `^health-imports/[^/]+/<importId>/[^/]+$` | falha de upload interrompe o envio e mostra `InlineError`; nenhuma linha `HealthImport` é criada antes do upload terminar |
| `HealthImport.status` | Criado como `PENDING` pelo cliente | Amplify Data (DynamoDB) | enum | `allow.owner()` | — |
| `startHealthAnalysis` | Mutation customizada | Lambda `start-health-analysis` | — | valida dono e formato das chaves no backend (nunca confia só no client) | erro da mutation vira `InlineError`, sem navegar |

## 6. Requisitos não-funcionais específicos

- Upload **sequencial**, nunca paralelo — evita competir a banda de um usuário com conexão fraca enviando um ZIP de dezenas de MB.
- Nenhum dado do arquivo é logado nem exibido fora do fluxo de upload — os nomes de arquivo aparecem na UI, mas o **conteúdo** nunca é lido no cliente.
- Consentimento nomeia explicitamente o provedor (Amazon Bedrock) e a região (`us-east-1`), e afirma que os dados não são usados para treinar modelos — texto revisável pelo orientador antes de uma apresentação pública.

## 7. Critérios de aceite

- [x] Estrutura visual usa os componentes/tokens padrão do design system (`Card`, `Button`, `InlineError`, `BackHeader`) — sem Canvas de origem para comparar pixel a pixel (ambiguidade documentada acima).
- [x] Todos os botões do mapa de navegação estão conectados a uma ação real.
- [x] Todos os campos do mapa de dados estão lendo/gravando dado real (upload S3 real, `HealthImport.create` real, mutation real).
- [x] Estados de erro de upload/validação implementados (`InlineError`); não há estado de "carregamento" nesta tela além do botão em `loading` — o carregamento da análise em si é acompanhado na outra tela (`insights-saude`).
- [x] Nenhum texto sugere diagnóstico médico definitivo.
