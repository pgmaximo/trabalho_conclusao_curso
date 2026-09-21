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
  rawReferenceText: null,
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

  it('mostra a faixa em TEXTO quando o laudo a escreveu em tabela (F1)', () => {
    // O perfil lipidico inteiro e a vitamina D chegam assim: o laudo apresenta
    // a faixa por risco ou por idade, e nao como dois numeros. Antes disto a
    // linha aparecia sem nada ao lado, e a pessoa via um valor solto.
    render(
      <AnalyteCollectionRow
        point={{
          ...ponto,
          referenceLow: null,
          referenceHigh: null,
          rawReferenceText: 'Suficiência: 30 a 60 ng/mL',
        }}
        unit="ng/mL"
      />,
    );
    expect(screen.getByText(/Suficiência: 30 a 60 ng\/mL/)).toBeTruthy();
    expect(screen.queryByText(/laudo não trouxe faixa/i)).toBeNull();
  });

  it('o texto da faixa NAO recebe a unidade convertida ao lado (F1)', () => {
    // O valor exibido foi convertido de nmol/L para ng/mL; o texto da faixa
    // nao, porque texto nao tem escala. Carimbar "ng/mL" no fim de uma frase
    // que o laudo escreveu em outra unidade seria inventar um laudo.
    render(
      <AnalyteCollectionRow
        point={{
          ...ponto,
          referenceLow: null,
          referenceHigh: null,
          rawReferenceText: 'Suficiência: 75 a 150 nmol/L',
        }}
        unit="ng/mL"
      />,
    );
    expect(screen.getByText('Referência deste laboratório: Suficiência: 75 a 150 nmol/L')).toBeTruthy();
    // E a ancora de leitura continua na linha: o que o papel dizia.
    expect(screen.getByText(/79,87 nmol\/L/)).toBeTruthy();
  });

  it('quando existem os dois, o NUMERO manda -- o texto nao duplica a faixa', () => {
    // A precedencia esta escrita na spec: numero, depois texto, depois a frase
    // honesta. Sem ela, a mesma faixa apareceria duas vezes na mesma linha.
    render(
      <AnalyteCollectionRow
        point={{ ...ponto, rawReferenceText: 'Suficiência: 30 a 60 ng/mL' }}
        unit="ng/mL"
      />,
    );
    expect(screen.getByText(/30.*100/)).toBeTruthy();
    expect(screen.queryByText(/Suficiência/)).toBeNull();
  });

  it('diz que o LAUDO nao trouxe faixa, sem afirmar o que o laboratorio fez (F2)', () => {
    // Medido em 2026-09-19: 14 das 48 linhas do laudo entraram sem faixa, e em
    // doze delas o laboratorio TINHA informado -- em tabela, numa forma que o
    // esquema nao guardava. A frase antiga ("este laboratorio nao informou
    // faixa") afirmava algo sobre um terceiro com base numa lacuna nossa.
    render(
      <AnalyteCollectionRow
        point={{ ...ponto, referenceLow: null, referenceHigh: null }}
        unit="ng/mL"
      />,
    );
    expect(screen.getByText(/laudo não trouxe faixa/i)).toBeTruthy();
    expect(screen.queryByText(/laboratório não informou/i)).toBeNull();
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
