# SuaSaúde — Design Tokens

Extracted from the Claude Design canvas export `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`, primarily screen **1a** ("Tela 0 — Sistema de design, referência fixa"), cross-checked against the other screens (1b–4e). All values below are cited directly from inline `style="..."` attributes in the markup — nothing here is guessed.

`support.js` (the file the `.dc.html` loads via `<script src="./support.js">`) is the generated `dc-runtime` renderer — it parses the `.dc.html` template, resolves `{{ }}` bindings, `<sc-if>`/`<sc-for>` blocks, and does DOM diffing. It defines **no design tokens, colors, or constants** of its own; it is pure rendering plumbing and can be ignored for design-system purposes.

---

## 1. Color palette

### Primary — green ramp
| Step | Hex | Notes |
|---|---|---|
| 50 | `#E8F5EE` | light surface / selected-chip bg / success banner bg |
| 100 | `#C7E8D6` | light border, badge border |
| 200 | `#93D2B2` | |
| 300 | `#5CB98C` | |
| 400 | `#2E9D6B` | |
| **500** | **`#10794E`** | **primary action color** — buttons, active icons, FAB, links (AA 5.5 contrast on white) |
| 600 | `#0C6341` | pressed/darker primary — loading button state, "Resumo de hoje" card bg, snackbar bg, avatar-initials text |
| 700 | `#094E33` | |
| 800 | `#063826` | |
| 900 | `#04251A` | |

### Secondary — blue ramp
| Step | Hex | Notes |
|---|---|---|
| 50 | `#E9F1FD` | info banner bg, "Válida" badge bg |
| 100 | `#CBDFFA` | info banner border |
| 200 | `#9DC3F5` | |
| 300 | `#6BA3EE` | |
| 400 | `#3B82E0` | |
| **500** | **`#1B63C4`** | **secondary action / link / info color** (AA 4.9 contrast on white); default `a` color |
| 600 | `#14509F` | link:hover; "Válida"/"Agendado" badge text |
| 700 | `#0F3C79` | |
| 800 | `#0A2A55` | |
| 900 | `#061B38` | |

### Semantic colors (light theme)
| Semantic | Text/icon-bg | Badge bg | Badge border |
|---|---|---|---|
| Success / Normal / Em dia / Aplicada / Válida (exam) | `#0C6341` on icon-bg `#10794E` | `#E8F5EE` | `#C7E8D6` |
| Warning / Atenção / Pendente / Estoque baixo | `#8A5300` on icon-bg `#8A5300` | `#FFF3DF` | `#F0D6A4` |
| Error / Alterado / Atrasada / Vencida (delete confirm) | `#B3261E` on icon-bg `#B3261E` | `#FDECEA` | `#F3C9C5` |
| Info / Agendado / Válida (vaccine "Válida" reuses blue in some contexts) | `#14509F` on icon-bg `#1B63C4` | `#E9F1FD` | `#CBDFFA` |
| Neutral / Pendente (generic)/Vencida (doc) | `#363D3B` on icon-bg `#55605C` | `#EFF1F0` | `#DFE3E1` |

Note: the reference badge set on 1a uses 5 distinct badges: Normal (green), Atenção (amber/`#8A5300`), Alterado (red), Agendado (blue), Pendente (neutral gray `#55605C`/`#EFF1F0`). Individual screens reuse these same 5 color families for their own status labels (e.g. 3a "Válida"/"Vencida", 3e "Atrasado"/"Pendente"/"Em dia", 4e "Aplicada"/"Pendente"/"Atrasada") — always icon + text + colored pill background, never color alone. Pure error red (`#B3261E`) is also reused for destructive-action UI (delete-confirmation dialogs, "Excluir" buttons) and for CPF/field validation errors.

### Neutrals & surfaces (light theme)
| Token | Hex |
|---|---|
| Page background | `#F7F8F7` (canvas doc body bg is `#EDEDEA`, but phone-frame screens use `#F7F8F7`) |
| Surface / card | `#FFFFFF` |
| Surface 100 | `#EFF1F0` (card borders, dividers) |
| Border | `#DFE3E1` (default field/button borders) |
| Text secondary | `#55605C` |
| Text primary | `#141817` |
| Text tertiary/label (chip unselected) | `#363D3B` |
| Placeholder text | `#7A8480` |
| Home-indicator bar | `#C3C9C6` |

