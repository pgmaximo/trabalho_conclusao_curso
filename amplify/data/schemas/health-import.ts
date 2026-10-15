import { a } from '@aws-amplify/backend';
import { startHealthAnalysis } from '../../functions/start-health-analysis/resource.js';
import { HEALTH_IMPORT_SOURCE_HINT, HEALTH_IMPORT_STATUS } from './healthImportEnums.js';

export const healthImportSchema = {
  // Uma linha por lote de arquivos importado (Samsung Health / Apple Health).
  // O cliente cria a linha (para o resolver de create do AppSync preencher
  // owner/__typename/createdAt corretamente) e a Lambda analyze-health-import
  // atualiza status/metricsJson/insightsJson escrevendo DIRETO no DynamoDB via
  // UpdateCommand — nunca PutCommand, para nao apagar owner/id/__typename/
  // createdAt (ver amplify/functions/analyze-health-import/importRepository.ts).
  HealthImport: a
    .model({
      status: a.enum(HEALTH_IMPORT_STATUS), // a.enum nao aceita .required() — tratar null como PENDING no cliente
      sourceHint: a.enum(HEALTH_IMPORT_SOURCE_HINT),
      fileKeys: a.string().required().array(), // chaves S3 completas em health-imports/{identityId}/{importId}/...
      fileNames: a.string().required().array(), // nomes originais, so para exibicao na UI
      periodStart: a.date(), // YYYY-MM-DD — preenchido pela Lambda apos o parsing
      periodEnd: a.date(),
      dayCount: a.integer(),
      // JSON.stringify/JSON.parse manual (nao a.json()/AWSJSON): nao ha
      // precedente no repo de leitura pelo client de um campo AWSJSON escrito
      // direto como Map do DynamoDB por uma Lambda (VaccinationCampaignCache
      // usa a.json() mas seu proprio comentario diz que nunca e lido pelo
      // client Amplify Data) — string elimina essa ambiguidade.
      metricsJson: a.string(), // AnalysisSummary serializado (ver summaryBuilder.ts)
      insightsJson: a.string(), // saida validada do Bedrock (ver insightSchema.ts)
      resultArtifactKey: a.string(), // chave do result.json (serie diaria completa) no S3
      warnings: a.string().array(), // avisos em pt-BR do que nao pode ser lido/usado
      errorMessage: a.string(), // preenchido so quando status = FAILED
      startedAt: a.string(), // ISO — usado pelo cliente para detectar PROCESSING travado (>6min)
      analyzedAt: a.datetime(),
      modelId: a.string(),
      inputTokens: a.integer(),
      outputTokens: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  StartHealthAnalysisResult: a.customType({
    importId: a.string().required(),
    status: a.string().required(),
  }),

  // Primeira mutation deste repo (as demais operacoes customizadas sao
  // a.query()) — deliberado: esta operacao muda estado (PENDING -> PROCESSING)
  // e dispara um efeito colateral (invocar analyze-health-import), o que e
  // exatamente o que a.mutation() sinaliza e a.query() nao deveria.
  startHealthAnalysis: a
    .mutation()
    .arguments({ importId: a.string().required() })
    .returns(a.ref('StartHealthAnalysisResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(startHealthAnalysis)),
};
