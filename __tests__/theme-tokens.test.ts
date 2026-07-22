import themeTokens from '@/constants/themeTokens.json';
import { COLORS, DARK_THEME, LIGHT_THEME, getTheme } from '@/constants/theme';

const tailwindConfig = require('../tailwind.config.js');

describe('centralized theme tokens', () => {
  it('uses the same light and dark tokens in React Native theme exports', () => {
    expect(themeTokens.light.background).toBe('#F5F5F5');
    expect(themeTokens.dark.background).toBe('#0A0A0A');

    expect(LIGHT_THEME.colors.background).toBe(themeTokens.light.background);
    expect(DARK_THEME.colors.background).toBe(themeTokens.dark.background);
    expect(COLORS.background).toBe(themeTokens.light.background);
    expect(getTheme('dark').colors.surface).toBe(themeTokens.dark.surface);
  });

  it('exposes semantic Tailwind colors from the central tokens', () => {
    expect(tailwindConfig.theme.extend.colors.app.background).toBe(themeTokens.light.background);
    expect(tailwindConfig.theme.extend.colors.app.surface).toBe(themeTokens.light.surface);
    expect(tailwindConfig.theme.extend.colors['app-dark'].background).toBe(
      themeTokens.dark.background,
    );
    expect(tailwindConfig.theme.extend.colors['app-dark'].surface).toBe(themeTokens.dark.surface);
  });
});
