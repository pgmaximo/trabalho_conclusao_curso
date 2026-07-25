import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

import { useThemeColors } from '@/constants/theme';

type HtmlTextProps = {
  html: string;
};

/**
 * Renderiza HTML vindo verbatim da API do USPSTF (title/text/rationale).
 * Nao traduzir nem alterar esse conteudo — exigencia de direitos autorais da AHRQ.
 * Apenas o estilo visual e adaptado ao tema do app.
 */
export function HtmlText({ html }: HtmlTextProps) {
  const { width } = useWindowDimensions();
  const colors = useThemeColors();

  return (
    <RenderHTML
      contentWidth={width}
      source={{ html }}
      baseStyle={{ color: colors.text, fontSize: 15, lineHeight: 21 }}
      tagsStyles={{
        a: { color: colors.primary },
        strong: { fontWeight: '700' },
        b: { fontWeight: '700' },
      }}
    />
  );
}
