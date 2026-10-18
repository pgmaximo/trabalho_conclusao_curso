import React from 'react';
import { Text, View } from 'react-native';

import {
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
  VIGENCIA_DOS_TERMOS,
  type BlocoDoTermo,
} from '@/data/termosEPrivacidade';

const PARAGRAFO =
  'text-[15px] leading-[22px] text-app-textSecondary dark:text-app-dark-textSecondary';

function chaveDoBloco(bloco: BlocoDoTermo): string {
  return typeof bloco === 'string' ? bloco : bloco[0];
}

function Bloco({ bloco }: { bloco: BlocoDoTermo }) {
  if (typeof bloco === 'string') {
    return <Text className={`mt-3 ${PARAGRAFO}`}>{bloco}</Text>;
  }

  return (
    <View className="mt-2 gap-2">
      {bloco.map((item) => (
        <View className="flex-row gap-2 pl-1" key={item}>
          <Text className={PARAGRAFO}>•</Text>
          <Text className={`flex-1 ${PARAGRAFO}`}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * O texto integral dos Termos de Uso e da Política de Privacidade. É o mesmo
 * componente na tela de consulta (Mais > Termos e privacidade) e no link do
 * cadastro, para que o texto aceito e o texto consultado nunca divirjam.
 */
export function TermsDocument() {
  return (
    <View>
      <Text className="text-[13px] text-app-textMuted dark:text-app-dark-textMuted">
        Versão {VERSAO_DOS_TERMOS} · vigente desde {VIGENCIA_DOS_TERMOS}
      </Text>

      {TERMOS_E_PRIVACIDADE.map((parte) => (
        <View className="mt-6" key={parte.titulo}>
          <Text
            accessibilityRole="header"
            className="text-xl font-bold text-app-text dark:text-app-dark-text"
          >
            {parte.titulo}
          </Text>

          {parte.secoes.map((secao) => (
            <View className="mt-5" key={secao.numero}>
              <Text
                accessibilityRole="header"
                className="text-[17px] font-semibold leading-6 text-app-text dark:text-app-dark-text"
              >
                {secao.numero}. {secao.titulo}
              </Text>
              {secao.blocos.map((bloco) => (
                <Bloco bloco={bloco} key={chaveDoBloco(bloco)} />
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
