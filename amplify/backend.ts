import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Stack } from 'aws-cdk-lib';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { getPreventionRecommendations } from './functions/get-prevention-recommendations/resource.js';
import { getVaccinationCampaigns } from './functions/get-vaccination-campaigns/resource.js';
import { getVaccinationSites } from './functions/get-vaccination-sites/resource.js';
import { startHealthAnalysis } from './functions/start-health-analysis/resource.js';
import { analyzeHealthImport } from './functions/analyze-health-import/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  getPreventionRecommendations,
  getVaccinationCampaigns,
  getVaccinationSites,
  startHealthAnalysis,
  analyzeHealthImport,
});

backend.auth.resources.cfnResources.cfnUserPoolClient.addPropertyOverride('ExplicitAuthFlows', [
  'ALLOW_USER_SRP_AUTH',
  'ALLOW_USER_PASSWORD_AUTH',
  'ALLOW_REFRESH_TOKEN_AUTH',
]);

// A funcao le o UserProfile do dono diretamente via DynamoDB, pois a role de
// execucao da Lambda nao carrega o claim "owner" do usuario final para
// reusar o client do Amplify Data com o mesmo escopo.
const userProfileTable = backend.data.resources.tables['UserProfile'];
const getPreventionRecommendationsLambda = backend.getPreventionRecommendations.resources.lambda;

userProfileTable.grantReadData(getPreventionRecommendationsLambda);
backend.getPreventionRecommendations.addEnvironment(
  'USER_PROFILE_TABLE_NAME',
  userProfileTable.tableName,
);

// As duas funcoes de Vacinacao (campanhas do PNI e unidades do CNES) leem e
// escrevem sua propria tabela de cache diretamente via SDK do DynamoDB — mesmo
// padrao de acesso direto usado acima para UserProfile, pois a role de
// execucao da Lambda nao carrega o claim "owner" do usuario final.
const campaignCacheTable = backend.data.resources.tables['VaccinationCampaignCache'];
const getVaccinationCampaignsLambda = backend.getVaccinationCampaigns.resources.lambda;

campaignCacheTable.grantReadWriteData(getVaccinationCampaignsLambda);
backend.getVaccinationCampaigns.addEnvironment('CAMPAIGN_CACHE_TABLE_NAME', campaignCacheTable.tableName);

const siteCacheTable = backend.data.resources.tables['VaccinationSiteCache'];
const getVaccinationSitesLambda = backend.getVaccinationSites.resources.lambda;

siteCacheTable.grantReadWriteData(getVaccinationSitesLambda);
backend.getVaccinationSites.addEnvironment('SITE_CACHE_TABLE_NAME', siteCacheTable.tableName);

// ---------------------------------------------------------------------------
// Importacao de dados de wearables (Samsung Health / Apple Health) + analise
// por Amazon Bedrock. Ver docs/superpowers/plans/2026-09-09-importacao-
// wearables-bedrock.md para o desenho completo.
// ---------------------------------------------------------------------------

const healthImportTable = backend.data.resources.tables['HealthImport'];
const startHealthAnalysisLambda = backend.startHealthAnalysis.resources.lambda;
const analyzeHealthImportLambda = backend.analyzeHealthImport.resources.lambda;

healthImportTable.grantReadWriteData(startHealthAnalysisLambda);
healthImportTable.grantReadWriteData(analyzeHealthImportLambda);
backend.startHealthAnalysis.addEnvironment('HEALTH_IMPORT_TABLE_NAME', healthImportTable.tableName);
backend.analyzeHealthImport.addEnvironment('HEALTH_IMPORT_TABLE_NAME', healthImportTable.tableName);

// start-health-analysis so dispara a analyze-health-import (invocacao
// assincrona, fire-and-forget) e retorna — nunca espera o resultado, porque o
// resolver do AppSync tem teto de 30s e a analise leva de 30s a poucos
// minutos (ver handler.ts de ambas).
analyzeHealthImportLambda.grantInvoke(startHealthAnalysisLambda);
backend.startHealthAnalysis.addEnvironment('ANALYZE_FUNCTION_NAME', analyzeHealthImportLambda.functionName);

// O invoke assincrono tenta de novo ate 2x por padrao em caso de excecao nao
// tratada. A propria Lambda ja nunca lanca (handler.ts sempre resolve, com
// try/catch cobrindo o corpo inteiro e markFailed no catch), mas zerar o
// retry aqui e a segunda camada de defesa contra pagar o Bedrock em dobro ou
// triplo por uma unica importacao caso essa garantia falhe por algum motivo
// nao previsto (ex.: a propria Lambda ser encerrada por timeout/OOM antes
// de terminar o try/catch).
analyzeHealthImportLambda.configureAsyncInvoke({ retryAttempts: 0 });

// Apenas a analyze-health-import le os arquivos brutos que o app sobe para
// health-imports/{entity_id}/* — grantReadWrite (nao so read) porque a mesma
// funcao tambem grava o artefato de depuracao result.json de volta no bucket.
backend.storage.resources.bucket.grantReadWrite(analyzeHealthImportLambda, 'health-imports/*');
backend.analyzeHealthImport.addEnvironment('HEALTH_BUCKET_NAME', backend.storage.resources.bucket.bucketName);