### Dark theme (from screen 1c)
| Token | Hex | Light equivalent |
|---|---|---|
| Background | `#0E1413` | `#F7F8F7` |
| Frame/card border | `#33403C` | `#DFE3E1` / `#EFF1F0` |
| Surface / card | `#18201E` | `#FFFFFF` |
| Input field bg | `#222B29` | `#FFFFFF` |
| Text primary | `#EDF2F0` | `#141817` |
| Text secondary | `#AEBBB6` | `#55605C` |
| Primary green (action) | `#4FC58C` (AA 8.6:1) — text on it is dark (`#0E1413`), inverted from light mode | `#10794E` |
| Secondary blue (action/link) | `#8FB8F7` (AA 7.9:1) | `#1B63C4` |
| Warning | `#F0B95E` | `#8A5300`/`#FFF3DF` |
| Error | `#F2867E` | `#B3261E`/`#FDECEA` |
| Focus outline (input) | `#8FB8F7`, 2px | `#1B63C4`, 2px |
| Home-indicator bar | `#4E5754` | `#C3C9C6` |

Dark mode is a deliberate design-system feature (see 4b "Aparência" — Claro/Automático/Escuro toggle), not just a mockup variant.

---

## 2. Typography

**Font families:** `'IBM Plex Sans', system-ui, sans-serif` (UI text, all weights 400–700 loaded), `'IBM Plex Mono', monospace` (labels/specs inside the design-system reference screen only — hex codes, spacing values, field annotations; not used in real app screens).

| Style | Spec | Example usage |
|---|---|---|
| Título (Title) | 600 28px / 1.25 | Screen-level page titles ("Seus exames") |
| Subtítulo (Subtitle) | 600 22px / 1.3 | Card headings ("Entre na sua conta") |
| Seção (Section) | 600 20px / 1.3 | Section headers ("Próximas consultas") |
| Corpo (Body) | 400 17px / 1.5 | **Minimum body text size — nothing below 17px** |
| Corpo forte (Body strong) | 600 17px / 1.5 | Emphasized body ("Colesterol total: 186 mg/dL") |
| Apoio (Support) | 400 16px / 1.5 | Secondary text, dates, captions — **absolute floor of 16px** |
| Rótulo (Label) | 600 14px / 1.4, letter-spacing .08em | Tab labels and tags ONLY |

Button label text: 600 17px. Input value text: 400 17px. Field label (above input): 600 16px.

---

## 3. Spacing, sizing, radius

- **Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 40 (px)
- **Radius scale:** field/button = 14px · card = 20px (also seen: 16px for smaller cards/banners, 12px for chips/small buttons) · pill/chip/avatar = 999px (fully round)
- **Touch targets:** minimum 48dp, primary action 56dp
- **Buttons:** height 56px, radius 14px, label 600 17px
- **Form fields:** height 56px (52px in some in-app screens, e.g. wizard/profile forms), radius 14px, border 1.5px `#DFE3E1` default, 2px `#1B63C4` on focus (light) / `#8FB8F7` (dark)
- **OTP/code digit boxes:** 52×60px, radius 12px, font 600 24px
- **Card padding:** ~14–22px depending on card size (18px common for form cards, 14px for list-item cards, 22px for design-system reference blocks)
- **Icon sizes:** 20–24px common for inline icons; 40–48px for icon tiles (home "Acesso rápido" grid); 44–48px for header icon buttons/back buttons; 56×56px empty-state icon; 64×64/80×80px profile avatar
- **Phone frame:** fixed 390×844px, 28px corner radius, 1px border `#DFE3E1`
- **Bottom nav bar:** 64px per-row height, 5 items (Início / Consultas / Exames / Remédios / Mais) + home-indicator strip below (22px tall, 130×5px pill `#C3C9C6`)
- **Status bar mock:** 48px height, time text 600 15px + signal glyph

---

## 4. Component patterns

### Buttons
- **Primary:** bg `#10794E`, text white, 600 17px, height 56, radius 14. One per screen (rule stated explicitly in 1a).
- **Primary — loading:** bg `#0C6341` (darker), spinner (2.5px ring, white 40% + white top segment) + "…ing" label; blocks touch.
- **Secondary (outline):** white bg, border 1.5px `#10794E`, text `#0C6341`.
- **Disabled:** bg `#DFE3E1`, text `#7A8480`, with a reason shown as plain text below (never just a grayed button with no explanation).
- **Social (Google/Apple):** white bg, border 1.5px `#DFE3E1`, text `#141817`, 26×26 logo tile bg `#EFF1F0`.
- **Destructive:** white bg, border 1.5px `#B3261E`, text `#B3261E` — always paired with a confirmation step/dialog (never fires immediately).
- **FAB:** 56×56 circle, bg `#10794E`, drop shadow `0 6px 16px rgba(16,121,78,.35)`, white icon glyph.

