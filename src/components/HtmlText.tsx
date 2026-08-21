import React from 'react';
import { Linking, Text } from 'react-native';

import { useThemeColors } from '@/constants/theme';

type HtmlTextProps = {
  html: string;
};

type Segment = { text: string; bold?: boolean; href?: string };

/**
 * Parser minimo, sem dependencia externa: o texto vindo da USPSTF so usa <p>,
 * <a href="...">, <b>/<strong> — nao precisa de um motor de HTML completo.
 * DECISION: `react-native-render-html` (ultima publicacao em 2022, sem suporte
 * confirmado a New Architecture/React 19) foi avaliado e descartado — regra 3
 * da constituicao (so adicionar dependencia nova quando preenche uma lacuna
 * real; aqui um parser de ~30 linhas cobre o escopo real do conteudo).
 */
function parseSegments(html: string): Segment[] {
  const withoutParagraphs = html.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<\/?p[^>]*>/gi, '');
  const segments: Segment[] = [];
  const tagPattern = /<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>|<(b|strong)>(.*?)<\/\3>/gis;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (raw: string) => {
    const text = raw.replace(/<[^>]+>/g, '');
    if (text) {
      segments.push({ text });
    }
  };

  while ((match = tagPattern.exec(withoutParagraphs)) !== null) {
    pushPlain(withoutParagraphs.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      segments.push({ text: match[2].replace(/<[^>]+>/g, ''), href: match[1] });
    } else if (match[4] !== undefined) {
      segments.push({ text: match[4].replace(/<[^>]+>/g, ''), bold: true });
    }

    lastIndex = tagPattern.lastIndex;
  }

  pushPlain(withoutParagraphs.slice(lastIndex));

  return segments;
}

/**
 * Renderiza HTML vindo verbatim da API do USPSTF (title/text/rationale).
 * Nao traduzir nem alterar esse conteudo — exigencia de direitos autorais da AHRQ.
 * Apenas o estilo visual e adaptado ao tema do app.
 */
export function HtmlText({ html }: HtmlTextProps) {
  const colors = useThemeColors();
  const segments = parseSegments(html);

  return (
    <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={[
            segment.bold ? { fontWeight: '700' } : null,
            segment.href ? { color: colors.primary } : null,
          ]}
          onPress={segment.href ? () => Linking.openURL(segment.href as string) : undefined}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}
