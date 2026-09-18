// Mocks antes do import da tela: ela importa examService, que monta o cliente
// do Amplify no carregamento do modulo.
jest.mock('aws-amplify/data', () => ({ generateClient: () => ({ models: {}, mutations: {} }) }));
jest.mock('aws-amplify/storage', () => ({ remove: jest.fn(), getUrl: jest.fn() }));
jest.mock('@/services/auth', () => ({ getUserId: jest.fn() }));
jest.mock('@/services/upload', () => ({ uploadFileToS3: jest.fn() }));
jest.mock('@/hooks/useExamsData', () => ({ invalidateExamsCache: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'uuid-fixo' }));
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() } }));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { checkLanguageRules } from '../amplify/functions/ai-language-rules/languageRules';
import { CLASSE_LINHA_PENDENTE } from '@/components/ExtractedResultRow';
import { DocumentDetailScreen } from '@/screens/DocumentDetailScreen';
import type { ExtractionState, LabResultView } from '@/services/extractionService';
import type { UseDocumentExtractionResult } from '@/hooks/useDocumentExtraction';

const documento = {
  id: 'doc-1',
  fileId: '',
  s3FileName: 'exams/arquivo.pdf',
  originalFileName: 'hemograma.pdf',
  userId: '',
  documentType: 'exam' as const,
  documentName: 'Hemograma completo',
  documentDate: '2025-10-04',
  expirationDate: undefined,
  fileSize: 0,
  createdAt: '',
};

// 718-7 = "Hemoglobin [Mass/volume] in Blood". Conferido no catalogo gerado a
// partir do extrato oficial do LOINC, nao digitado de memoria.
const hemoglobina: LabResultView = {
  id: 'linha-1',
  analyteCode: '718-7',
  projectLabel: 'Hemoglobina',
  analyteLabel: 'Hemoglobin [Mass/volume] in Blood',
  value: 16.1,
  valueQualifier: null,
  unit: 'g/dL',
  rawValue: '16,1',
  rawUnit: 'g/dL',
  referenceLow: 13,
  referenceHigh: 17.5,
  collectedAt: '2025-10-04',
  collectionMoment: null,
  sourcePage: 1,
  reviewStatus: 'AUTO',
};

// 3016-3 = "Thyrotropin [Units/volume] in Serum or Plasma", com a unidade
// canonica que o catalogo define para ele. Conferido em analyteCatalog.ts.
// TSH abaixo do limite de deteccao e o caso classico da D21: o laboratorio
// nao mediu 0,01 -- ele disse que o valor esta ABAIXO de 0,01.
const tshAbaixoDoLimite: LabResultView = {
  id: 'linha-4',
  analyteCode: '3016-3',
  projectLabel: 'TSH',
  analyteLabel: 'Thyrotropin [Units/volume] in Serum or Plasma',
  value: 0.01,
  valueQualifier: '<',
  unit: 'u[IU]/mL',
  rawValue: '<0,01',
  rawUnit: 'µUI/mL',
  referenceLow: 0.4,
  referenceHigh: 4.5,
  collectedAt: '2025-10-04',
  collectionMoment: null,
  sourcePage: 2,
  reviewStatus: 'AUTO',
};

function extracao(overrides: Partial<ExtractionState> = {}): UseDocumentExtractionResult {
  return {
    state: {
      status: 'SUCCEEDED',
      startedAt: null,
      errorMessage: null,
      warnings: [],
      results: [],
      ...overrides,
    },
    isLoading: false,
    isTimedOut: false,
    errorMessage: null,
    isRetrying: false,
    retry: jest.fn(),
    refresh: jest.fn(),
    confirm: jest.fn(),
  };
}

function renderScreen(extracaoProp: UseDocumentExtractionResult) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <DocumentDetailScreen document={documento} extraction={extracaoProp} />
    </SafeAreaProvider>,
  );
}

describe('DocumentDetailScreen — os cinco estados da leitura', () => {
  it('mostra progresso enquanto processa', () => {
    renderScreen(extracao({ status: 'PROCESSING' }));
    expect(screen.getByText(/lendo o documento/i)).toBeTruthy();
  });

  it('mostra as linhas quando concluiu', () => {
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    expect(screen.getByText('Hemoglobina')).toBeTruthy();
    expect(screen.getByText(/16,1/)).toBeTruthy();
  });

  it('sem linhas NAO e erro', () => {
    // Laudo descritivo, cultura e sorologia nao rendem analito. Tratar isso
    // como falha ensinaria a pessoa a desconfiar de um documento intacto.
    renderScreen(extracao({ status: 'NO_RESULTS' }));
    expect(screen.getByText(/não tem valores acompanháveis/i)).toBeTruthy();
    expect(screen.queryByText(/erro/i)).toBeNull();
  });

  it('falha oferece tentar de novo e mantem o documento acessivel', () => {
    renderScreen(extracao({ status: 'FAILED', errorMessage: 'Não foi possível ler.' }));
    expect(screen.getByText(/tentar de novo/i)).toBeTruthy();
    expect(screen.getByText(/continua guardado/i)).toBeTruthy();
  });

  it('nunca extraido e um estado proprio, e nao uma falha', () => {
    // Todo documento gravado antes desta EPIC cai aqui. Se ele aparecesse
    // como "sem resultado" ou como erro, a tela mentiria sobre 7 documentos
    // que estao intactos no banco.
    renderScreen(extracao({ status: 'NUNCA_EXTRAIDO' }));
    expect(screen.getByText(/antes da leitura automática existir/i)).toBeTruthy();
    expect(screen.getByText(/ler agora/i)).toBeTruthy();
  });
});

