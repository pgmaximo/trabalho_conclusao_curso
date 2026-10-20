/**
 * Resumo do arquivo:
 * O cartao da acao proposta (E11, D11.1 = A). Ele mostra o que vai para o
 * formulario, diz que nada foi salvo, e da a recusa o mesmo peso da aceitacao
 * -- o mesmo cuidado do cartao da memoria (`cartaoDeProposta.test.tsx`).
 */
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ActionProposalCard } from '@/components/ActionProposalCard';
import type { AcaoProposta } from '../amplify/functions/acoes-propostas-shared/camposDaAcao';

const COMPLETO: AcaoProposta = {
  tipo: 'ABRIR_NOVO_AGENDAMENTO',
  campos: { appointmentName: 'retorno', professionalName: 'dra ana', scheduledDate: '2026-10-30', scheduledTime: '14:00' },
};

const LEMBRETE: AcaoProposta = { tipo: 'ABRIR_NOVO_LEMBRETE', campos: { name: 'vitamina d', times: ['08:00'] } };

function renderCartao(acao: AcaoProposta, over: Partial<React.ComponentProps<typeof ActionProposalCard>> = {}) {
  return render(<ActionProposalCard acao={acao} onAbrir={jest.fn()} onRecusar={jest.fn()} {...over} />);
}

describe('o cartao de compromisso', () => {
  it('mostra os campos, a data por extenso e que nada foi salvo', () => {
    renderCartao(COMPLETO);
    expect(screen.getByText('Novo compromisso')).toBeTruthy();
    expect(screen.getByText('retorno')).toBeTruthy();
    expect(screen.getByText('dra ana')).toBeTruthy();
    expect(screen.getByText('sexta-feira, 30/10/2026')).toBeTruthy();
    expect(screen.getByText('14:00')).toBeTruthy();
    expect(screen.getByText('Nada foi salvo ainda.')).toBeTruthy();
    expect(screen.queryByText(/você escolhe no formulário/)).toBeNull();
  });

  it('sem data e hora, diz que a pessoa escolhe no formulario', () => {
    renderCartao({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'cardiologista' } });
    expect(screen.getByText('Data e hora você escolhe no formulário.')).toBeTruthy();
  });

  it('sem so a hora, diz so a hora', () => {
    renderCartao({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'retorno', scheduledDate: '2026-10-30' } });
    expect(screen.getByText('Hora você escolhe no formulário.')).toBeTruthy();
  });

  it('mostra o tipo so quando nao e consulta', () => {
    renderCartao({ tipo: 'ABRIR_NOVO_AGENDAMENTO', campos: { appointmentName: 'sangue', appointmentType: 'EXAME' } });
    expect(screen.getByText('Exame')).toBeTruthy();
  });

  it('sem tipo, nao ha linha de tipo', () => {
    renderCartao(COMPLETO);
    expect(screen.queryByText('Tipo')).toBeNull();
  });
});

describe('o cartao de lembrete', () => {
  it('mostra nome e horarios e manda completar o resto no formulario', () => {
    renderCartao(LEMBRETE);
    expect(screen.getByText('Novo lembrete de remédio')).toBeTruthy();
    expect(screen.getByText('vitamina d')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('Dose, frequência e estoque você completa no formulário.')).toBeTruthy();
    expect(screen.getByText('Nada foi salvo ainda.')).toBeTruthy();
  });
});

describe('os botoes', () => {
  it('abrir entrega a acao; recusar so recusa', () => {
    const onAbrir = jest.fn();
    const onRecusar = jest.fn();
    renderCartao(COMPLETO, { onAbrir, onRecusar });

    fireEvent.press(screen.getByLabelText('Abrir formulário'));
    expect(onAbrir).toHaveBeenCalledWith(COMPLETO);

    fireEvent.press(screen.getByLabelText('Agora não'));
    expect(onRecusar).toHaveBeenCalledTimes(1);
  });

  // Revisao do E11 (menor): dois toques antes de a tela redesenhar abriam o
  // formulario duas vezes, um em cima do outro.
  it('dois toques seguidos abrem o formulario uma vez so', () => {
    const onAbrir = jest.fn();
    renderCartao(COMPLETO, { onAbrir });

    fireEvent.press(screen.getByLabelText('Abrir formulário'));
    fireEvent.press(screen.getByLabelText('Abrir formulário'));

    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it('a recusa tem o mesmo peso visual da aceitacao', () => {
    renderCartao(COMPLETO);
    const abrir = screen.getByLabelText('Abrir formulário');
    const agoraNao = screen.getByLabelText('Agora não');
    const altura = (c: unknown) => String(c).match(/h-\d+/)?.[0];
    expect(altura(abrir.props.className)).toBe(altura(agoraNao.props.className));
    expect(String(abrir.props.className)).toMatch(/flex-1/);
    expect(String(agoraNao.props.className)).toMatch(/flex-1/);
  });
});
