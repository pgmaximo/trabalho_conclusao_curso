jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AnalyteCollectionRow } from '@/components/AnalyteCollectionRow';
import type { SeriesPoint } from '@/services/analyteSeries';

// O papel trouxe 79,87 nmol/L e a normalizacao converteu para 32,5 ng/mL --
// o caso que a rastreabilidade existe para explicar.
const ponto: SeriesPoint = {
  id: 'p1',
  documentId: 'doc-marco',
  collectedAt: '2026-03-12',
  value: 32.5,
  referenceLow: 30,
  referenceHigh: 100,
  rawValue: '79,87',
  rawUnit: 'nmol/L',
};

describe('AnalyteCollectionRow', () => {
  beforeEach(() => (router.push as jest.Mock).mockReset());

  it('mostra data, valor e a faixa daquele laboratorio', () => {
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(screen.getByText(/12\/03\/2026/)).toBeTruthy();
    expect(screen.getByText(/32,5/)).toBeTruthy();
    expect(screen.getByText(/30.*100/)).toBeTruthy();
  });

  it('mostra o que estava no papel quando difere do valor exibido', () => {
    // E a rastreabilidade que a EPIC anterior gravou para isto: quando a
    // pessoa perguntar de onde saiu 32,5, a resposta e "79,87 nmol/L no
    // documento de marco", nao o resultado da conta.
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(screen.getByText(/79,87 nmol\/L/)).toBeTruthy();
  });

  it('NAO repete o papel quando ele e igual ao valor exibido', () => {
    // Repetir o mesmo numero duas vezes e ruido, e ruido faz a pessoa parar de
    // ler a linha que as vezes importa.
    render(
      <AnalyteCollectionRow
        point={{ ...ponto, rawValue: '32,5', rawUnit: 'ng/mL' }}
        unit="ng/mL"
      />,
    );
    expect(screen.queryByText(/no documento/i)).toBeNull();
  });

  it('diz quando o laboratorio nao informou faixa, em vez de omitir', () => {
    render(
      <AnalyteCollectionRow
        point={{ ...ponto, referenceLow: null, referenceHigh: null }}
        unit="ng/mL"
      />,
    );
    expect(screen.getByText(/não informou faixa/i)).toBeTruthy();
  });

  it('abre o documento de origem', () => {
    render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    fireEvent.press(screen.getByLabelText(/abrir o documento/i));
    expect(router.push).toHaveBeenCalledWith('/document-detail?id=doc-marco');
  });

  it('nenhuma copy compara o valor com a faixa', () => {
    // "Dentro da faixa" e "acima do limite" sao leitura clinica. A pessoa ve
    // os dois numeros lado a lado e leva a duvida a uma consulta.
    const { toJSON } = render(<AnalyteCollectionRow point={ponto} unit="ng/mL" />);
    expect(JSON.stringify(toJSON()).toLowerCase()).not.toMatch(
      /dentro da|fora da|acima do|abaixo do|alterado/,
    );
  });
});
