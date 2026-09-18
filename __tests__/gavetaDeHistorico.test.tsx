/**
 * A gaveta de histórico com conversas reais (C9), destravada pela D33.
 *
 * O que ela precisa dizer, e por quê: a D33 escolheu guardar a conversa **sem
 * prazo**, e a contrapartida dessa escolha é que a pessoa saiba disso e possa
 * apagar. A linha de retenção não é cortesia de texto — é a metade da decisão
 * que fica visível.
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

import { HistoryDrawer } from '@/components/HistoryDrawer';

const HOJE = { id: 'c-1', title: 'Como está minha vitamina D?', onSelect: jest.fn() };
const ONTEM = { id: 'c-2', title: 'Quando é minha consulta?', onSelect: jest.fn() };

function renderGaveta(over: Partial<React.ComponentProps<typeof HistoryDrawer>> = {}) {
  return render(
    <HistoryDrawer
      groups={[
        { group: 'Hoje', items: [HOJE] },
        { group: 'Ontem', items: [ONTEM] },
      ]}
      visible
      onClose={jest.fn()}
      onNewChat={jest.fn()}
      onDelete={jest.fn()}
      onAbrirMemoria={jest.fn()}
      {...over}
    />,
  );
}

beforeEach(() => {
  HOJE.onSelect.mockReset();
  ONTEM.onSelect.mockReset();
});

describe('a gaveta com conversas reais', () => {
  it('lista as conversas agrupadas por periodo', () => {
    renderGaveta();
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Ontem')).toBeTruthy();
    expect(screen.getByText('Como está minha vitamina D?')).toBeTruthy();
  });

  it('tocar numa conversa abre aquela conversa', () => {
    renderGaveta();
    fireEvent.press(screen.getByText('Como está minha vitamina D?'));
    expect(HOJE.onSelect).toHaveBeenCalled();
  });

  it('sem conversa anterior, o estado vazio continua sendo um estado legitimo', () => {
    renderGaveta({ groups: [] });
    expect(screen.getByText(/nenhuma conversa anterior/i)).toBeTruthy();
  });
});

describe('o que a tela diz sobre o que é guardado (D33)', () => {
  it('diz que as conversas ficam guardadas', () => {
    renderGaveta();
    expect(screen.getByText(/ficam guardadas/i)).toBeTruthy();
  });

  it('diz que a pessoa pode apagar', () => {
    // Guardar sem prazo e so defensavel porque apagar esta na mao dela. Dizer
    // uma coisa sem a outra seria contar metade da decisao.
    renderGaveta();
    expect(screen.getByText(/apagar/i)).toBeTruthy();
  });

  it('a linha aparece TAMBEM quando nao ha conversa nenhuma', () => {
    // E a primeira vez que a pessoa abre a gaveta que ela precisa saber o que
    // vai ser guardado -- nao depois de ja ter dez conversas dentro.
    renderGaveta({ groups: [] });
    expect(screen.getByText(/ficam guardadas/i)).toBeTruthy();
  });

  it('a linha NAO promete prazo de expiracao', () => {
    // A D33 decidiu guardar sem prazo. Escrever "por 90 dias" aqui seria a
    // tela mentindo sobre o que o banco faz.
    renderGaveta();
    const texto = screen.getByText(/ficam guardadas/i).props.children as string;
    expect(texto).not.toMatch(/\d+\s*(dias|meses|ano)/i);
  });
});

describe('a porta de entrada da memoria (M11)', () => {
  it('a gaveta leva ao que o assistente lembra', () => {
    // A gaveta e onde a pessoa ja esta perguntando "o que este aplicativo
    // guarda de mim". A memoria responde a mesma pergunta, e por isso as duas
    // portas ficam juntas.
    const onAbrirMemoria = jest.fn();
    renderGaveta({ onAbrirMemoria });
    fireEvent.press(screen.getByText(/o que eu lembro/i));
    expect(onAbrirMemoria).toHaveBeenCalled();
  });

  it('a porta aparece TAMBEM sem conversa nenhuma', () => {
    renderGaveta({ groups: [], onAbrirMemoria: jest.fn() });
    expect(screen.getByText(/o que eu lembro/i)).toBeTruthy();
  });

  it('sem quem trate o toque, a porta nao aparece', () => {
    // Um item que nao leva a lugar nenhum e pior do que item nenhum.
    renderGaveta({ onAbrirMemoria: undefined });
    expect(screen.queryByText(/o que eu lembro/i)).toBeNull();
  });
});

describe('apagar uma conversa', () => {
  it('pede confirmacao antes, e nunca com alerta do sistema', () => {
    // Convencao do repositorio: painel inline, nunca `Alert.alert`.
    renderGaveta();
    fireEvent.press(screen.getAllByLabelText(/apagar conversa/i)[0]);
    expect(screen.getByText(/não pode ser desfeita/i)).toBeTruthy();
  });

  it('confirmar chama quem apaga de verdade, com o id da conversa', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    renderGaveta({ onDelete });
    fireEvent.press(screen.getAllByLabelText(/apagar conversa/i)[0]);
    fireEvent.press(screen.getByText('Excluir'));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('c-1'));
  });

  it('cancelar NAO apaga', () => {
    const onDelete = jest.fn();
    renderGaveta({ onDelete });
    fireEvent.press(screen.getAllByLabelText(/apagar conversa/i)[0]);
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/não pode ser desfeita/i)).toBeNull();
  });

  it('a confirmacao pede sobre UMA conversa, e nao sobre todas', () => {
    // Um painel que aparecesse em cima da lista inteira deixaria a pessoa sem
    // saber qual conversa esta prestes a sumir.
    renderGaveta();
    fireEvent.press(screen.getAllByLabelText(/apagar conversa/i)[1]);
    expect(screen.getAllByText(/não pode ser desfeita/i)).toHaveLength(1);
  });
});
