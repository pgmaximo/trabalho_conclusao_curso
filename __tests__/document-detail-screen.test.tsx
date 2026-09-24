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

import { ANALYTE_CATALOG } from '../amplify/functions/extract-document-data/analyteCatalog';
import { checkLanguageRules } from '../amplify/functions/ai-language-rules/languageRules';
import { COPY_DA_FALHA } from '../amplify/functions/extract-document-data/motivoDeFalha';
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

// D27: nenhum codigo LOINC e digitado a mao, nem como exemplo em teste, e
// comentario dizendo "vem do extrato oficial" nao e verificacao -- um literal
// errado e o comentario ao lado dele erram juntos. O codigo sai do catalogo
// gerado a partir do extrato, buscado pelo rotulo em portugues, que e campo
// nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const HEMOGLOBINA = doCatalogo('Hemoglobina');

const hemoglobina: LabResultView = {
  id: 'linha-1',
  analyteCode: HEMOGLOBINA.code,
  projectLabel: HEMOGLOBINA.projectLabel,
  analyteLabel: HEMOGLOBINA.label,
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

// TSH abaixo do limite de deteccao e o caso classico da D21: o laboratorio
// nao mediu 0,01 -- ele disse que o valor esta ABAIXO de 0,01.
const tshAbaixoDoLimite: LabResultView = {
  id: 'linha-4',
  analyteCode: doCatalogo('TSH').code,
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

function renderScreen(
  extracaoProp: UseDocumentExtractionResult,
  doc: typeof documento = documento,
) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <DocumentDetailScreen document={doc} extraction={extracaoProp} />
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

  // G4 (Bloco 10): a tela mostrava sempre a mesma frase e nunca lia o motivo.
  it('falha com motivo da lista fechada MOSTRA o motivo, que diz o que fazer', () => {
    renderScreen(extracao({ status: 'FAILED', errorMessage: COPY_DA_FALHA['grande-demais'] }));
    expect(screen.getByText(COPY_DA_FALHA['grande-demais'])).toBeTruthy();
    // A frase generica sai: duas explicacoes para a mesma falha confundem.
    expect(screen.queryByText(/Não conseguimos ler o conteúdo deste documento/)).toBeNull();
    expect(screen.getByText(/tentar de novo/i)).toBeTruthy();
  });

  it('falha com texto TECNICO gravado antes do Bloco 10 continua escondida', () => {
    // Documentos que falharam antes da lista fechada podem ter o erro do SDK
    // gravado no campo. Ele nao aparece; a frase generica aparece.
    renderScreen(
      extracao({ status: 'FAILED', errorMessage: 'ValidationException: Input is too long' }),
    );
    expect(screen.queryByText(/ValidationException/)).toBeNull();
    expect(screen.getByText(/Não conseguimos ler o conteúdo deste documento/)).toBeTruthy();
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

describe('DocumentDetailScreen — a unidade que a pessoa le (Bloco 10)', () => {
  it('mostra "mil/µL", e nao o token interno "10*3/uL"', () => {
    const LEUCOCITOS = doCatalogo('Leucocitos');
    renderScreen(
      extracao({
        status: 'SUCCEEDED',
        results: [
          {
            ...hemoglobina,
            id: 'linha-leuco',
            analyteCode: LEUCOCITOS.code,
            projectLabel: LEUCOCITOS.projectLabel,
            analyteLabel: LEUCOCITOS.label,
            value: 5.5,
            unit: '10*3/uL',
            rawValue: '5.500',
            rawUnit: '/mm³',
            referenceLow: 3.5,
            referenceHigh: 10.5,
          },
        ],
      }),
    );
    expect(screen.queryByText(/10\*3\/uL/)).toBeNull();
    expect(screen.getAllByText(/mil\/µL/).length).toBeGreaterThan(0);
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

  it('mostra a faixa em TEXTO quando o laudo a escreveu em tabela (F1)', () => {
    // Medido em 2026-09-19: o perfil lipidico inteiro e a vitamina D entraram
    // sem faixa, porque o laudo as apresenta em tabela. O valor aparecia
    // sozinho na tela justamente nos exames em que a faixa e a informacao que
    // a pessoa procura.
    renderScreen(
      extracao({
        status: 'SUCCEEDED',
        results: [
          {
            ...hemoglobina,
            referenceLow: null,
            referenceHigh: null,
            rawReferenceText: 'Desejável: menor que 100 mg/dL; Limítrofe: 100 a 129 mg/dL',
          },
        ],
      }),
    );
    expect(screen.getByText(/Desejável: menor que 100 mg\/dL/)).toBeTruthy();
  });

  it('carrega o encaminhamento a um profissional de saude', () => {
    // Requisito de interface da regra 4, em toda tela que mostra numero de
    // exame. Verificado pela R2 do modulo de regras de linguagem, e nao por
    // uma frase exata -- exigir a frase exata viraria rodape mecanico.
    // `temOrigem` e verdadeiro pelo mesmo motivo da tela de serie: o numero aqui
    // vem do documento registrado, que esta na tela junto com ele.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [hemoglobina] }));
    const texto = JSON.stringify(screen.toJSON());
    expect(checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true })).toEqual({
      ok: true,
    });
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
    //
    // A unidade esperada mudou no Bloco 10: este caso fixava, de carona, o
    // token interno "u[IU]/mL" na tela -- que era justamente o defeito. A
    // intencao do teste (o sinal colado no valor) continua a mesma.
    renderScreen(extracao({ status: 'SUCCEEDED', results: [tshAbaixoDoLimite] }));
    expect(screen.getByText('<0,01 µUI/mL')).toBeTruthy();
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


/**
 * Decisao B2 do Bloco 9 -- a divergencia de data deixa de ser invisivel.
 *
 * O caso real: um laudo coletado em 04/10/2025 entrou como 18/09/2026, porque
 * o formulario vem preenchido com hoje. A tela nao dizia nada, e o assistente
 * acabou dizendo as duas datas em turnos diferentes.
 */
describe('DocumentDetailScreen — a data do formulario e a do laudo (B2)', () => {
  const GUARDADO_COM_HOJE = { ...documento, documentDate: '2026-09-18' };

  it('avisa quando a data guardada difere da coleta lida do laudo', () => {
    renderScreen(
      extracao({ status: 'SUCCEEDED', results: [{ ...hemoglobina, collectedAt: '2025-10-04' }] }),
      GUARDADO_COM_HOJE,
    );

    // A frase inteira, e nao so as datas: "18/09/2026" tambem aparece no
    // cartao de resumo, e uma assercao por data nao distinguiria o aviso do
    // que a tela ja mostrava.
    expect(
      screen.getByText('O laudo indica coleta em 04/10/2025, e este documento está guardado com a data 18/09/2026.'),
    ).toBeTruthy();
  });

  it('sem divergencia, nenhum aviso -- o silencio e o caso comum', () => {
    renderScreen(
      extracao({ status: 'SUCCEEDED', results: [{ ...hemoglobina, collectedAt: '2025-10-04' }] }),
    );

    expect(screen.queryByText(/está guardado com a data/i)).toBeNull();
  });

  it('o aviso NAO corrige nada sozinho: a data do documento continua a digitada', () => {
    // A extracao nao escreve no que a pessoa digitou (D24). O aviso informa.
    renderScreen(
      extracao({ status: 'SUCCEEDED', results: [{ ...hemoglobina, collectedAt: '2025-10-04' }] }),
      GUARDADO_COM_HOJE,
    );

    // O cartao de resumo continua mostrando a data digitada, E o aviso existe.
    // Se a tela "consertasse" o campo sozinha, o resumo mostraria 04/10/2025.
    expect(screen.getAllByText(/18\/09\/2026/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/04\/10\/2025/)).toBeTruthy();
  });
});
