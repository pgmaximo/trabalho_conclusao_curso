jest.mock('@/services/extractionService', () => ({ correctLabResult: jest.fn() }));

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CorrectResultPanel } from '@/components/CorrectResultPanel';
import { correctLabResult, type LabResultView } from '@/services/extractionService';

// 62292-8 = a soma D3+D2 em massa, que e o que o laboratorio brasileiro
// reporta. Do catalogo gerado a partir do extrato oficial do LOINC.
const pendente: LabResultView = {
  id: 'linha-1',
  analyteCode: '62292-8',
  projectLabel: 'Vitamina D (25-OH)',
  analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
  value: null,
  valueQualifier: null,
  unit: 'ng/mL',
  rawValue: '3Z,5',
  rawUnit: 'ng/mL',
  referenceLow: 30,
  referenceHigh: 100,
  collectedAt: '2026-03-12',
  collectionMoment: null,
  sourcePage: 2,
  reviewStatus: 'PENDENTE_DE_REVISAO',
};

describe('CorrectResultPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (correctLabResult as jest.Mock).mockResolvedValue({ ok: true });
  });

  it('mostra o que estava escrito no papel, para a pessoa conferir', () => {
    render(<CorrectResultPanel onCancel={jest.fn()} onDone={jest.fn()} result={pendente} />);
    expect(screen.getByText(/3Z,5/)).toBeTruthy();
  });

  it('aceita virgula decimal, que e como a pessoa digita', async () => {
    render(<CorrectResultPanel onCancel={jest.fn()} onDone={jest.fn()} result={pendente} />);
    fireEvent.changeText(screen.getByLabelText(/valor/i), '32,5');
    fireEvent.press(screen.getByText(/salvar correção/i));
    await waitFor(() =>
      expect(correctLabResult).toHaveBeenCalledWith('linha-1', '32,5', 'ng/mL'),
    );
  });

  it('recusa texto que nao e numero, sem gravar nada', async () => {
    (correctLabResult as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Não entendemos esse número.',
    });
    render(<CorrectResultPanel onCancel={jest.fn()} onDone={jest.fn()} result={pendente} />);
    fireEvent.changeText(screen.getByLabelText(/valor/i), 'trinta e dois');
    fireEvent.press(screen.getByText(/salvar correção/i));
    await waitFor(() => expect(screen.getByText(/não entendemos/i)).toBeTruthy());
  });

  it('nao oferece campo livre de unidade -- so a unidade que a tela ja mostra', () => {
    // Campo livre traria a conversao de unidade para dentro do aplicativo, e a
    // conversao vive num lugar so, sob teste, na Lambda (D30).
    render(<CorrectResultPanel onCancel={jest.fn()} onDone={jest.fn()} result={pendente} />);
    expect(screen.queryByLabelText(/digite a unidade/i)).toBeNull();
    expect(screen.getByText('ng/mL')).toBeTruthy();
  });

  it('cancelar nao grava nada', () => {
    const onCancel = jest.fn();
    render(<CorrectResultPanel onCancel={onCancel} onDone={jest.fn()} result={pendente} />);
    fireEvent.press(screen.getByText(/cancelar/i));
    expect(correctLabResult).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('avisa quem abriu que a correcao entrou, para a tela reler o banco', async () => {
    const onDone = jest.fn();
    render(<CorrectResultPanel onCancel={jest.fn()} onDone={onDone} result={pendente} />);
    fireEvent.changeText(screen.getByLabelText(/valor/i), '32,5');
    fireEvent.press(screen.getByText(/salvar correção/i));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('nenhuma copy classifica o valor', () => {
    const { toJSON } = render(
      <CorrectResultPanel onCancel={jest.fn()} onDone={jest.fn()} result={pendente} />,
    );
    const texto = JSON.stringify(toJSON()).toLowerCase();
    expect(texto).not.toMatch(/alterado|preocupante|dentro do esperado|fora do esperado/);
  });
});