// Modelo escolhido em vez de Opus 5: toolChoice forcado (usado para obrigar a
// saida em JSON) e incompativel com extended thinking nos modelos Anthropic
// (erro 400), e o Opus 5 liga thinking por padrao. O Sonnet 4.6 nao liga, e a
// tarefa (sumarizar estatisticas ja pre-computadas) nao exige raciocinio
// profundo — ver plan.md secao 4.
const BEDROCK_MODEL_ID = 'anthropic.claude-sonnet-4-6';
const bedrockRegion = Stack.of(analyzeHealthImportLambda).region;
const bedrockAccount = Stack.of(analyzeHealthImportLambda).account;

// Guardrail criado via IaC (nao no console) para ficar versionado e
// reproduzivel — primeiro uso de aws-cdk-lib/aws-bedrock neste repo.
const guardrailStack = backend.createStack('health-insights-guardrail');

const healthInsightsGuardrail = new bedrock.CfnGuardrail(guardrailStack, 'HealthInsightsGuardrail', {
  name: 'health-insights-guardrail',
  description:
    'Guardrail da analise de dados de wearables: bloqueia diagnostico definitivo e prescricao, filtra ataques de prompt e anonimiza PII.',
  blockedInputMessaging:
    'Nao foi possivel processar esta solicitacao por questoes de seguranca de conteudo.',
  blockedOutputsMessaging:
    'A resposta gerada foi bloqueada por questoes de seguranca de conteudo. Tente novamente ou consulte um profissional de saude.',
  topicPolicyConfig: {
    topicsConfig: [
      {
        name: 'diagnostico-medico-definitivo',
        definition:
          'Afirmar de forma definitiva que o usuario tem, nao tem, ou provavelmente tem uma doenca ou condicao medica especifica, como se fosse um diagnostico clinico.',
        examples: [
          'Voce tem apneia do sono.',
          'Seus dados mostram que voce esta com arritmia cardiaca.',
          'Isso e um sinal claro de diabetes.',
        ],
        type: 'DENY',
        inputAction: 'BLOCK',
        outputAction: 'BLOCK',
        inputEnabled: true,
        outputEnabled: true,
      },
      {
        name: 'prescricao-de-medicamento',
        definition:
          'Recomendar um medicamento especifico, uma dose, ou uma mudanca em uma prescricao medica existente.',
        examples: [
          'Tome 500mg de paracetamol antes de dormir.',
          'Voce deveria aumentar a dose do seu remedio para pressao.',
          'Pare de tomar esse medicamento.',
        ],
        type: 'DENY',
        inputAction: 'BLOCK',
        outputAction: 'BLOCK',
        inputEnabled: true,
        outputEnabled: true,
      },
    ],
  },
  contentPolicyConfig: {
    filtersConfig: [
      { type: 'HATE', inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
      { type: 'INSULTS', inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
      { type: 'SEXUAL', inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
      { type: 'VIOLENCE', inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
      { type: 'MISCONDUCT', inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
      // PROMPT_ATTACK so se aplica ao INPUT (o bloco de dados agregados
      // envolvido em guardContent, ver bedrockClient.ts) — outputStrength e
      // obrigatorio no schema do CFN mesmo assim, por isso NONE.
      { type: 'PROMPT_ATTACK', inputStrength: 'HIGH', outputStrength: 'NONE' },
    ],
  },
  sensitiveInformationPolicyConfig: {
    piiEntitiesConfig: [
      { type: 'NAME', action: 'ANONYMIZE' },
      { type: 'EMAIL', action: 'ANONYMIZE' },
      { type: 'PHONE', action: 'ANONYMIZE' },
    ],
    regexesConfig: [
      {
        name: 'cpf',
        description: 'CPF brasileiro (com ou sem pontuacao)',
        pattern: '\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b',
        action: 'ANONYMIZE',
      },
    ],
  },
});

// Versao numerada e fixa (nunca DRAFT) — DRAFT e mutavel e pode mudar de
// comportamento sem aviso; a Lambda referencia sempre esta versao especifica.
const healthInsightsGuardrailVersion = new bedrock.CfnGuardrailVersion(
  guardrailStack,
  'HealthInsightsGuardrailVersion',
  { guardrailIdentifier: healthInsightsGuardrail.attrGuardrailId },
);

backend.analyzeHealthImport.addEnvironment('BEDROCK_MODEL_ID', BEDROCK_MODEL_ID);
backend.analyzeHealthImport.addEnvironment('BEDROCK_GUARDRAIL_ID', healthInsightsGuardrail.attrGuardrailId);
backend.analyzeHealthImport.addEnvironment('BEDROCK_GUARDRAIL_VERSION', healthInsightsGuardrailVersion.attrVersion);

// As duas ARNs (perfil de inferencia + foundation-model com regiao curinga)
// sao obrigatorias: com prefixo "us." a chamada pode ser roteada para
// qualquer regiao do perfil, e faltar a segunda ARN produz
// AccessDeniedException intermitente (so quando a chamada e roteada para uma
// regiao diferente da conta) — ver plan.md secao 2.5.
analyzeHealthImportLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:${bedrockRegion}:${bedrockAccount}:inference-profile/us.${BEDROCK_MODEL_ID}`,
      `arn:aws:bedrock:*::foundation-model/${BEDROCK_MODEL_ID}`,
    ],
  }),
);

analyzeHealthImportLambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['bedrock:ApplyGuardrail'],
    resources: [healthInsightsGuardrail.attrGuardrailArn],
  }),
);
