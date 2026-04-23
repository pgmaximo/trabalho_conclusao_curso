import React from 'react';
import { render } from '@testing-library/react-native';

import { ExamsScreen } from '@/screens/ExamsScreen';

describe('ExamsScreen', () => {
  it('mostra estado vazio quando nenhum documento atende ao filtro', () => {
    const { getByText } = render(
      <ExamsScreen
        filterOptions={['Todos', 'Exames', 'Receitas', 'Laudos']}
        searchQuery=""
        activeFilter="Todos"
        documents={[]}
        isLoading={false}
        errorMessage={null}
        onRetry={() => {}}
        onSearchChange={() => {}}
        onFilterChange={() => {}}
      />
    );

    expect(getByText('Nenhum documento encontrado')).toBeTruthy();
    expect(getByText('Ajuste os filtros ou a busca para encontrar outro item.')).toBeTruthy();
  });
});
