import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';

// O formulario de medicamento (novo lembrete e edicao) validava a cada
// renderizacao e mostrava todos os erros de uma vez: ele ABRIA com sete campos
// em vermelho, antes de a pessoa tocar em qualquer coisa. Agora o erro de um
// campo so aparece depois que a pessoa passou por ele
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D2).

jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const ERROS_DO_FORMULARIO_VAZIO = [
  'Informe o nome do medicamento.',
  'Informe a dosagem.',
  'Selecione a forma do medicamento.',
  'Adicione ao menos um horário de dose.',
  'Selecione a frequência.',
  'Informe a data de início.',
  'Selecione a unidade.',
];

function Formulario({ inicial = EMPTY_MEDICINE_FORM }: { inicial?: MedicineFormState }) {
  const [form, setForm] = useState(inicial);
  return (
    <MedicineFormFields
      fieldErrors={validateMedicineForm(form)}
      form={form}
      onChange={(patch) => setForm((atual) => ({ ...atual, ...patch }))}
    />
  );
}

describe('MedicineFormFields', () => {
  it('o formulario vazio de fato tem os sete erros, que antes apareciam todos ao abrir', () => {
    expect(Object.values(validateMedicineForm(EMPTY_MEDICINE_FORM))).toEqual(ERROS_DO_FORMULARIO_VAZIO);
  });

  it('abre sem nenhum erro na tela', () => {
    render(<Formulario />);

    for (const erro of ERROS_DO_FORMULARIO_VAZIO) {
      expect(screen.queryByText(erro)).toBeNull();
    }
  });

  it('mostra o erro de um campo de texto quando a pessoa sai dele sem preencher', () => {
    render(<Formulario />);

    fireEvent(screen.getByLabelText('Nome do medicamento'), 'blur');

    expect(screen.getByText('Informe o nome do medicamento.')).toBeTruthy();
    // So o campo visitado: os demais continuam sem erro.
    expect(screen.queryByText('Informe a dosagem.')).toBeNull();
    expect(screen.queryByText('Selecione a unidade.')).toBeNull();
  });

  it('tira o erro assim que o campo e preenchido', () => {
    render(<Formulario />);
    const nome = screen.getByLabelText('Nome do medicamento');

    fireEvent(nome, 'blur');
    fireEvent.changeText(nome, 'Losartana');

    expect(screen.queryByText('Informe o nome do medicamento.')).toBeNull();
  });

  it('mostra o erro do horario quando a pessoa sai dele com um valor invalido', () => {
    render(<Formulario />);
    const horario = screen.getByLabelText('Horário da dose');

    fireEvent.changeText(horario, '99');
    expect(screen.queryByText(/hh:mm\.$/)).toBeNull();

    fireEvent(horario, 'blur');
    expect(screen.getByText('Informe os horários de dose no formato hh:mm.')).toBeTruthy();
  });

  it('nao cobra os dias da semana no instante em que a pessoa escolhe "Dias específicos"', () => {
    render(<Formulario />);

    fireEvent.press(screen.getByText('Dias específicos'));
    expect(screen.queryByText('Selecione ao menos um dia da semana.')).toBeNull();

    // Marcou um dia e desmarcou: agora ela mexeu nos dias, e o erro aparece.
    fireEvent.press(screen.getByText('Seg'));
    fireEvent.press(screen.getByText('Seg'));
    expect(screen.getByText('Selecione ao menos um dia da semana.')).toBeTruthy();
  });

  it('na edicao, um medicamento valido continua abrindo sem erro', () => {
    render(
      <Formulario
        inicial={{
          ...EMPTY_MEDICINE_FORM,
          name: 'Losartana',
          dosage: '50mg',
          form: 'PILL',
          times: ['08:00'],
          frequencyType: 'DAILY',
          startDate: '2026-09-01',
          hasNoEndDate: true,
          currentStock: '30',
          unit: 'COMP',
        }}
      />,
    );

    expect(screen.queryByText(/^(Informe|Selecione|Adicione)/)).toBeNull();
  });
});
