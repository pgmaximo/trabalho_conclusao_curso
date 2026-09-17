import { a } from '@aws-amplify/backend';

import { startDocumentExtraction } from '../../functions/start-document-extraction/resource.js';

import { EXTRACTION_STATUS, REVIEW_STATUS } from './extractionEnums.js';

export const medicalDocumentsSchema = {
  MedicalDocument: a
    .model({
      documentType: a.enum(['exam', 'prescription']),
      s3FileName: a.string().required(),
      // Nome original do arquivo enviado pelo usuário — distinto de `s3FileName`
      // (UUID + timestamp usado como chave no S3). Opcional para não quebrar
      // documentos já persistidos antes deste campo existir (GAP_ANALYSIS.md #38).
      originalFileName: a.string(),
      documentName: a.string().required(),
      documentDate: a.date().required(),
      expirationDate: a.date(),

      // ---- Extracao (Bloco 6). TODOS opcionais: documento gravado antes
      // desta EPIC continua valido e aparece como "nunca extraido".
      // a.enum() nao aceita .required() -- o cliente trata nulo como nunca
      // extraido, nao como PENDING.
      extractionStatus: a.enum(EXTRACTION_STATUS),
      extractionStartedAt: a.string(), // ISO -- o cliente detecta travado por aqui
      extractedAt: a.datetime(),
      extractedTextKey: a.string(), // chave no S3 do texto bruto do OCR
      extractionError: a.string(), // so quando FAILED
      extractionWarnings: a.string().array(), // pt-BR, do que nao pode ser lido
      modelId: a.string(),
      inputTokens: a.integer(),
      outputTokens: a.integer(),
      sourceChecksum: a.string(), // base da idempotencia
    })
    .authorization((allow) => [
      // Cada usuário só acessa seus próprios documentos
      allow.owner(),
    ]),

  // Uma linha por analito POR MOMENTO DE COLETA, nunca uma linha por documento
  // com varios valores dentro -- isso impediria consulta por analito, que e o
  // caso de uso inteiro.
  //
  // Diferente de HealthImport, a linha e criada pela LAMBDA, nao pelo cliente.
  // Consequencia direta: a Lambda precisa preencher owner, __typename e
  // createdAt ela mesma, ou o cliente do Amplify nao le a linha (tarefa 10).
  LabResult: a
    .model({
      documentId: a.string().required(),
      analyteCode: a.string().required(), // LOINC, do catalogo gerado
      analyteLabel: a.string().required(), // nome OFICIAL do LOINC -- clausula 10.3
      projectLabel: a.string(), // rotulo em portugues, para a tela
      // Ausente quando a linha nao pode ser lida com seguranca. NUNCA zero,
      // nunca um chute: quem revisa le rawValue, que e o que estava no papel.
      value: a.float(),
      valueQualifier: a.string(), // "<" ou ">" (D21)
      unit: a.string(),
      rawValue: a.string().required(), // exatamente como estava no papel
      rawUnit: a.string(),
      referenceLow: a.float(),
      referenceHigh: a.float(),
      collectedAt: a.date(), // da LINHA (D24)
      collectionMoment: a.string(), // "jejum", "120 minutos" (D22)
      sourcePage: a.integer(),
      confidence: a.float(),
      reviewStatus: a.enum(REVIEW_STATUS),
      correctedAt: a.datetime(), // preenchido quando uma pessoa corrigiu
    })
    // Indice para a EPIC de serie por analito: "todas as minhas coletas deste
    // analito, em ordem de data". Sem ele, a serie faria varredura da tabela.
    // A autorizacao por dono continua valendo sobre o resultado da consulta.
    //
    // Ambiguidade registrada pela regra 8 da constituicao: o indice e global a
    // tabela e o filtro por dono acontece depois da consulta. Para um
    // aplicativo pessoal, com dezenas a poucas centenas de linhas por usuario,
    // isso e adequado. Se a tabela crescer a ponto de a leitura filtrada
    // pesar, a correcao e uma chave composta `owner#analyteCode` -- mudanca de
    // schema, e por isso registrada aqui em vez de descoberta depois.
    .secondaryIndexes((index) => [
      index('analyteCode').sortKeys(['collectedAt']),
      index('documentId'),
    ])
    .authorization((allow) => [allow.owner()]),

  // NAO alimenta o model Medicine e NAO cria lembrete. Criar lembrete de
  // medicamento a partir da leitura automatica de um papel e acao de risco
  // alto que esta EPIC nao toma (spec secao 5).
  PrescriptionItem: a
    .model({
      documentId: a.string().required(),
      medicationLabel: a.string().required(),
      dose: a.string(),
      unit: a.string(),
      frequency: a.string(),
      duration: a.string(),
      rawText: a.string(),
      confidence: a.float(),
      reviewStatus: a.enum(REVIEW_STATUS),
    })
    .secondaryIndexes((index) => [index('documentId')])
    .authorization((allow) => [allow.owner()]),

  StartDocumentExtractionResult: a.customType({
    documentId: a.string().required(),
    status: a.string().required(),
  }),

  // a.mutation(), nao a.query(): muda estado (PENDING -> PROCESSING) e dispara
  // efeito colateral (invocar a Lambda). Mesma justificativa que
  // startHealthAnalysis registra.
  startDocumentExtraction: a
    .mutation()
    .arguments({ documentId: a.string().required() })
    .returns(a.ref('StartDocumentExtractionResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(startDocumentExtraction)),
};
