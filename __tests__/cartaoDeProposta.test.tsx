/**
 * O cartão de proposta de memória (M8).
 *
 * Ele é o ponto em que o consentimento do art. 11, I acontece de verdade, e é
 * por isso que os testes daqui são sobre coisas que parecem detalhe de
 * interface e não são: o texto mostrado ser o texto gravado, a recusa ter o
 * mesmo peso da aceitação, e o cartão ficar FORA da bolha.
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { MemoryProposalCard } from '@/components/MemoryProposalCard';

const PROPOSTA = { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' as const };

function renderCartao(over: Partial<React.ComponentProps<typeof MemoryProposalCard>> = {}) {
  return render(
    <MemoryProposalCard
      proposta={PROPOSTA}
      onConfirmar={jest.fn()}
      onRecusar={jest.fn()}
      onVerMemoria={jest.fn()}
      {...over}
    />,
  );
}

describe('o que o cartão mostra', () => {
  it('pergunta antes de guardar', () => {
    renderCartao();
    expect(screen.getByText(/quer que eu lembre/i)).toBeTruthy();
  });

  it('mostra o texto EXATO que será gravado', () => {
    // Mostrar um resumo e gravar outra coisa esvaziaria o consentimento.
    renderCartao();
    expect(screen.getByText(/Prefiro respostas curtas/)).toBeTruthy();
  });

  it('tem as duas saídas, e as duas aparecem', () => {
    // Art. 18, VIII -- o direito de ser informado sobre a possibilidade de NÃO
    // consentir. Uma recusa escondida é uma recusa que não existe.
    renderCartao();
    expect(screen.getByText('Lembrar')).toBeTruthy();
    expect(screen.getByText('Agora não')).toBeTruthy();
  });

  it('a recusa tem o mesmo peso visual da aceitação', () => {
    // Conferido pelas classes aplicadas, e não por inspeção humana: um botão
    // grande ao lado de um link pequeno é consentimento induzido.
    renderCartao();
    const lembrar = screen.getByLabelText('Lembrar disso');
    const agoraNao = screen.getByLabelText('Agora não');
    const altura = (c: unknown) => String(c).match(/h-\d+/)?.[0];
    expect(altura(lembrar.props.className)).toBe(altura(agoraNao.props.className));
    expect(String(agoraNao.props.className)).toMatch(/flex-1/);
    expect(String(lembrar.props.className)).toMatch(/flex-1/);
  });

  it('não interpreta resultado de exame e não usa o termo vetado', () => {
    renderCartao();
    const raiz = ['defi', 'nitiv'].join('');
    expect(screen.queryByText(new RegExp(raiz, 'i'))).toBeNull();
    expect(screen.queryByText(/normal|alterado|preocupante|melhorou|piorou/i)).toBeNull();
  });
});

describe('o que cada botão faz', () => {
  it('Lembrar chama quem grava, com o texto e o tipo', async () => {
    const onConfirmar = jest.fn().mockResolvedValue(undefined);
    renderCartao({ onConfirmar });
    fireEvent.press(screen.getByText('Lembrar'));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith(PROPOSTA));
  });

  it('Agora não NÃO grava', () => {
    const onConfirmar = jest.fn();
    const onRecusar = jest.fn();
    renderCartao({ onConfirmar, onRecusar });
    fireEvent.press(screen.getByText('Agora não'));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(onRecusar).toHaveBeenCalled();
  });
});

describe('depois de guardar', () => {
  it('o cartão vira uma linha curta, sem mais botões', async () => {
    const onConfirmar = jest.fn().mockResolvedValue(undefined);
    renderCartao({ onConfirmar });
    fireEvent.press(screen.getByText('Lembrar'));
    // Espera pela APARIÇÃO, e não pela ausência: esperar algo sumir obriga o
    // `waitFor` a rodar até o teto do relógio mesmo no caminho feliz, e foi
    // isso que deixou este teste a 1,5 s e intermitente.
    await screen.findByText(/guardado/i);
    expect(screen.queryByText('Lembrar')).toBeNull();
    expect(screen.queryByText('Agora não')).toBeNull();
  });

  it('o atalho para a memória aparece depois de guardar', async () => {
    const onVerMemoria = jest.fn();
    renderCartao({ onConfirmar: jest.fn().mockResolvedValue(undefined), onVerMemoria });
    fireEvent.press(screen.getByText('Lembrar'));
    fireEvent.press(await screen.findByText(/o que eu lembro/i));
    expect(onVerMemoria).toHaveBeenCalled();
  });
});

describe('a memória cheia', () => {
  it('diz que está cheia e leva à tela, em vez de apagar algo sozinho', async () => {
    const onConfirmar = jest.fn().mockResolvedValue({ ok: false, motivo: 'cheia' });
    renderCartao({ onConfirmar });
    fireEvent.press(screen.getByText('Lembrar'));
    await screen.findByText(/cheia/i);
    expect(screen.getByText(/o que eu lembro/i)).toBeTruthy();
  });

  it('a mensagem de cheia não culpa a pessoa', () => {
    // Ela atingiu um limite que nós escolhemos. O texto diz o que fazer, e não
    // que ela guardou coisa demais.
    const { MENSAGEM_CHEIA } = require('@/components/MemoryProposalCard');
    expect(MENSAGEM_CHEIA).not.toMatch(/você (guardou|excedeu|abusou)/i);
    expect(MENSAGEM_CHEIA).toMatch(/apagar|apague/i);
  });
});