describe('DocumentDetailScreen — o que a tela pode e nao pode dizer', () => {
  it('poe o valor ao lado da faixa do laboratorio, sem dizer o que ela significa', () => {
    // A distincao que sustenta a tela inteira: mostrar os dois numeros lado a
    // lado e apresentacao do que estava no papel; dizer qual deles e "bom" e
    // interpretacao clinica, que a regra 4 proibe.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    expect(screen.getByText(/13 a 17,5/)).toBeTruthy();
  });

  it('carrega o encaminhamento a um profissional de saude', () => {
    // Requisito de interface da regra 4, em toda tela que mostra numero de
    // exame. Verificado pela R2 do modulo de regras de linguagem, e nao por
    // uma frase exata -- exigir a frase exata viraria rodape mecanico.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    const texto = JSON.stringify(screen.toJSON());
    expect(checkLanguageRules(texto, { questionKind: 'clinica' })).toEqual({ ok: true });
  });

  it('nenhuma copy classifica o resultado', () => {
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    const texto = JSON.stringify(screen.toJSON()).toLowerCase();
    expect(texto).not.toMatch(/alterado|preocupante|dentro do esperado|fora do esperado/);
  });

  it('o sinal de um limite fica colado no valor, e nao e engolido', () => {
    // `<0,01` exibido como `0,01` afirma uma medida que o laboratorio
    // declarou NAO ter feito (D21). O sinal nao e enfeite tipografico: e a
    // diferenca entre um numero e um limite.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [tshAbaixoDoLimite] }));
    expect(screen.getByText('<0,01 u[IU]/mL')).toBeTruthy();
  });

  it('explica que um limite nao entra na comparacao entre coletas', () => {
    // Frase de FATO sobre a leitura, e nao sobre a pessoa: diz o que o
    // laboratorio informou e o que o aplicativo faz com isso.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [tshAbaixoDoLimite] }));
    expect(screen.getByText(/limite, não como uma medida/i)).toBeTruthy();
  });

  it('linha pendente usa o token de AVISO, nunca o de erro', () => {
    // Pintar de vermelho uma leitura duvidosa ensina a pessoa a ignorar o
    // aviso, e nao e uma afirmacao sobre a saude dela -- e sobre a nossa
    // confianca na leitura.
    expect(CLASSE_LINHA_PENDENTE).toContain('warning');
    expect(CLASSE_LINHA_PENDENTE).not.toContain('danger');
  });

  it('linha pendente mostra o que estava no papel e oferece confirmar', () => {
    const pendente = { ...hemoglobina, reviewStatus: 'PENDENTE_DE_REVISAO' as const };
    renderScreen(extracao({ status: 'SUCCEEDED', results: [pendente] }));
    // Aparece duas vezes de proposito: o valor lido, no alto, e o que estava
    // escrito no papel, embaixo. Sem o segundo a pessoa nao tem o que conferir.
    expect(screen.getAllByText(/16,1/).length).toBeGreaterThanOrEqual(2);
    // Pelo rotulo de acessibilidade, e nao pelo texto: "confirmar" tambem
    // aparece na frase que pede para conferir no documento.
    expect(screen.getByLabelText(/confirmar a leitura de hemoglobina/i)).toBeTruthy();
    expect(screen.getByLabelText(/corrigir a leitura de hemoglobina/i)).toBeTruthy();
  });

  it('o botao corrigir abre o painel de correcao naquela linha', () => {
    const pendente = { ...hemoglobina, reviewStatus: 'PENDENTE_DE_REVISAO' as const };
    renderScreen(extracao({ status: 'SUCCEEDED', results: [pendente] }));

    fireEvent.press(screen.getByLabelText(/corrigir a leitura de hemoglobina/i));

    expect(screen.getByText(/salvar correção/i)).toBeTruthy();
    // Os botoes da linha somem enquanto o painel esta aberto: duas maneiras de
    // resolver a mesma linha na tela ao mesmo tempo confundem.
    expect(screen.queryByLabelText(/confirmar a leitura de hemoglobina/i)).toBeNull();
  });
});

describe('DocumentDetailScreen — o que veio da tela de referencia', () => {
  it('mostra quantos valores foram lidos', () => {
    // Contagem visivel: a cobertura do modelo e instavel (47, 47, 42, 47 em
    // quatro execucoes iguais), e sem contagem uma omissao nao deixa rastro.
    const outro = { ...hemoglobina, id: 'linha-2', projectLabel: 'Hematócrito' };
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina, outro] }));
    expect(screen.getByText(/2 valores/i)).toBeTruthy();
  });

  it('agrupa por exame, e nao por uma lista corrida de analitos', () => {
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    expect(screen.getByText('Hemograma')).toBeTruthy();
  });

  it('diz que o analito de codigo local nao compara entre laboratorios (D32)', () => {
    const zinco: LabResultView = {
      ...hemoglobina,
      id: 'linha-3',
      analyteCode: 'X-ZINCO-SANGUINEO',
      projectLabel: 'Zinco Sanguíneo',
      analyteLabel: 'Zinco Sanguíneo',
      unit: 'ug/dL',
      rawUnit: 'µg/dL',
    };
    renderScreen(extracao({ status: 'SUCCEEDED', results: [zinco] }));
    expect(screen.getByText('Zinco Sanguíneo')).toBeTruthy();
    expect(screen.getByText(/não conseguimos comparar com outros laboratórios/i)).toBeTruthy();
  });

  it('mostra os avisos da leitura, para o papel nunca ter mais do que a tela', () => {
    renderScreen(
      extracao({
        status: 'SUCCEEDED',
        results: [hemoglobina],
        warnings: ['A data de coleta não estava legível no documento.'],
      }),
    );
    expect(screen.getByText(/não estava legível/i)).toBeTruthy();
  });
});
