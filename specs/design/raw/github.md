repo: pgmaximo/trabalho_conclusao_curso
branch: main

## Last sync
date: 2026-08-19T23:15:00Z

### Updated in this project
- Novo sistema de design (Tela 0): tokens de cor claro/escuro, tipografia IBM Plex Sans, botões 56dp, campos, badges e padrão de estados.
- Paleta invertida em relação ao código: verde #10794E como primária, azul #1B63C4 como secundária (src/constants/theme.ts precisa ser atualizado).
- Telas de autenticação redesenhadas (Login, Cadastro, Confirmação, Recuperar senha) sem mascotes/ilustrações.
- Barra de abas proposta com 5 itens + "Mais" (variante de 7 abas documentada como descartada).

## Screen map
| Tela do projeto | Arquivos de origem |
|---|---|
| 1a Sistema de design | src/constants/theme.ts, src/components/Button.tsx, src/components/AuthInput.tsx, src/components/BottomTabBar.tsx |
| 1b/1c Login | src/screens/HomeScreen.tsx, src/components/SocialButton.tsx |
| 1d Cadastro | src/screens/RegisterScreen.tsx |
| 1e Confirmação de conta | src/screens/ConfirmScreen.tsx |
| 1f Recuperar senha | src/screens/ForgotPasswordScreen.tsx |
