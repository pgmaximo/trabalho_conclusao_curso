# 🩺 SuaSaúde — Gerenciamento de Saúde

> Trabalho de Conclusão de Curso — Centro Universitário do Instituto Mauá de Tecnologia (IMT)  
> Curso: Ciência da Computação  
> Área: Ciências Exatas e da Terra / Computação e Informática

---

## 📋 Sobre o Projeto

O **SuaSaúde** é um aplicativo móvel voltado ao gerenciamento integrado da saúde do usuário. O sistema consolida informações clínicas como exames e receitas médicas em uma plataforma acessível e intuitiva, incorporando Inteligência Artificial para análise preliminar de exames e integração com dispositivos vestíveis (wearables).

O projeto se alinha ao **ODS 3 da ONU** — *"Assegurar uma vida saudável e promover o bem-estar para todos, em todas as idades"* —, promovendo o autocuidado, a prevenção de doenças e o empoderamento do usuário sobre seus próprios dados de saúde.

---

## 👥 Equipe

| Nome | Papel |
|---|---|
| André Martinez de Souza | Desenvolvedor |
| Arturo Ochoa Garcia | Desenvolvedor |
| Brunno Souza | Desenvolvedor |
| Matheus Passari | Desenvolvedor |
| Pedro Gabriel Oliveira Máximo | Desenvolvedor |

**Orientador:** Prof. Dr. Robson Calvetti

---

## ✨ Funcionalidades Previstas

- 📁 **Gestão de documentos clínicos** — armazenamento e visualização de exames e receitas médicas
- 🤖 **Análise por IA** — interpretação preliminar de exames, identificando padrões sem emitir diagnósticos definitivos
- 🔔 **Lembretes e sugestões personalizadas** — baseados na anamnese do usuário e em protocolos oficiais de saúde
- ⌚ **Integração com wearables** — coleta de dados como frequência cardíaca, padrões de sono e níveis de atividade
- 📊 **Dashboard interativo** — visualização clara das métricas de saúde coletadas pelos wearables
- 🔗 **Análise contextualizada** — correlação dos dados fisiológicos com eventos e rotina do usuário
- 🔒 **Segurança e privacidade** — desenvolvimento em conformidade com a **LGPD** (Lei Geral de Proteção de Dados)

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| [Expo](https://expo.dev/) | Framework principal — React Native full-stack |
| [React Native](https://reactnative.dev/) | Desenvolvimento mobile (Android e iOS) |
| [Amazon Web Services (AWS)](https://aws.amazon.com/) | Armazenamento, processamento e escalabilidade em nuvem |
| Inteligência Artificial | Análise de exames e geração de insights de saúde |

---

## 🏗️ Estrutura do Projeto

```
suasaude/
├── app/              # Telas e navegação (Expo Router)
├── components/       # Componentes reutilizáveis
├── services/         # Integrações com APIs e AWS
├── hooks/            # Custom hooks
├── assets/           # Imagens e recursos estáticos
└── constants/        # Configurações e constantes
```

> A estrutura poderá ser atualizada conforme o projeto evolui.

---

## 🚀 Como Executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

```bash
npm install -g expo-cli
```

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/trabalho_conclusao_curso.git

# Acesse o diretório
cd trabalho_conclusao_curso

# Instale as dependências
npm install
```

### Executando

```bash
# Inicia o servidor de desenvolvimento do Expo
npx expo start
```

Após iniciar, utilize o aplicativo **Expo Go** no seu dispositivo móvel ou um emulador Android/iOS para visualizar o app.

---

## 📚 Referências Bibliográficas

- ANDERSON, K.; BURFORD, O.; EMMERTON, L. *Mobile Health Apps to Facilitate Self-Care: A Qualitative Study of User Experiences*. PLOS ONE, 2016.
- LEE, J.-A. et al. *Effective behavioral intervention strategies using mobile health applications for chronic disease management: a systematic review*. BMC Medical Informatics and Decision Making, 2018.
- SPREADBURY, J. H. et al. *A Comprehensive Literature Search of Digital Health Technology Use in Neurological Conditions*. JMIR, 2022.
- NEGASH, S. et al. *Physicians' attitudes and acceptance towards artificial intelligence in medical care: a qualitative study in Germany*. Frontiers in Digital Health, 2025.

---

## 📄 Licença

Este projeto é desenvolvido exclusivamente para fins acadêmicos no âmbito do Trabalho de Conclusão de Curso do Centro Universitário do Instituto Mauá de Tecnologia.

---

> **Status:** 🚧 Em andamento