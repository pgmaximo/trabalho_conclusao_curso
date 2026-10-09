import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DrugInteractionSheet } from '@/components/DrugInteractionSheet';
import { MedicinesScreen } from '@/screens/MedicinesScreen';

// O aviso de interacao medicamentosa da tela Remédios usava o emoji de alerta
// como icone. Emoji e desenhado por cada fabricante de celular do seu jeito,
// nao segue o tema e tinha o mesmo triangulo amarelo para uma interacao grave e
// para uma leve. Agora o aviso usa um icone do app, da cor do aviso, e o desenho
// muda com a gravidade, como nos selos de status
// (specs/00-fundacao/correcoes-menores/spec.md, D5).

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

function interacao(id: string, severity: 'danger' | 'warning', a: string, b: string) {
  return {
    pair: { id },
    severity,
    medicineA: { id: `${id}-a`, name: a },
    medicineB: { id: `${id}-b`, name: b },
    riskPt: `Risco de ${a} com ${b}.`,
    mechanismPt: 'Mecanismo.',
  };
}

const GRAVE = interacao('p1', 'danger', 'Varfarina', 'AAS');
const LEVE = interacao('p2', 'warning', 'Losartana', 'Ibuprofeno');

function renderRemedios(interactions: unknown[]) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 24, left: 0, right: 0, top: 44 },
      }}
    >
      <MedicinesScreen
        errorMessage={null}
        hasMedicines
        interactions={interactions as never}
        isLoading={false}
        medicines={[]}
        onRetry={jest.fn()}
        onToggleMedicineStatus={jest.fn()}
        pendingCount={0}
        stocks={[]}
      />
    </SafeAreaProvider>,
  );
}

describe('aviso de interacao em Remédios', () => {
  it('nao usa emoji', () => {
    renderRemedios([GRAVE]);

    expect(screen.getByText('Varfarina + AAS')).toBeTruthy();
    expect(screen.queryByText(/⚠/)).toBeNull();
  });

  it('a interacao grave leva o triangulo, e a leve a exclamacao', () => {
    renderRemedios([GRAVE]);
    expect(screen.getByText('warning')).toBeTruthy();
    expect(screen.queryByText('alert-circle')).toBeNull();

    renderRemedios([LEVE]);
    expect(screen.getByText('alert-circle')).toBeTruthy();
  });
});

describe('aviso de interacao ao salvar um medicamento', () => {
  it('usa os mesmos icones da tela Remédios, para o mesmo aviso', () => {
    render(<DrugInteractionSheet matches={[GRAVE, LEVE] as never} onClose={jest.fn()} visible />);

    expect(screen.getByText('warning')).toBeTruthy();
    expect(screen.getByText('alert-circle')).toBeTruthy();
  });
});

describe('icones do app', () => {
  const raiz = join(__dirname, '..', 'src');

  function arquivos(pasta: string): { nome: string; texto: string }[] {
    return readdirSync(join(raiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
      const caminho = join(pasta, entrada.name);
      if (entrada.isDirectory()) return arquivos(caminho);
      if (!/\.tsx?$/.test(entrada.name)) return [];
      return [{ nome: caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }];
    });
  }

  function semComentarios(texto: string): string {
    return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  }

  it('nenhuma tela ou componente usa emoji como icone', () => {
    // Um pictograma, ou qualquer caractere com o seletor de emoji (U+FE0F). O
    // "✓" de texto do aviso de sucesso nao e emoji e nao entra.
    const emoji = /[\u{1F300}-\u{1FAFF}]|️/u;

    const infratores = [...arquivos('screens'), ...arquivos('components')]
      .filter(({ texto }) => emoji.test(semComentarios(texto)))
      .map(({ nome }) => nome);

    expect(infratores).toEqual([]);
  });
});