### Inputs
- Height 56px (52px in some contexts), radius 14, border 1.5px `#DFE3E1`, value text 400 17px `#141817`, placeholder `#7A8480`.
- Focus: border becomes 2px solid `#1B63C4` (light) / `#8FB8F7` (dark).
- Error: border 2px `#B3261E`, bg tint `#FDECEA`, inline error row = 22px red circle "!" badge + red 16px text.
- Password field: trailing "Mostrar/Ocultar" text-link (not an icon) in `#1B63C4`.
- Textarea: same radius/border, `resize:none`, 3 rows typical.
- Segmented/chip selectors (sex, smoking, sí/não, appointment type, medication form): unselected = border 1.5px `#DFE3E1`, bg `#fff`, text `#363D3B`/`#55605C`; selected = border 1.5px `#10794E`, bg `#E8F5EE`, text `#0C6341` (this selected/unselected pattern is reused everywhere binary/ternary choice chips appear).

### Cards
- Standard list-item card: bg `#fff`, border 1px `#EFF1F0`, radius 14–16px, padding 14px.
- Form-section card: bg `#fff`, border 1px `#EFF1F0`, radius 20px, padding 18px.
- Colored callout/banner cards (info/warning/error/success) use the semantic palette above with matching border + icon-circle + text color, radius 12–16px, padding 14–16px.

### Status badges/pills
Always icon-circle (16–26px, colored bg, white glyph: ✓ / ! / ▲ / … / ◷) + bold colored text, inside a `border-radius:999px` pill with a tinted background — **never color alone** (explicit rule on 1a). Canonical 5: Normal/green, Atenção/amber, Alterado/red, Agendado/blue, Pendente/neutral-gray. Reused verbatim (same hex families) for "Válida"/"Vencida" (3a), "Atrasado"/"Em dia" (3e), "Aplicada"/"Atrasada" (4e).

### Bottom navigation bar
5 items: Início · Consultas · Exames · Remédios · Mais. Height 64px/row, active item gets tinted background `#E8F5EE` and icon+label colored `#0C6341`; inactive items use `#55605C` icon/text on transparent. A rejected 7-tab alternative is explicitly shown as "descartada" (discarded) on 1a for forcing 11px labels/abbreviations below the legibility floor — confirms the design system intentionally caps bottom nav at 5 items + relies on "Mais" as an overflow hub (screen 3e's "Prevenção" content is reached via "Mais").

### Bottom sheets
Seen in 3a ("Adicionar documento" — 2 options + Cancelar): translucent backdrop `rgba(20,24,23,.45)` + white sheet sliding from bottom, radius on top corners, action rows ~48–52px tall.

### Side drawer / history panel
Seen in 4a (chat history): 296px-wide white panel sliding from left, `box-shadow:4px 0 24px rgba(0,0,0,.16)`, backdrop `rgba(20,24,23,.45)`.

### Chips/filters
Horizontal scrollable row (3a filter chips: Todos/Exames/Receitas/Alterados) — same selected/unselected pattern as form chips above.

### Confirmation/delete dialogs
Reused pattern across 3c, 3g, 2e: red alert box (bg `#FDECEA`, border `#F3C9C5`), 26px red circle "!" icon, message "Tem certeza? Essa ação não pode ser desfeita.", two-button row (Cancelar outline / Excluir solid red).

### Standard 4-state pattern (loading/empty/error/success)
Explicitly documented on 1a as reused across all lists/forms/uploads in all 4 Blocos:
- **Carregando:** skeleton bars (`#DFE3E1`/`#EFF1F0`) + spinning ring (border `#DFE3E1`, top segment `#10794E`) + "Carregando seus dados..." text.
- **Vazio:** 56×56 icon tile (`#E8F5EE`/`#C7E8D6`), message text, primary CTA button.
- **Erro:** red callout card + "!" icon + message + outlined red "Tentar novamente" button.
- **Sucesso:** dark-green (`#0C6341`) snackbar/toast with white check-circle + message, described as "4s no rodapé, acima da barra de abas"; critical actions instead use a full confirmation screen rather than a toast.
