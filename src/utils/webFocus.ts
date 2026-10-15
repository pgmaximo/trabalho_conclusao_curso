/**
 * Resumo do arquivo:
 * Utilitarios de foco especificos para React Native Web.
 * Evita avisos de acessibilidade quando o Expo Router oculta uma tela
 * enquanto o elemento que disparou a navegacao ainda esta focado.
 */
import { Platform } from 'react-native';

export function blurActiveWebElement() {
  if (Platform.OS !== 'web') {
    return;
  }

  const activeElement = globalThis.document?.activeElement;

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}
