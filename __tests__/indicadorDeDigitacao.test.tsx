/**
 * Achado do teste do app (2026-09-25): enquanto o assistente prepara a
 * resposta, os tres pontos ficavam parados -- nao dava para saber se o pedido
 * estava andando ou se o app tinha travado.
 *
 * Os pontos agora se movem (isso nao cabe num teste de unidade; foi conferido
 * no navegador). O que cabe aqui e o TEXTO: o indicador diz que esta
 * trabalhando e, se a espera passa do comum, avisa que continua -- sem
 * inventar etapas que o aplicativo nao sabe se aconteceram.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import { TypingIndicator } from '@/components/TypingIndicator';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('diz ao leitor de tela e a quem olha que a resposta esta sendo preparada', () => {
  render(<TypingIndicator />);
  expect(screen.getByLabelText('O assistente está preparando a resposta')).toBeTruthy();
  expect(screen.getByText('Pensando na resposta')).toBeTruthy();
});

it('numa espera longa, avisa que continua trabalhando', () => {
  render(<TypingIndicator />);
  expect(screen.queryByText(/Ainda trabalhando/)).toBeNull();

  act(() => {
    jest.advanceTimersByTime(8000);
  });

  expect(screen.getByText(/Ainda trabalhando/)).toBeTruthy();
});
