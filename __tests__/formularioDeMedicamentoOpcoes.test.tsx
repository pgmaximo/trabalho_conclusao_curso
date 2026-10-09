import React, { useState } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  EMPTY_MEDICINE_FORM,
  MedicineFormFields,
  validateMedicineForm,
  type MedicineFormState,
} from '@/components/MedicineFormFields';
import { MEDICINE_UNIT_OPTIONS, medicineUnitLabel } from '@/utils/medicineUnit';

// Duas queixas do formulario de medicamento
// (specs/00-fundacao/correcoes-menores/spec.md, D4):
//
// 1. Eram 12 campos numa rolagem so. Os tres que quase ninguem preenche (aviso
//    de estoque, observacoes, lembretes ligados ou desligados) ficam atras de
//    "Mais opções".
// 2. As unidades do estoque (Comp., ml, Cáps.) nao cobriam as formas que o
//    proprio formulario oferece (Gotas, Injeção, Outro), e a unidade e
//    obrigatoria: uma caneta de insulina virava "3 comp.".

jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const OPCIONAIS = ['Avisar quando restar menos de (opcional)', 'Observações (opcional)'];

function Formulario({
  inicial = EMPTY_MEDICINE_FORM,
  aoMudar,
}: {
  inicial?: MedicineFormState;
  aoMudar?: (form: MedicineFormState) => void;
}) {
  const [form, setForm] = useState(inicial);
  return (
    <MedicineFormFields
      fieldErrors={validateMedicineForm(form)}
      form={form}
      onChange={(patch) =>
        setForm((atual) => {
          const novo = { ...atual, ...patch };
          aoMudar?.(novo);
          return novo;
        })
      }
    />
  );
}

function maisOpcoes() {
  return screen.getByRole('button', { name: /^Mais opções/ });
}

describe('Mais opções', () => {
  it('o formulario novo abre sem os campos opcionais', () => {
    render(<Formulario />);

    for (const campo of OPCIONAIS) {
      expect(screen.queryByLabelText(campo)).toBeNull();
    }
    expect(screen.queryByText('Lembretes')).toBeNull();
    expect(maisOpcoes().props.accessibilityState).toMatchObject({ expanded: false });
    // O botao diz o que ha dentro: ninguem precisa abrir para descobrir.
    expect(screen.getByText('Aviso de estoque, observações e lembretes')).toBeTruthy();
  });

  it('os campos obrigatorios continuam todos a vista', () => {
    render(<Formulario />);

    expect(screen.getByLabelText('Nome do medicamento')).toBeTruthy();
    expect(screen.getByLabelText('Dosagem')).toBeTruthy();
    expect(screen.getByText('Forma')).toBeTruthy();
    expect(screen.getByText('Horário(s) da dose')).toBeTruthy();
    expect(screen.getByText('Frequência')).toBeTruthy();
    expect(screen.getByText('Data de início')).toBeTruthy();
    expect(screen.getByLabelText('Estoque atual')).toBeTruthy();
    expect(screen.getByText('Unidade')).toBeTruthy();
  });

  it('tocar em "Mais opções" mostra os tres, e tocar de novo guarda', () => {
    render(<Formulario />);

    fireEvent.press(maisOpcoes());

    for (const campo of OPCIONAIS) {
      expect(screen.getByLabelText(campo)).toBeTruthy();
    }
    expect(screen.getByText('Lembretes')).toBeTruthy();
    expect(maisOpcoes().props.accessibilityState).toMatchObject({ expanded: true });

    fireEvent.press(maisOpcoes());

    expect(screen.queryByLabelText(OPCIONAIS[1])).toBeNull();
  });

  it('guardar os campos nao apaga o que foi digitado neles', () => {
    render(<Formulario />);
    fireEvent.press(maisOpcoes());
    fireEvent.changeText(screen.getByLabelText('Observações (opcional)'), 'Tomar depois do café');

    fireEvent.press(maisOpcoes());
    fireEvent.press(maisOpcoes());

    expect(screen.getByLabelText('Observações (opcional)').props.value).toBe('Tomar depois do café');
  });

  it.each([
    ['uma observacao', { notes: 'Tomar depois do café' }],
    ['um aviso de estoque', { lowStockThreshold: '10' }],
    ['os lembretes desligados', { active: false }],
  ])('ao editar um medicamento com %s, abre ja mostrando', (_caso, valores) => {
    // Escondido, o que a pessoa ja salvou pareceria ter sumido.
    render(<Formulario inicial={{ ...EMPTY_MEDICINE_FORM, ...valores }} />);

    expect(maisOpcoes().props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByLabelText('Observações (opcional)')).toBeTruthy();
  });
});

describe('unidades do estoque', () => {
  it('cobrem as formas que nao sao comprimido', () => {
    render(<Formulario />);

    for (const rotulo of ['Comp.', 'ml', 'Cáps.', 'Doses', 'Unidades']) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
  });

  it('escolher "Unidades" satisfaz a unidade obrigatoria', () => {
    let ultimo: MedicineFormState = EMPTY_MEDICINE_FORM;
    render(<Formulario aoMudar={(form) => (ultimo = form)} />);

    fireEvent.press(screen.getByText('Unidades'));

    expect(ultimo.unit).toBe('UNIT');
    expect(validateMedicineForm(ultimo).unit).toBeUndefined();
  });

  it('o estoque le certo no singular e no plural', () => {
    expect(medicineUnitLabel('DOSE', 1)).toBe('dose');
    expect(medicineUnitLabel('DOSE', 20)).toBe('doses');
    expect(medicineUnitLabel('UNIT', 3)).toBe('un.');
    expect(medicineUnitLabel('COMP', 22)).toBe('comp.');
    expect(medicineUnitLabel('ML', 120)).toBe('ml');
    // "cáps.", com acento, como o botao do formulario ("Cáps."); era "caps.".
    expect(medicineUnitLabel('CAPS', 30)).toBe('cáps.');
  });

  it('sem unidade, ou com uma que o app nao conhece, nao inventa nada', () => {
    expect(medicineUnitLabel(undefined, 3)).toBe('');
    expect(medicineUnitLabel('FRASCO', 3)).toBe('FRASCO');
  });

  it('a lista do app e a mesma do banco', () => {
    // O banco recusa um valor que nao esteja na lista dele. Se alguem
    // acrescentar uma unidade so de um lado, salvar falha em producao.
    const esquema = readFileSync(
      join(__dirname, '..', 'amplify', 'data', 'schemas', 'medicines.ts'),
      'utf8',
    );
    const lista = /unit: a\.enum\(\[([^\]]+)\]\)/.exec(esquema)?.[1] ?? '';
    const noBanco = lista.split(',').map((valor) => valor.trim().replace(/'/g, ''));

    expect(MEDICINE_UNIT_OPTIONS.map((opcao) => opcao.value)).toEqual(noBanco);
  });
});
