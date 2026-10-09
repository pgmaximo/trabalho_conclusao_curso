import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateInput } from '@/components/DateInput';

// Defeitos do seletor de data, usado em sete telas
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D1):
//
// 1. Ele reabria no dia errado. Uma data "AAAA-MM-DD" passada a `new Date()` e
//    lida como meia-noite UTC, e no Brasil (UTC-3) isso e a noite do dia
//    ANTERIOR: 01/10 abria em 30 de setembro. A suite roda em
//    America/Sao_Paulo (jest.config.js), entao este teste pega a regressao.
// 2. So havia setas de mes. Registrar uma vacina de 2015 pedia mais de 130
//    toques.
// 3. As setas nao tinham nome para o leitor de tela.
// 4. O botao "Confirmar" so fechava a janela: a escolha ja acontecia ao tocar
//    no dia.

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

function renderInput(props: Partial<React.ComponentProps<typeof DateInput>> = {}) {
  const onChange = jest.fn();
  render(<DateInput label="Data" onChange={onChange} value="" {...props} />);
  return { onChange };
}

function abrir() {
  fireEvent.press(screen.getByRole('button', { name: /^Data:/ }));
}

describe('DateInput', () => {
  it('mostra o formato em portugues quando nao ha data', () => {
    renderInput();
    expect(screen.getByText('DD/MM/AAAA')).toBeTruthy();
  });

  it('abre no mes e no dia da data guardada, e nao no dia anterior', () => {
    renderInput({ value: '2026-10-01' });
    abrir();

    expect(screen.getByText('outubro')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: '1 de outubro de 2026', selected: true })).toBeTruthy();
  });

  it('so marca como escolhido o dia da data guardada, e nao o mesmo numero em outro mes', () => {
    renderInput({ value: '2026-10-15' });
    abrir();

    fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));

    expect(screen.getByText('novembro')).toBeTruthy();
    expect(screen.queryByRole('button', { selected: true })).toBeNull();
  });

  it('volta anos inteiros com um toque por ano', () => {
    const { onChange } = renderInput({ value: '2026-10-09' });
    abrir();

    for (let i = 0; i < 11; i += 1) {
      fireEvent.press(screen.getByRole('button', { name: 'Ano anterior' }));
    }
    expect(screen.getByText('2015')).toBeTruthy();
    expect(screen.getByText('outubro')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '20 de outubro de 2015' }));

    expect(onChange).toHaveBeenCalledWith('2015-10-20');
  });

  it('da nome as quatro setas, para o leitor de tela', () => {
    renderInput({ value: '2026-10-09' });
    abrir();

    for (const nome of ['Ano anterior', 'Próximo ano', 'Mês anterior', 'Próximo mês']) {
      expect(screen.getByRole('button', { name: nome })).toBeTruthy();
    }
  });

  it('escolhe ao tocar no dia, e fecha', () => {
    const { onChange } = renderInput({ value: '2026-10-09' });
    abrir();

    fireEvent.press(screen.getByRole('button', { name: '12 de outubro de 2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-10-12');
    expect(screen.queryByText('outubro')).toBeNull();
  });

  it('o botao de baixo se chama "Cancelar" e fecha sem mudar a data', () => {
    const { onChange } = renderInput({ value: '2026-10-09' });
    abrir();

    expect(screen.queryByText('Confirmar')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('outubro')).toBeNull();
  });

  it('reabre no mes da data guardada, mesmo depois de a pessoa navegar e cancelar', () => {
    renderInput({ value: '2026-10-09' });
    abrir();
    fireEvent.press(screen.getByRole('button', { name: 'Ano anterior' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    abrir();

    expect(screen.getByText('2026')).toBeTruthy();
  });

  describe('com data maxima', () => {
    it('nao deixa escolher um dia depois dela', () => {
      const { onChange } = renderInput({ value: '2026-10-05', maxDate: '2026-10-09' });
      abrir();

      const depois = screen.getByRole('button', { name: '10 de outubro de 2026' });
      expect(depois.props.accessibilityState).toMatchObject({ disabled: true });

      fireEvent.press(depois);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('nao avanca para um mes que so tem dias proibidos', () => {
      renderInput({ value: '2026-10-05', maxDate: '2026-10-09' });
      abrir();

      for (const nome of ['Próximo mês', 'Próximo ano']) {
        expect(screen.getByRole('button', { name: nome }).props.accessibilityState).toMatchObject({
          disabled: true,
        });
      }
    });

    it('ao avancar um ano, para no mes da data maxima em vez de passar dela', () => {
      renderInput({ value: '2025-11-20', maxDate: '2026-10-09' });
      abrir();

      fireEvent.press(screen.getByRole('button', { name: 'Próximo ano' }));

      expect(screen.getByText('2026')).toBeTruthy();
      expect(screen.getByText('outubro')).toBeTruthy();
    });
  });
});
