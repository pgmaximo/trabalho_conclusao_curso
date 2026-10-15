import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import themeTokens from '@/constants/themeTokens.json';

// No tema escuro os verdes, o azul, o ambar e o vermelho sao CLAROS (Canvas 1c).
// Varios lugares escreviam em branco fixo por cima deles: "Resumo de hoje" dava
// 3,1:1, e os botoes "Ver carteira de vacinação" e "Agendar consulta", 2,2:1.
// O texto sobre essas cores usa o token `onPrimary`, branco no tema claro e
// quase preto no escuro (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D5).

// Contraste WCAG 2.1 entre duas cores #RRGGBB.
function contraste(a: string, b: string): number {
  const luminancia = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

// As cores cheias sobre as quais o app escreve.
const FUNDOS = [
  'primary',
  'primaryDark',
  'success',
  'warning',
  'danger',
  'secondary',
  'successIconBg',
  'warningIconBg',
  'dangerIconBg',
  'infoIconBg',
] as const;

describe('texto sobre cor cheia', () => {
  it.each(['light', 'dark'] as const)('onPrimary tem contraste de 4,5:1 sobre todas elas no tema %s', (tema) => {
    const cores = themeTokens[tema];

    for (const fundo of FUNDOS) {
      expect({ fundo, contraste: contraste(cores.onPrimary, cores[fundo]) >= 4.5 }).toEqual({
        fundo,
        contraste: true,
      });
    }
  });

  it('branco fixo NAO serve no tema escuro: e por isso que o token existe', () => {
    expect(contraste('#FFFFFF', themeTokens.dark.primary)).toBeLessThan(3);
    expect(contraste('#FFFFFF', themeTokens.dark.primaryDark)).toBeLessThan(4.5);
  });

  it('o circulo neutro dos selos e a excecao: e escuro nos dois temas, e leva branco', () => {
    expect(contraste('#FFFFFF', themeTokens.light.neutralIconBg)).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#FFFFFF', themeTokens.dark.neutralIconBg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('telas e componentes', () => {
  // O aviso de sucesso tem fundo verde-escuro FIXO (#0C6341) nos dois temas, e
  // branco sobre ele da 7,3:1.
  const PERMITIDOS = new Set(['SuccessSnackbar.tsx']);

  const pastas = ['screens', 'components', join('components', 'charts'), join('components', 'profileSetup')];
  const arquivos = pastas.flatMap((pasta) => {
    const caminho = join(__dirname, '..', 'src', pasta);
    return readdirSync(caminho)
      .filter((nome) => nome.endsWith('.tsx') && !PERMITIDOS.has(nome))
      .map((nome) => ({ nome: join(pasta, nome), texto: readFileSync(join(caminho, nome), 'utf8') }));
  });

  it('nenhuma escreve em branco fixo com className', () => {
    const comBrancoFixo = arquivos
      // `text-white/90` tambem conta; `bg-white/20` (fundo translucido) nao.
      .filter(({ texto }) => /(^|[\s"'`])text-white\b/.test(texto))
      .map(({ nome }) => nome);

    expect(comBrancoFixo).toEqual([]);
  });
});
